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
		});

		// Remove old triggers
		if (diff.removed.length > 0) {
			await this.removeTriggersAndPollers(workflowId);
		}

		// Update workflow_published_version table
		await this.workflowPublishedVersionRepository.upsert(
			{
				workflowId,
				publishedVersionId,
			},
			['workflowId'],
		);

		// Add new triggers
		if (diff.added.length > 0 || diff.unchanged.length > 0) {
			await this.addTriggersAndPollers(workflowId, newPublishedVersion);
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
		const currentIds = new Set(currentTriggers.map((n) => n.id));
		const newIds = new Set(newTriggers.map((n) => n.id));

		const added = newTriggers.filter((n) => !currentIds.has(n.id));
		const removed = currentTriggers.filter((n) => !newIds.has(n.id));
		const unchanged = newTriggers.filter((n) => currentIds.has(n.id));

		return { added, removed, unchanged };
	}

	/**
	 * Remove all triggers and pollers for a workflow.
	 */
	private async removeTriggersAndPollers(workflowId: string): Promise<void> {
		// This delegates to active-workflow-manager which handles:
		// - Stopping trigger listeners
		// - Stopping pollers
		// - Cleaning up webhooks if needed
		await this.activeWorkflowManager.removeWorkflowTriggersAndPollers(workflowId);

		this.logger.debug('Removed triggers and pollers', { workflowId });
	}

	/**
	 * Add triggers and pollers for a workflow.
	 */
	private async addTriggersAndPollers(
		workflowId: string,
		publishedVersion: WorkflowHistory,
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

		// Add triggers and pollers
		await this.activeWorkflowManager.addTriggersAndPollers(workflowEntity, workflow, {
			activationMode: 'update',
			executionMode: 'trigger',
			additionalData,
		});

		this.logger.debug('Added triggers and pollers', { workflowId });
	}
}
