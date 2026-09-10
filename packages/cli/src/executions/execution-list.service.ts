import type { ExecutionSummaries, User } from '@n8n/db';
import { Container, Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';
import { RoleService } from '@/services/role.service';
import { WorkflowSharingService } from '@/workflows/workflow-sharing.service';

import { hasPosition, type ExecutionCursor } from './execution-cursor';
import {
	COMPLETED_STATUSES,
	ExecutionListV1Service,
	type ListExecutionsResponse,
} from './execution-list-v1.service';
import type { ExecutionListV2Service } from './execution-list-v2.service';

/** Routes execution list requests to either the v1 or the v1+v2 provider. */
@Service()
export class ExecutionListService {
	constructor(
		private readonly v1Service: ExecutionListV1Service,
		private readonly dataPlane: EngineDataPlaneProxyService,
		private readonly workflowSharingService: WorkflowSharingService,
		private readonly roleService: RoleService,
	) {}

	/** Lists executions for the executions page. */
	async listExecutionsForUI(
		query: ExecutionSummaries.RangeQuery,
		cursor?: ExecutionCursor,
	): Promise<ListExecutionsResponse> {
		// Without a status filter the list combines two blocks: current on top, then
		// a completed-only page. Every page keeps that completed filter, so "load
		// more" never repeats the current rows and the count stays completed-only.
		// Only the first page prepends the current block.
		const combinesCurrentAndCompleted = !query.status?.length;
		const hasPositionInCursor = hasPosition(cursor);

		// The `startedAt` order is what both stores page against, so the merge and
		// the cursor agree on what "next" means.
		const pageQuery: ExecutionSummaries.RangeQuery = {
			...query,
			order: { startedAt: 'DESC' },
			...(combinesCurrentAndCompleted ? { status: COMPLETED_STATUSES } : {}),
		};

		const provider = await this.provider();

		return combinesCurrentAndCompleted && !hasPositionInCursor
			? await provider.findCurrentAndCompleted(pageQuery)
			: await provider.findPageWithCount(pageQuery, cursor);
	}

	/**
	 * Lists a single "page" of executions and full count. A page is `limit`
	 * executions starting from `cursor` position.
	 */
	async findPageWithCount(
		query: ExecutionSummaries.RangeQuery,
		cursor?: ExecutionCursor,
	): Promise<ListExecutionsResponse> {
		const provider = await this.provider();

		return await provider.findPageWithCount(query, cursor);
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

	/** The provider for this request: v1 alone, or v1 merged with v2. */
	private async provider(): Promise<ExecutionListV1Service | ExecutionListV2Service> {
		if (!this.dataPlane.isAvailable()) return this.v1Service;

		const { ExecutionListV2Service } = await import('./execution-list-v2.service.js');

		return Container.get(ExecutionListV2Service);
	}
}
