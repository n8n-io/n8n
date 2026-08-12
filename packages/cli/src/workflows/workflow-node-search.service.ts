import type { NodeSearchHit } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { SharedWorkflowRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';
import type { INode } from 'n8n-workflow';
import { STICKY_NODE_TYPE } from 'n8n-workflow';
import pLimit from 'p-limit';

import { TooManyRequestsError } from '@/errors/response-errors/too-many-requests.error';
import { RoleService } from '@/services/role.service';

const MAX_RESULTS = 50;
const PER_WORKFLOW_CAP = 5;

/**
 * Workflows scanned before matching nodes in memory. Filling MAX_RESULTS needs
 * at most 50 workflows (1 hit each), so this leaves 2x headroom for workflows
 * that match the raw JSON but yield no node hit.
 */
const MAX_CANDIDATE_WORKFLOWS = 100;

const STICKY_PREVIEW_MAX_LENGTH = 200;
const STICKY_PREVIEW_LEAD_IN = 40;

/**
 * A query that matches nothing cannot short-circuit on the `updatedAt` index — it
 * has to read every workflow's `nodes` blob to prove absence. On a 20k-workflow
 * instance that is ~160ms on SQLite and ~460ms on Postgres, which additionally
 * has to detoast every json value.
 *
 * A per-user rate limit cannot bound that, because the database is shared. With
 * 20 users each staying inside their own limit, list queries measured 66x slower
 * on SQLite and 56x on Postgres. Allowing even two such scans at once was enough
 * to saturate Postgres; at one, the same scenario measures 1.1x.
 *
 * So run one scan at a time per process and shed load past a short queue rather
 * than letting search monopolise the connection pool. In multi-main setups the
 * ceiling is per instance, which is the intent: it bounds what a single process
 * can demand of a shared database. See test/performance/node-search.perf.ts.
 */
const MAX_CONCURRENT_SEARCHES = 1;
const MAX_QUEUED_SEARCHES = 4;

@Service()
export class WorkflowNodeSearchService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly roleService: RoleService,
	) {}

	private readonly limiter = pLimit(MAX_CONCURRENT_SEARCHES);

	async search(user: User, rawQuery: string): Promise<NodeSearchHit[]> {
		const query = rawQuery.trim();
		if (!query) return [];

		if (this.limiter.pendingCount >= MAX_QUEUED_SEARCHES) {
			throw new TooManyRequestsError('Workflow node search is busy, please retry.');
		}

		return await this.limiter(async () => await this.runSearch(user, query));
	}

	private async runSearch(user: User, query: string): Promise<NodeSearchHit[]> {
		// Reuses the shared list query: sharing is a subquery rather than a
		// materialised ID list, and `take` paginates over DISTINCT workflows so the
		// owner join cannot multiply rows out of the cap.
		const scopes: Scope[] = ['workflow:read'];
		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes),
			this.roleService.rolesWithScope('workflow', scopes),
		]);

		const workflows = await this.workflowRepository.getManyWithSharingSubquery(
			user,
			{ scopes, projectRoles, workflowRoles },
			{
				filter: { nodeContent: query },
				// Deliberately no `ownedBy`. Requesting it joins `shared`+`project`, and
				// TypeORM then paginates joined queries through a separate DISTINCT pass
				// with no LIMIT on the filtering query — which stops the `updatedAt`
				// index from short-circuiting the scan. Owner projects are fetched below
				// for the few workflows that actually produced hits.
				// `updatedAt` is selected because it is the ORDER BY column.
				select: { name: true, isArchived: true, nodes: true, updatedAt: true },
				take: MAX_CANDIDATE_WORKFLOWS,
				sortBy: 'updatedAt:desc',
			},
		);

		const queryLower = query.toLowerCase();
		const results: NodeSearchHit[] = [];

		for (const workflow of workflows) {
			if (results.length >= MAX_RESULTS) break;

			const matchedNodes = (workflow.nodes ?? []).filter((node) =>
				this.nodeMatches(node, queryLower),
			);
			if (matchedNodes.length === 0) continue;

			const remainingGlobal = MAX_RESULTS - results.length;
			const take = matchedNodes.slice(0, Math.min(PER_WORKFLOW_CAP, remainingGlobal));

			for (const node of take) {
				const isSticky = node.type === STICKY_NODE_TYPE;
				results.push({
					workflowId: workflow.id,
					workflowName: workflow.name,
					projectName: '',
					isArchived: workflow.isArchived,
					nodeId: node.id,
					nodeName: node.name,
					nodeType: node.type,
					disabled: node.disabled === true,
					isSticky,
					...(isSticky && typeof node.parameters?.content === 'string'
						? {
								stickyPreview: this.buildStickyPreview(node.parameters.content, queryLower),
							}
						: {}),
				});
			}
		}

		await this.attachProjectNames(results);

		return results;
	}

	/** Resolves owner project names for the handful of workflows that produced hits. */
	private async attachProjectNames(results: NodeSearchHit[]): Promise<void> {
		if (results.length === 0) return;

		const workflowIds = [...new Set(results.map((hit) => hit.workflowId))];
		const projects =
			await this.sharedWorkflowRepository.findOwnerProjectsByWorkflowIds(workflowIds);

		for (const hit of results) {
			hit.projectName = projects.get(hit.workflowId)?.name ?? '';
		}
	}

	/**
	 * Substring match — false positives on JSON keys are accepted (PRD: IDE-grep tradeoff).
	 */
	private nodeMatches(node: INode, queryLower: string): boolean {
		if (node.name?.toLowerCase().includes(queryLower)) return true;
		if (node.type?.toLowerCase().includes(queryLower)) return true;
		if (node.notes?.toLowerCase().includes(queryLower)) return true;
		// Parameters were just deserialised from the JSON column, so stringify cannot throw.
		if (node.parameters && JSON.stringify(node.parameters).toLowerCase().includes(queryLower)) {
			return true;
		}
		return false;
	}

	private buildStickyPreview(content: string, queryLower: string): string {
		const idx = content.toLowerCase().indexOf(queryLower);
		if (idx === -1) return content.slice(0, STICKY_PREVIEW_MAX_LENGTH);

		const start = Math.max(0, idx - STICKY_PREVIEW_LEAD_IN);
		return content.slice(start, start + STICKY_PREVIEW_MAX_LENGTH);
	}
}
