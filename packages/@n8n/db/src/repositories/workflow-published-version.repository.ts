import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { WorkflowPublishedVersion } from '../entities';
import type { WorkflowEntity, WorkflowHistory } from '../entities';
import type {
	AgentToolWorkflowReference,
	PublishedWorkflowDataForExecution,
	WorkflowVersionFingerprint,
} from './workflow-execution-data';

export type { PublishedWorkflowDataForExecution } from './workflow-execution-data';

const publishedWorkflowDataSelect = [
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
];

function toPublishedWorkflowData(
	workflow: WorkflowEntity,
	publishedVersion: WorkflowHistory,
): PublishedWorkflowDataForExecution {
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
		versionId: publishedVersion.versionId,
		nodes: publishedVersion.nodes,
		connections: publishedVersion.connections,
		nodeGroups: publishedVersion.nodeGroups,
	};
}

@Service()
export class WorkflowPublishedVersionRepository extends Repository<WorkflowPublishedVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishedVersion, dataSource.manager);
	}

	async setPublishedVersion(workflowId: string, publishedVersionId: string): Promise<void> {
		await this.upsert({ workflowId, publishedVersionId }, ['workflowId']);
	}

	async removePublishedVersion(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}

	async getPublishedVersionId(workflowId: string): Promise<string | null> {
		const record = await this.findOne({
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

	async findPublishedWorkflowForAgentTool(
		projectId: string,
		reference: AgentToolWorkflowReference,
	): Promise<PublishedWorkflowDataForExecution | null> {
		const query = this.createQueryBuilder('mapping')
			.innerJoinAndSelect('mapping.workflow', 'workflow')
			.innerJoinAndSelect('mapping.publishedVersion', 'publishedVersion')
			.innerJoin('workflow.shared', 'shared')
			.select(publishedWorkflowDataSelect)
			.where('workflow.isArchived = :isArchived', { isArchived: false })
			.andWhere('shared.projectId = :projectId', { projectId });

		if (reference.workflowId !== undefined) {
			query.andWhere('workflow.id = :workflowId', { workflowId: reference.workflowId });
		} else {
			query.andWhere('workflow.name = :workflowName', { workflowName: reference.workflowName });
		}

		const record = await query.getOne();
		if (!record?.workflow || !record.publishedVersion) return null;

		return toPublishedWorkflowData(record.workflow, record.publishedVersion);
	}

	async findPublishedVersionFingerprintsForAgentTools(
		projectId: string,
		workflowIds: string[],
	): Promise<WorkflowVersionFingerprint[]> {
		if (workflowIds.length === 0) return [];

		const mappings = await this.find({
			select: { workflowId: true, publishedVersionId: true },
			where: {
				workflowId: In(workflowIds),
				workflow: {
					isArchived: false,
					shared: { projectId },
				},
			},
		});

		return mappings.map(({ workflowId, publishedVersionId }) => ({
			workflowId,
			versionId: publishedVersionId,
		}));
	}

	async getPublishedVersionForExecution(
		workflowId: string,
	): Promise<PublishedWorkflowDataForExecution | null> {
		const record = await this.createQueryBuilder('mapping')
			.innerJoinAndSelect('mapping.workflow', 'workflow')
			.innerJoinAndSelect('mapping.publishedVersion', 'publishedVersion')
			.select(publishedWorkflowDataSelect)
			.where('mapping.workflowId = :workflowId', { workflowId })
			.getOne();

		if (!record?.publishedVersion || !record.workflow) {
			return null;
		}

		return toPublishedWorkflowData(record.workflow, record.publishedVersion);
	}
}
