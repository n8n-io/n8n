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

import { RoleService } from '@/services/role.service';

/**
 * Workflows pulled from the DB per search. The coarse SQL pre-filter matches JSON
 * structure as well as content, so it over-fetches; this bounds the in-memory
 * re-match on queries that hit a large share of the corpus.
 */
const CANDIDATE_WORKFLOW_LIMIT = NODE_SEARCH_MAX_RESULTS * 10;

/** Relevance order for matched fields — a node-name hit beats a buried parameter hit. */
const MATCHED_FIELD_RANK: Record<NodeSearchMatchedField, number> = {
	name: 0,
	type: 1,
	notes: 2,
	parameters: 3,
};

type ScoredHit = NodeSearchHit & { rank: number };

@Service()
export class WorkflowNodeSearchService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly roleService: RoleService,
	) {}

	/**
	 * Full-text search over the nodes of every non-archived workflow the user can
	 * read. Matches node names, types, notes and parameter values.
	 * Optionally restrict to workflows owned by `projectId`.
	 */
	async search(
		user: User,
		rawQuery: string,
		options: { projectId?: string } = {},
	): Promise<SearchWorkflowNodesResponse> {
		const query = rawQuery.trim();
		if (!query) return { results: [], hasMore: false };

		const scopes = ['workflow:read' as const];
		const [projectRoles, workflowRoles] = await Promise.all([
			this.roleService.rolesWithScope('project', scopes),
			this.roleService.rolesWithScope('workflow', scopes),
		]);

		const candidates = await this.workflowRepository.findNodeSearchCandidates(
			user,
			{ scopes, projectRoles, workflowRoles },
			query,
			CANDIDATE_WORKFLOW_LIMIT,
			options.projectId,
		);

		const queryLower = query.toLowerCase();
		const hits: ScoredHit[] = [];

		for (const candidate of candidates) {
			hits.push(...this.matchWorkflow(candidate, queryLower));
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
