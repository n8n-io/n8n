import {
	NODE_SEARCH_MAX_RESULTS,
	NODE_SEARCH_PER_WORKFLOW_CAP,
	type NodeSearchHit,
	type NodeSearchMatchedField,
	type SearchWorkflowNodesResponse,
} from '@n8n/api-types';
import type { NodeSearchCandidate, User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { findNodeSearchMatch, STICKY_NODE_TYPE } from 'n8n-workflow';
import pLimit from 'p-limit';

import { TooManyRequestsError } from '@/errors/response-errors/too-many-requests.error';
import { RoleService } from '@/services/role.service';

/**
 * Workflows hydrated per keyset batch. The coarse SQL pre-filter matches JSON
 * structure as well as content (node ids, webhook ids, positions), so a batch
 * can be entirely false positives; the scan continues on an `(updatedAt, id)`
 * cursor instead of giving up, so those false positives cannot silently
 * displace real hits further down — a fixed candidate cap did exactly that.
 */
const BATCH_SIZE = 100;

/**
 * Safety rail for pathological queries where nothing matches in memory but the
 * blob keeps matching: bounds hydration cost, not correctness of ranking.
 * ponytail: practical-completeness bound; the real fix at ~100k+ workflows is a
 * dedicated search index table maintained by the workflow-index module.
 */
const MAX_SCANNED_WORKFLOWS = 2000;

/**
 * A query that matches nothing cannot short-circuit on the `updatedAt` index — it
 * has to read every workflow's `nodes` blob to prove absence, and the keyset
 * scan's worst case walks MAX_SCANNED_WORKFLOWS of hydrated false positives.
 *
 * The per-user rate limit on the endpoint cannot bound that, because the
 * database is shared. Measured in #30294 on a 20k-workflow corpus: with 20
 * users each staying inside their own limit, workflow-list queries degraded
 * 66x on SQLite and 56x on Postgres; capped at one concurrent scan the same
 * scenario measures ~1.3x.
 *
 * So run one scan at a time per process and shed load past a short queue
 * rather than letting search monopolise the connection pool. In multi-main
 * setups the ceiling is per instance, which is the intent: it bounds what a
 * single process can demand of a shared database.
 */
const MAX_CONCURRENT_SEARCHES = 1;
const MAX_QUEUED_SEARCHES = 4;

/** Relevance order for matched fields — a node-name hit beats a buried parameter hit. */
const MATCHED_FIELD_RANK: Record<NodeSearchMatchedField, number> = {
	name: 0,
	type: 1,
	notes: 2,
	parameters: 3,
	credentials: 4,
};

type ScoredHit = NodeSearchHit & { rank: number };

@Service()
export class WorkflowNodeSearchService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly roleService: RoleService,
	) {}

	private readonly limiter = pLimit(MAX_CONCURRENT_SEARCHES);

	/**
	 * Full-text search over the nodes of every non-archived workflow the user can
	 * read. Matches node names, types, notes, parameter values and credential
	 * names. Optionally restrict to workflows owned by `projectId`.
	 *
	 * Throws `TooManyRequestsError` when the process-wide concurrency gate and
	 * its queue are full — see MAX_CONCURRENT_SEARCHES.
	 */
	async search(
		user: User,
		rawQuery: string,
		options: { projectId?: string } = {},
	): Promise<SearchWorkflowNodesResponse> {
		const query = rawQuery.trim();
		if (!query) return { results: [], hasMore: false };

		if (this.limiter.pendingCount >= MAX_QUEUED_SEARCHES) {
			throw new TooManyRequestsError('Workflow node search is busy, please retry.');
		}

		return await this.limiter(async () => await this.runSearch(user, query, options));
	}

	private async runSearch(
		user: User,
		query: string,
		options: { projectId?: string },
	): Promise<SearchWorkflowNodesResponse> {
		const scopes = ['workflow:read' as const];
		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes),
			this.roleService.rolesWithScope('workflow', scopes),
		]);

		const queryLower = query.toLowerCase();
		const hits: ScoredHit[] = [];

		// Keyset scan, newest first. Stops as soon as enough hits exist to fill the
		// result list and decide `hasMore`, so queries that match stop after a batch
		// or two; only queries whose matches are blob-only false positives walk on,
		// bounded by MAX_SCANNED_WORKFLOWS.
		let cursor: { updatedAt: Date; id: string } | undefined;
		let scanned = 0;
		while (scanned < MAX_SCANNED_WORKFLOWS && hits.length <= NODE_SEARCH_MAX_RESULTS) {
			const candidates = await this.workflowRepository.findNodeSearchCandidates(
				user,
				{ scopes, projectRoles, workflowRoles },
				query,
				BATCH_SIZE,
				options.projectId,
				cursor,
			);

			for (const candidate of candidates) {
				hits.push(...this.matchWorkflow(candidate, queryLower));
			}

			scanned += candidates.length;
			if (candidates.length < BATCH_SIZE) break; // corpus exhausted

			const last = candidates[candidates.length - 1];
			cursor = { updatedAt: last.updatedAt, id: last.id };
		}

		// Candidates arrive newest-first, so a stable sort by matched-field rank
		// keeps recency as the tie-breaker within each relevance tier.
		hits.sort((a, b) => a.rank - b.rank);

		const hasMore = hits.length > NODE_SEARCH_MAX_RESULTS;

		return {
			results: hits.slice(0, NODE_SEARCH_MAX_RESULTS).map(({ rank: _rank, ...hit }) => hit),
			hasMore,
		};
	}

	/** Re-match each node in memory to discard the pre-filter's false positives. */
	private matchWorkflow(candidate: NodeSearchCandidate, queryLower: string): ScoredHit[] {
		const hits: ScoredHit[] = [];

		for (const node of candidate.nodes) {
			const match = findNodeSearchMatch(node, queryLower);
			if (!match) continue;

			hits.push({
				...this.toHit(candidate, node, match.field, match.snippet),
				rank: MATCHED_FIELD_RANK[match.field],
			});
		}

		// Rank before capping, so a name match late in the node array isn't dropped
		// in favour of earlier parameter matches.
		hits.sort((a, b) => a.rank - b.rank);

		return hits.slice(0, NODE_SEARCH_PER_WORKFLOW_CAP);
	}

	private toHit(
		candidate: NodeSearchCandidate,
		node: INode,
		matchedField: NodeSearchMatchedField,
		snippet: string,
	): NodeSearchHit {
		return {
			workflowId: candidate.id,
			workflowName: candidate.name,
			homeProject: candidate.homeProject,
			parentFolder: candidate.parentFolder,
			nodeId: node.id,
			nodeName: node.name,
			nodeType: node.type,
			disabled: node.disabled === true,
			isSticky: node.type === STICKY_NODE_TYPE,
			matchedField,
			snippet,
		};
	}
}
