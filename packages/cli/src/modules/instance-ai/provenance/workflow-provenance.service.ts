import type { InstanceAiProvenanceListItem, InstanceAiWorkflowProvenance } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { InstanceAiMemoryService } from '../instance-ai-memory.service';
import { WorkflowProvenanceRepository } from './workflow-provenance.repository';

/**
 * The most rows read before the access filter. It keeps the list query small
 * for a user who has built many workflows.
 */
export const PROVENANCE_CANDIDATE_CAP = 500;

@Service()
export class WorkflowProvenanceService {
	constructor(
		private readonly repository: WorkflowProvenanceRepository,
		private readonly workflowFinderService: WorkflowFinderService,
		private readonly memoryService: InstanceAiMemoryService,
	) {}

	/** Callers pass ids from server context only. Request input never reaches this method. */
	async record(workflowId: string, threadId: string, userId: string): Promise<void> {
		await this.repository.recordIfAbsent(workflowId, threadId, userId);
	}

	/** Workflows that the user's Assistant chats built and that the user can still read. */
	async listMine(user: User, limit: number): Promise<InstanceAiProvenanceListItem[]> {
		const candidateIds = await this.repository.listWorkflowIdsCreatedBy(
			user.id,
			PROVENANCE_CANDIDATE_CAP,
		);
		const readableIds = await this.workflowFinderService.findWorkflowIdsWithScopeForUser(
			candidateIds,
			user,
			['workflow:read'],
		);
		const rows = await this.repository.listForWorkflowIds([...readableIds], limit);
		if (rows.length === 0) return [];
		const ownedThreadIds = await this.memoryService.findOwnedThreadIds(
			user.id,
			rows.map(({ threadId }) => threadId),
		);
		return rows.map((row) => ({
			workflowId: row.workflowId,
			name: row.name,
			active: row.active,
			threadId: row.threadId,
			createdAt: row.createdAt.toISOString(),
			canOpenThread: ownedThreadIds.has(row.threadId),
		}));
	}

	/** Returns null for a readable workflow that the Assistant did not build. */
	async getForWorkflow(
		user: User,
		workflowId: string,
	): Promise<InstanceAiWorkflowProvenance | null> {
		const workflow = await this.workflowFinderService.findWorkflowForUser(workflowId, user, [
			'workflow:read',
		]);
		if (!workflow) throw new NotFoundError('Workflow not found');

		const record = await this.repository.findForWorkflow(workflowId);
		if (!record) return null;

		const ownership = await this.memoryService.checkThreadOwnership(user.id, record.threadId);
		return {
			workflowId: record.workflowId,
			threadId: record.threadId,
			createdAt: record.createdAt.toISOString(),
			canOpenThread: ownership === 'owned',
		};
	}
}
