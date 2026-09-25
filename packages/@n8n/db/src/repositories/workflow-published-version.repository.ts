import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';
import type { IWorkflowBase } from 'n8n-workflow';

import { BaseRepository } from './base-repository';
import { WorkflowPublishedVersion } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

export type PublishedWorkflowDataForExecution = Pick<
	IWorkflowBase,
	| 'id'
	| 'name'
	| 'description'
	| 'active'
	| 'isArchived'
	| 'createdAt'
	| 'updatedAt'
	| 'settings'
	| 'staticData'
	| 'activeVersionId'
	| 'versionCounter'
	| 'nodes'
	| 'connections'
	// We don't need this during workflow execution, but execution persistence
	// snapshots this into the execution's workflowData, and the UI uses it when
	// browsing workflow's execution history.
	| 'nodeGroups'
	| 'versionId'
>;

@Service()
export class WorkflowPublishedVersionRepository extends BaseRepository<WorkflowPublishedVersion> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowPublishedVersion, dataSource.manager, transactionRunner);
	}

	async setPublishedVersion(workflowId: string, publishedVersionId: string): Promise<void> {
		await this.upsert({ workflowId, publishedVersionId }, ['workflowId']);
	}

	async removePublishedVersion(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}

	/**
	 * Which of these workflows still have a published version.
	 *
	 * @returns the subset of `workflowIds` that have one.
	 */
	async findPublishedWorkflowIds(workflowIds: string[]): Promise<Set<string>> {
		if (workflowIds.length === 0) {
			return new Set();
		}
		const rows = await this.find({
			where: { workflowId: In(workflowIds) },
			select: ['workflowId'],
		});
		return new Set(rows.map((row) => row.workflowId));
	}

	/**
	 * @param ctx - Pass the active operation context so the read joins an open
	 * transaction (e.g. while holding `DbLock.WORKFLOW_REVIEW_MUTATION`).
	 * Defaults to `{}` for non-transactional callers.
	 */
	async getPublishedVersionId(
		workflowId: string,
		ctx: OperationContext = {},
	): Promise<string | null> {
		const record = await this.managerFor(ctx).findOne(WorkflowPublishedVersion, {
			where: { workflowId },
			select: ['publishedVersionId'],
		});
		return record?.publishedVersionId ?? null;
	}

	/**
	 * Loads the published version record with the related workflow entity
	 * (including shared/project relations) and the workflow history version
	 * (which contains the published nodes/connections).
	 */
	async getPublishedVersionWithRelations(
		workflowId: string,
	): Promise<WorkflowPublishedVersion | null> {
		return await this.findOne({
			where: { workflowId },
			relations: {
				workflow: { shared: { project: true } },
				publishedVersion: true,
			},
		});
	}

	async getPublishedVersionForExecution(
		workflowId: string,
	): Promise<PublishedWorkflowDataForExecution | null> {
		const record = await this.createQueryBuilder('mapping')
			.innerJoinAndSelect('mapping.workflow', 'workflow')
			.innerJoinAndSelect('mapping.publishedVersion', 'publishedVersion')
			.select([
				'mapping.workflowId',
				'mapping.publishedVersionId',
				'workflow.id',
				'workflow.name',
				'workflow.description',
				'workflow.active',
				'workflow.isArchived',
				'workflow.createdAt',
				'workflow.updatedAt',
				'workflow.settings',
				'workflow.staticData',
				'workflow.activeVersionId',
				'workflow.versionCounter',
				'publishedVersion.versionId',
				'publishedVersion.nodes',
				'publishedVersion.connections',
				'publishedVersion.nodeGroups',
			])
			.where('mapping.workflowId = :workflowId', { workflowId })
			.getOne();

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		const { workflow, publishedVersion } = record;

		return {
			id: workflow.id,
			name: workflow.name,
			description: workflow.description,
			active: workflow.active,
			isArchived: workflow.isArchived,
			createdAt: workflow.createdAt,
			updatedAt: workflow.updatedAt,
			settings: workflow.settings,
			staticData: workflow.staticData,
			activeVersionId: workflow.activeVersionId,
			versionCounter: workflow.versionCounter,
			nodes: publishedVersion.nodes,
			connections: publishedVersion.connections,
			nodeGroups: publishedVersion.nodeGroups,
			versionId: publishedVersion.versionId,
		};
	}
}
