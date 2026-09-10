import type { ExecutionSummaries, User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { RoleService } from '@/services/role.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import {
	COMPLETED_STATUSES,
	ExecutionListV1Service,
	type ListExecutionsResponse,
} from './execution-list-v1.service';

/** Entry point for execution list requests. */
@Service()
export class ExecutionListService {
	constructor(
		private readonly v1Service: ExecutionListV1Service,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly roleService: RoleService,
	) {}

	/** Lists executions for the executions page. */
	async listExecutionsForUI(query: ExecutionSummaries.RangeQuery): Promise<ListExecutionsResponse> {
		// Without a status filter, the first page combines two blocks: current on
		// top, then a completed-only page whose count excludes the current rows.
		// A cursor page is not split, so it spans every status.
		const combinesCurrentAndCompleted = !query.status?.length && !query.range.beforeId;

		return combinesCurrentAndCompleted
			? await this.v1Service.findCurrentAndCompleted({ ...query, status: COMPLETED_STATUSES })
			: await this.v1Service.findPageWithCount(query);
	}

	/**
	 * Lists a single "page" of executions and full count. A page is `limit`
	 * executions starting from the cursor position.
	 */
	async findPageWithCount(query: ExecutionSummaries.RangeQuery): Promise<ListExecutionsResponse> {
		return await this.v1Service.findPageWithCount(query);
	}

	/** Assigns the caller's scopes for each listed execution's workflow, in place. */
	async addScopes(user: User, summaries: ExecutionSummaries.ExecutionSummaryWithScopes[]) {
		const workflowIds = [...new Set(summaries.map((s) => s.workflowId))];

		const scopes = Object.fromEntries(
			await this.workflowSharingService.getSharedWorkflowScopes(workflowIds, user),
		);

		for (const s of summaries) {
			s.scopes = scopes[s.workflowId] ?? [];
		}
	}

	/**
	 * Build sharing options for execution queries. Visibility is resolved from
	 * the user's role scopes — same as the workflow list — and is deliberately
	 * not gated on the sharing license, which only gates sharing actions.
	 */
	async buildSharingOptions(
		scope: Scope,
	): Promise<ExecutionSummaries.RangeQuery['sharingOptions']> {
		const projectRoles = await this.roleService.rolesWithScope('project', [scope]);
		const workflowRoles = await this.roleService.rolesWithScope('workflow', [scope]);
		return { scopes: [scope], projectRoles, workflowRoles };
	}
}
