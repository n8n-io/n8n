import {
	NODE_SEARCH_MAX_RESULTS,
	NODE_SEARCH_PER_WORKFLOW_CAP,
	type NodeSearchHit,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { STICKY_NODE_TYPE } from 'n8n-workflow';

import { WorkflowSharingService } from './workflow-sharing.service';

const STICKY_PREVIEW_MAX_LENGTH = 200;

type WorkflowRow = {
	id: string;
	name: string;
	isArchived: boolean;
	nodes: INode[];
	projectName: string;
};

@Service()
export class WorkflowNodeSearchService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly workflowSharingService: WorkflowSharingService,
	) {}

	async search(user: User, rawQuery: string): Promise<NodeSearchHit[]> {
		const query = rawQuery.trim();
		if (!query) return [];

		const accessibleWorkflowIds = await this.workflowSharingService.getSharedWorkflowIds(user, {
			scopes: ['workflow:read'],
		});

		if (accessibleWorkflowIds.length === 0) return [];

		const rows = await this.fetchCandidateWorkflows(accessibleWorkflowIds, query);

		const results: NodeSearchHit[] = [];
		const queryLower = query.toLowerCase();

		for (const row of rows) {
			if (results.length >= NODE_SEARCH_MAX_RESULTS) break;

			const matchedNodes = this.matchNodesInWorkflow(row.nodes, queryLower);
			if (matchedNodes.length === 0) continue;

			const remainingGlobal = NODE_SEARCH_MAX_RESULTS - results.length;
			const take = matchedNodes.slice(0, Math.min(NODE_SEARCH_PER_WORKFLOW_CAP, remainingGlobal));

			for (const node of take) {
				const isSticky = node.type === STICKY_NODE_TYPE;
				results.push({
					workflowId: row.id,
					workflowName: row.name,
					projectName: row.projectName,
					isArchived: row.isArchived,
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

		return results;
	}

	/**
	 * Workflow-level pre-filter against the JSON-encoded `nodes` column.
	 * Substring match — false positives on JSON keys are accepted (PRD: IDE-grep tradeoff).
	 */
	private async fetchCandidateWorkflows(
		accessibleWorkflowIds: string[],
		query: string,
	): Promise<WorkflowRow[]> {
		const escaped = escapeLikeWildcards(query);
		// Cap candidates at 10x global cap — most matching workflows will produce hits;
		// keeps memory/CPU bounded on pathological queries that match a huge corpus.
		const candidateCap = NODE_SEARCH_MAX_RESULTS * 10;

		const rawRows: Array<{
			id: string;
			name: string;
			isArchived: boolean | number;
			nodes: string | INode[];
			projectName: string | null;
		}> = await this.workflowRepository
			.createQueryBuilder('w')
			.select([
				'w.id AS id',
				'w.name AS name',
				'w."isArchived" AS "isArchived"',
				'w.nodes AS nodes',
				'project.name AS "projectName"',
			])
			.leftJoin('shared_workflow', 'sw', 'sw."workflowId" = w.id AND sw.role = :ownerRole', {
				ownerRole: 'workflow:owner',
			})
			.leftJoin('project', 'project', 'project.id = sw."projectId"')
			.where('w.id IN (:...ids)', { ids: accessibleWorkflowIds })
			.andWhere('LOWER(CAST(w.nodes AS TEXT)) LIKE :q', {
				q: `%${escaped.toLowerCase()}%`,
			})
			.orderBy('w."updatedAt"', 'DESC')
			.limit(candidateCap)
			.getRawMany();

		return rawRows.map((row) => ({
			id: row.id,
			name: row.name,
			isArchived: row.isArchived === true || row.isArchived === 1,
			nodes: typeof row.nodes === 'string' ? this.parseNodesJson(row.nodes) : (row.nodes ?? []),
			projectName: row.projectName ?? '',
		}));
	}

	private parseNodesJson(raw: string): INode[] {
		try {
			const parsed: unknown = JSON.parse(raw);
			return Array.isArray(parsed) ? (parsed as INode[]) : [];
		} catch {
			return [];
		}
	}

	private matchNodesInWorkflow(nodes: INode[], queryLower: string): INode[] {
		const matches: INode[] = [];
		for (const node of nodes) {
			if (this.nodeMatches(node, queryLower)) matches.push(node);
		}
		return matches;
	}

	private nodeMatches(node: INode, queryLower: string): boolean {
		if (node.name?.toLowerCase().includes(queryLower)) return true;
		if (node.notes?.toLowerCase().includes(queryLower)) return true;
		if (node.parameters) {
			try {
				if (JSON.stringify(node.parameters).toLowerCase().includes(queryLower)) return true;
			} catch {
				// fall through
			}
		}
		return false;
	}

	private buildStickyPreview(content: string, queryLower: string): string {
		const lower = content.toLowerCase();
		const idx = lower.indexOf(queryLower);
		if (idx === -1) {
			return content.slice(0, STICKY_PREVIEW_MAX_LENGTH);
		}
		const start = Math.max(0, idx - 40);
		return content.slice(start, start + STICKY_PREVIEW_MAX_LENGTH);
	}
}

function escapeLikeWildcards(input: string): string {
	return input.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
