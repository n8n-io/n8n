import { Logger } from '@n8n/backend-common';
import { WorkflowsConfig } from '@n8n/config';
import type { WorkflowEntity, WorkflowPublicationOutbox } from '@n8n/db';
import {
	WorkflowPublicationOutboxRepository,
	WorkflowPublishedVersionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { ErrorReporter } from 'n8n-core';
import { Workflow } from 'n8n-workflow';

import { NodeTypes } from '@/node-types';

import { ActiveWorkflowManager } from '../active-workflow-manager';
import { WorkflowPublishedDataService } from './workflow-published-data.service';

interface TriggerDiff {
	toAdd: INode[];
	toRemove: INode[];
}

@Service()
export class WorkflowPublicationOutboxConsumer {
	/** Per-workflow promise-based lock to prevent concurrent processing. */
	private readonly workflowLocks = new Map<string, Promise<void>>();

	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly outboxRepository: WorkflowPublicationOutboxRepository,
		private readonly publishedVersionRepository: WorkflowPublishedVersionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly activeWorkflowManager: ActiveWorkflowManager,
		private readonly workflowPublishedDataService: WorkflowPublishedDataService,
		private readonly workflowsConfig: WorkflowsConfig,
		private readonly nodeTypes: NodeTypes,
	) {
		this.logger = this.logger.scoped('workflow-publication');
	}

	/**
	 * Process the next pending outbox record, if any.
	 * Called by the orchestrator (e.g. on a wake-up event or polling interval).
	 */
	async processNextMessage(): Promise<boolean> {
		if (!this.workflowsConfig.useWorkflowPublicationService) return false;

		const record = await this.outboxRepository.claimNextPendingRecord();
		if (!record) return false;

		this.logger.debug('Claimed outbox record', {
			id: record.id,
			workflowId: record.workflowId,
			publishedVersionId: record.publishedVersionId,
		});

		await this.processWithLock(record);
		return true;
	}

	/**
	 * Acquire a per-workflow lock and process the record.
	 * If another record for the same workflow is already being processed,
	 * this will wait for it to complete before starting.
	 */
	private async processWithLock(record: WorkflowPublicationOutbox): Promise<void> {
		const { workflowId } = record;

		// Wait for any in-flight processing for this workflow to finish
		const existingLock = this.workflowLocks.get(workflowId);
		if (existingLock) {
			await existingLock;
		}

		// Create a new lock for this processing
		let releaseLock: () => void;
		const lockPromise = new Promise<void>((resolve) => {
			releaseLock = resolve;
		});
		this.workflowLocks.set(workflowId, lockPromise);

		try {
			await this.processRecord(record);
		} finally {
			releaseLock!();
			// Only delete if this is still our lock (not replaced by a newer one)
			if (this.workflowLocks.get(workflowId) === lockPromise) {
				this.workflowLocks.delete(workflowId);
			}
		}
	}

	private async processRecord(record: WorkflowPublicationOutbox): Promise<void> {
		const { workflowId, publishedVersionId } = record;

		try {
			const dbWorkflow = await this.workflowRepository.findById(workflowId);

			if (!dbWorkflow) {
				this.logger.warn('Workflow not found, marking record as failed', { workflowId });
				await this.markFailed(record, 'Workflow not found');
				return;
			}

			// Get the current published version data (what's currently running)
			const currentPublished =
				await this.workflowPublishedDataService.getPublishedWorkflowData(workflowId);

			// Update the published version pointer to the new version
			await this.publishedVersionRepository.upsert({ workflowId, publishedVersionId }, [
				'workflowId',
			]);

			// Get the NEW published version data (what should be running after update)
			const newPublished =
				await this.workflowPublishedDataService.getPublishedWorkflowData(workflowId);

			if (!newPublished) {
				this.logger.error('New published version data not found after update', {
					workflowId,
					publishedVersionId,
				});
				await this.markFailed(record, 'New published version data not found');
				return;
			}

			// Compute trigger diff between old and new versions
			const oldNodes = currentPublished?.nodes ?? [];
			const newNodes = newPublished.nodes;

			const triggerDiff = this.computeTriggerDiff(oldNodes, newNodes);

			if (triggerDiff.toRemove.length > 0 || triggerDiff.toAdd.length > 0) {
				await this.applyTriggerDiff(
					workflowId,
					dbWorkflow,
					newPublished.nodes,
					newPublished.connections,
					triggerDiff,
				);
			}

			await this.markCompleted(record);

			this.logger.info('Successfully processed outbox record', {
				id: record.id,
				workflowId,
				publishedVersionId,
				triggersAdded: triggerDiff.toAdd.length,
				triggersRemoved: triggerDiff.toRemove.length,
			});
		} catch (error) {
			this.errorReporter.error(error);
			this.logger.error('Failed to process outbox record', {
				id: record.id,
				workflowId,
				error,
			});
			await this.markFailed(record, error instanceof Error ? error.message : `${error}`);
		}
	}

	/**
	 * Compare old and new trigger nodes by node ID to determine what changed.
	 *
	 * - Nodes present in new but not old → toAdd
	 * - Nodes present in old but not new → toRemove
	 * - Nodes present in both but with config changes → toRemove + toAdd (restart)
	 */
	computeTriggerDiff(oldNodes: INode[], newNodes: INode[]): TriggerDiff {
		const oldTriggers = this.extractTriggerAndPollNodes(oldNodes);
		const newTriggers = this.extractTriggerAndPollNodes(newNodes);

		const oldById = new Map(oldTriggers.map((n) => [n.id, n]));
		const newById = new Map(newTriggers.map((n) => [n.id, n]));

		const toAdd: INode[] = [];
		const toRemove: INode[] = [];

		// Nodes in new but not in old → add
		// Nodes in both but config changed → remove old + add new
		for (const [id, newNode] of newById) {
			const oldNode = oldById.get(id);
			if (!oldNode) {
				toAdd.push(newNode);
			} else if (this.hasNodeConfigChanged(oldNode, newNode)) {
				toRemove.push(oldNode);
				toAdd.push(newNode);
			}
		}

		// Nodes in old but not in new → remove
		for (const [id, oldNode] of oldById) {
			if (!newById.has(id)) {
				toRemove.push(oldNode);
			}
		}

		return { toAdd, toRemove };
	}

	private extractTriggerAndPollNodes(nodes: INode[]): INode[] {
		const workflow = new Workflow({
			id: 'temp',
			name: 'temp',
			nodes,
			connections: {},
			active: false,
			nodeTypes: this.nodeTypes,
		});

		return [...workflow.getTriggerNodes(), ...workflow.getPollNodes()];
	}

	private hasNodeConfigChanged(oldNode: INode, newNode: INode): boolean {
		return (
			oldNode.type !== newNode.type ||
			oldNode.typeVersion !== newNode.typeVersion ||
			oldNode.disabled !== newNode.disabled ||
			JSON.stringify(oldNode.parameters) !== JSON.stringify(newNode.parameters) ||
			JSON.stringify(oldNode.credentials) !== JSON.stringify(newNode.credentials)
		);
	}

	private async applyTriggerDiff(
		workflowId: string,
		dbWorkflow: WorkflowEntity,
		newNodes: INode[],
		newConnections: WorkflowEntity['connections'],
		{ toRemove, toAdd }: TriggerDiff,
	) {
		// Build a Workflow instance from the new published data
		const workflow = new Workflow({
			id: workflowId,
			name: dbWorkflow.name,
			nodes: newNodes,
			connections: newConnections,
			active: true,
			nodeTypes: this.nodeTypes,
			staticData: dbWorkflow.staticData,
			settings: dbWorkflow.settings,
		});

		// Remove old trigger nodes first
		if (toRemove.length > 0) {
			this.logger.debug('Removing trigger nodes', {
				workflowId,
				nodes: toRemove.map((n) => n.name),
			});
			await this.activeWorkflowManager.removeNodes(workflowId, toRemove);
		}

		// Then add new trigger nodes
		if (toAdd.length > 0) {
			// Separate into trigger and poll nodes
			const triggerNodes = toAdd.filter((n) => this.isTriggerNode(n));
			const pollNodes = toAdd.filter((n) => this.isPollNode(n));

			this.logger.debug('Adding trigger nodes', {
				workflowId,
				triggerNodes: triggerNodes.map((n) => n.name),
				pollNodes: pollNodes.map((n) => n.name),
			});

			await this.activeWorkflowManager.addNodes(
				workflowId,
				dbWorkflow,
				workflow,
				triggerNodes,
				pollNodes,
			);
		}
	}

	private isTriggerNode(node: INode): boolean {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return !!nodeType?.trigger;
	}

	private isPollNode(node: INode): boolean {
		const nodeType = this.nodeTypes.getByNameAndVersion(node.type, node.typeVersion);
		return !!nodeType?.poll;
	}

	private async markCompleted(record: WorkflowPublicationOutbox): Promise<void> {
		await this.outboxRepository.update(record.id, { status: 'completed' });
	}

	private async markFailed(record: WorkflowPublicationOutbox, errorMessage: string): Promise<void> {
		await this.outboxRepository.update(record.id, {
			status: 'failed',
			errorMessage,
		});
	}
}
