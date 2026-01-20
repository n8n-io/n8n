import { Logger } from '@n8n/backend-common';
import {
	DataSource,
	WorkflowEntity,
	WorkflowHistory,
	WorkflowPublicationOutbox,
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { Workflow } from 'n8n-workflow';
import ReadWriteLock from 'rwlock';

import { ActiveWorkflowManager } from '@/active-workflow-manager';
import { NodeTypes } from '@/node-types';
import * as WorkflowExecuteAdditionalData from '@/workflow-execute-additional-data';

interface TriggerDiff {
	added: INode[];
	removed: INode[];
	unchanged: INode[];
	modified: INode[];
}

/**
 * Service responsible for consuming workflow publication outbox messages
 * and updating active triggers/pollers accordingly.
 */
@Service()
export class WorkflowPublicationOutboxConsumer {
	private readonly rwlock = new ReadWriteLock();

	constructor(
		private readonly logger: Logger,
		private readonly dataSource: DataSource,
		private readonly workflowPublicationOutboxRepository: WorkflowPublicationOutboxRepository,
		private readonly workflowPublishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = this.logger.scoped(['workflow-publication-outbox-consumer']);
	}

	/**
	 * Process a single outbox message.
	 * Returns true if a message was processed, false if no pending messages.
	 */
	async processNextMessage(): Promise<boolean> {
		// Get oldest pending message with FOR UPDATE SKIP LOCKED
		const outboxMessage = await this.dataSource.transaction(async (manager) => {
			const message = await manager
				.createQueryBuilder(WorkflowPublicationOutbox, 'outbox')
				.setLock('pessimistic_write', undefined, ['skipLocked'])
				.where('outbox.status = :status', { status: 'pending' })
				.orderBy('outbox.createdAt', 'ASC')
				.limit(1)
				.getOne();

			if (!message) {
				return null;
			}

			// Mark as in_progress
			await manager.update(WorkflowPublicationOutbox, message.id, { status: 'in_progress' });

			return message;
		});

		if (!outboxMessage) {
			return false; // No pending messages
		}

		try {
			await this.processMessage(outboxMessage);
			return true;
		} catch (error) {
			this.logger.error('Failed to process outbox message', {
				outboxMessageId: outboxMessage.id,
				workflowId: outboxMessage.workflowId,
				error,
			});

			// Mark as failed
			await this.workflowPublicationOutboxRepository.update(outboxMessage.id, {
				status: 'failed',
			});

			throw error;
		}
	}

	/**
	 * Process a single outbox message with workflow lock.
	 */
	private async processMessage(outboxMessage: WorkflowPublicationOutbox): Promise<void> {
		const { workflowId } = outboxMessage;

		// Acquire write lock on workflow
		await new Promise<void>((resolve, reject) => {
			this.rwlock.writeLock(workflowId, (release: () => void): void => {
				this.processWithLock(outboxMessage)
					.then((): void => {
						release();
						resolve();
					})
					.catch((error: unknown): void => {
						release();
						reject(error instanceof Error ? error : new Error(String(error)));
					});
			});
		});
	}

	/**
	 * Process message while holding workflow lock.
	 */
	private async processWithLock(outboxMessage: WorkflowPublicationOutbox): Promise<void> {
		const { workflowId, publishedVersionId } = outboxMessage;

		// Get current published version (if any)
		const currentPublished = await this.workflowPublishedVersionRepository.findOne({
			where: { workflowId },
			relations: ['publishedVersion', 'workflow'],
		});

		// Get new published version from outbox
		const newPublishedVersion = await this.dataSource.manager.findOne(WorkflowHistory, {
			where: { versionId: publishedVersionId },
		});

		if (!newPublishedVersion) {
			throw new Error(`Published version ${publishedVersionId} not found`);
		}

		// Compute trigger diff
		const currentTriggers = currentPublished
			? this.extractTriggerNodes(currentPublished.publishedVersion.nodes)
			: [];
		const newTriggers = this.extractTriggerNodes(newPublishedVersion.nodes);

		const diff = this.computeTriggerDiff(currentTriggers, newTriggers);

		this.logger.debug('Computed trigger diff', {
			workflowId,
			added: diff.added.length,
			removed: diff.removed.length,
			unchanged: diff.unchanged.length,
			modified: diff.modified.length,
		});

		// Handle removed and modified nodes
		// Note: For modified nodes, we remove-then-add rather than update in-place because:
		// 1. In-place updates are complex and trigger-type specific (e.g., changing Kafka topic
		//    vs heartbeat interval have different semantics)
		// 2. This introduces a brief window of unavailability, BUT it's still a strict improvement
		//    over the current approach which deactivates the entire workflow during publication
		// 3. We accept this trade-off for now and can revisit per-trigger-type optimizations later
		const nodesToRemove = [...diff.removed, ...diff.modified];
		if (nodesToRemove.length > 0) {
			const nodeIdsToRemove = nodesToRemove.map((n) => n.id);
			await this.activeWorkflowManager.removeNodes(workflowId, nodeIdsToRemove);
		}

		// Update workflow_published_version table
		await this.workflowPublishedVersionRepository.upsert(
			{
				workflowId,
				publishedVersionId,
			},
			['workflowId'],
		);

		// Handle added and modified nodes
		// Filter out disabled nodes - they should not be activated
		const nodesToAdd = [...diff.added, ...diff.modified].filter((n) => !n.disabled);
		if (nodesToAdd.length > 0) {
			await this.addNodes(workflowId, newPublishedVersion, nodesToAdd);
		}

		// Mark outbox message as completed
		await this.workflowPublicationOutboxRepository.update(outboxMessage.id, {
			status: 'completed',
		});

		this.logger.info('Successfully processed workflow publication', {
			workflowId,
			outboxMessageId: outboxMessage.id,
		});
	}

	/**
	 * Extract trigger and poller nodes from a workflow definition.
	 */
	private extractTriggerNodes(nodes: INode[]): INode[] {
		const triggerNodes: INode[] = [];

		for (const node of nodes) {
			try {
				const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);

				if (nodeType.trigger !== undefined || nodeType.poll !== undefined) {
					triggerNodes.push(node);
				}
			} catch (error) {
				this.logger.warn(`Could not find node type for ${node.type}`, { error });
			}
		}

		return triggerNodes;
	}

	/**
	 * Compute diff between current and new trigger nodes.
	 */
	private computeTriggerDiff(currentTriggers: INode[], newTriggers: INode[]): TriggerDiff {
		const currentById = new Map(currentTriggers.map((n) => [n.id, n]));
		const newById = new Map(newTriggers.map((n) => [n.id, n]));

		const added: INode[] = [];
		const removed: INode[] = [];
		const unchanged: INode[] = [];
		const modified: INode[] = [];

		// Find added and modified nodes
		for (const newNode of newTriggers) {
			const currentNode = currentById.get(newNode.id);

			if (!currentNode) {
				// Node is new
				added.push(newNode);
			} else if (this.hasNodeConfigChanged(currentNode, newNode)) {
				// Node exists but configuration changed
				modified.push(newNode);
			} else {
				// Node unchanged
				unchanged.push(newNode);
			}
		}

		// Find removed nodes
		for (const currentNode of currentTriggers) {
			if (!newById.has(currentNode.id)) {
				removed.push(currentNode);
			}
		}

		return { added, removed, unchanged, modified };
	}

	/**
	 * Check if a node's configuration has changed in a way that affects execution.
	 * Compares type, typeVersion, parameters, credentials, and disabled status.
	 */
	private hasNodeConfigChanged(oldNode: INode, newNode: INode): boolean {
		// Compare type and version
		if (oldNode.type !== newNode.type || oldNode.typeVersion !== newNode.typeVersion) {
			return true;
		}

		// Compare disabled status
		if (oldNode.disabled !== newNode.disabled) {
			return true;
		}

		// Compare parameters (deep comparison)
		if (JSON.stringify(oldNode.parameters) !== JSON.stringify(newNode.parameters)) {
			return true;
		}

		// Compare credentials
		if (JSON.stringify(oldNode.credentials) !== JSON.stringify(newNode.credentials)) {
			return true;
		}

		return false;
	}

	/**
	 * Add specific nodes to an active workflow.
	 */
	private async addNodes(
		workflowId: string,
		publishedVersion: WorkflowHistory,
		nodesToAdd: INode[],
	): Promise<void> {
		// Create workflow instance from published version
		const workflow = new Workflow({
			id: workflowId,
			name: publishedVersion.name ?? '',
			nodes: publishedVersion.nodes,
			connections: publishedVersion.connections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: {}, // Static data is managed separately
			settings: {},
		});

		// Get workflow entity for metadata
		const workflowEntity = await this.dataSource.manager.findOne(WorkflowEntity, {
			where: { id: workflowId },
		});

		if (!workflowEntity) {
			throw new Error(`Workflow ${workflowId} not found`);
		}

		// Get additional data for execution context
		const additionalData = await WorkflowExecuteAdditionalData.getBase({
			workflowId,
			workflowSettings: workflowEntity.settings ?? {},
		});

		// Add only the specific nodes
		await this.activeWorkflowManager.addNodes(workflowEntity, workflow, nodesToAdd, {
			activationMode: 'update',
			executionMode: 'trigger',
			additionalData,
		});

		this.logger.debug('Added nodes to workflow', {
			workflowId,
			nodeIds: nodesToAdd.map((n) => n.id),
		});
	}
}
