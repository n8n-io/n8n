import type { ExecutionSummaries } from '@n8n/db';
import { ExecutionRepository, WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import { ExecutionStatusList, type ExecutionSummary } from 'n8n-workflow';
import pLimit from 'p-limit';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { EngineV2ExecutionReader } from './engine-v2-execution-reader.service';
import { parseExecutionCursor, type ExecutionPosition } from './execution-cursor';
import { isExecutionIdV2 } from './execution-id';
import { ExecutionService } from './execution.service';
import { mergeExecutionPages } from './merge-execution-pages';

/** Combines stores for the editor. Other API consumers keep their own contracts. */
@Service()
export class ExecutionListService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly executionService: ExecutionService,
		private readonly reader: EngineV2ExecutionReader,
		private readonly dataPlane: EngineDataPlaneProxyService,
	) {}

	async resolveV2Scope(query: ExecutionSummaries.RangeQuery): Promise<string[] | 'all' | null> {
		if (!this.dataPlane.isAvailable() || !query.user) return null;
		if (
			query.metadata?.length ||
			query.annotationTags?.length ||
			query.vote ||
			query.workflowVersionId !== undefined ||
			(query.id && !isExecutionIdV2(query.id))
		)
			return null;
		if (
			hasGlobalScope(query.user, 'workflow:read') &&
			!query.workflowId &&
			!query.projectId &&
			query.isArchived === undefined &&
			!query.workflowBooleanSettings?.length
		)
			return 'all';
		const ids = await this.workflowRepository.findWorkflowIdsForExecutionList(query);
		return ids.length ? ids : null;
	}

	async findMany(query: ExecutionSummaries.RangeQuery, token?: string) {
		const cursor = parseExecutionCursor(token) ?? { version: 1 as const };
		const scope = await this.resolveV2Scope(query);
		const schedule = pLimit(4);
		const split = !query.status?.length;
		const pageQuery: ExecutionSummaries.RangeQuery = {
			...query,
			order: { startedAt: 'DESC' },
			...(split
				? { status: ExecutionStatusList.filter((s) => s !== 'new' && s !== 'running') }
				: {}),
		};
		const [v1, v2, current] = await Promise.all([
			this.v1Page(pageQuery, cursor.v1),
			scope
				? this.reader.findMany(pageQuery, scope, cursor.v2, true, schedule)
				: { items: [], total: 0, hasMore: false },
			split ? this.current(query, scope, schedule) : [],
		]);
		const merged = mergeExecutionPages([v1, v2], query.range.limit, cursor);
		const results = [...current, ...merged.results];
		const names = new Map(
			(
				await this.workflowRepository.findNamesForExecutionList([
					...new Set(
						results.filter((item) => isExecutionIdV2(item.id)).map((item) => item.workflowId),
					),
				])
			).map((workflow) => [workflow.id, workflow.name]),
		);
		for (const item of results) {
			if (isExecutionIdV2(item.id)) item.workflowName = names.get(item.workflowId);
		}
		return {
			results,
			nextCursor: merged.nextCursor,
			count: v1.count === -1 ? -1 : v1.count + v2.total,
			estimated: v1.estimated,
		};
	}

	private async v1Page(query: ExecutionSummaries.RangeQuery, before?: ExecutionPosition) {
		if (query.id && isExecutionIdV2(query.id))
			return { items: [], hasMore: false, count: 0, estimated: false };
		const { range, ...filters } = query;
		const [rows, count] = await Promise.all([
			this.executionRepository.findManyByRangeQuery({
				...query,
				range: { limit: range.limit + 1, before },
			}),
			this.executionService.getExecutionsCountForQuery({ ...filters, kind: 'count' }),
		]);
		return { items: rows.slice(0, range.limit), hasMore: rows.length > range.limit, ...count };
	}

	private async current(
		query: ExecutionSummaries.RangeQuery,
		scope: string[] | 'all' | null,
		schedule: ReturnType<typeof pLimit>,
	): Promise<ExecutionSummary[]> {
		const currentQuery: ExecutionSummaries.RangeQuery = {
			...query,
			status: ['new', 'running'],
			range: { limit: query.range.limit },
			order: { top: 'running' },
		};
		const [v1, v2] = await Promise.all([
			query.id && isExecutionIdV2(query.id)
				? []
				: this.executionRepository.findManyByRangeQuery(currentQuery),
			scope ? this.currentV2(currentQuery, scope, schedule) : [],
		]);
		return [...v1, ...v2];
	}

	private async currentV2(
		query: ExecutionSummaries.RangeQuery,
		scope: string[] | 'all',
		schedule: ReturnType<typeof pLimit>,
	) {
		const running = await this.reader.findMany(
			{ ...query, status: ['running'] },
			scope,
			undefined,
			false,
			schedule,
		);
		const remaining = query.range.limit - running.items.length;
		if (!remaining) return running.items;
		const queued = await this.reader.findMany(
			{ ...query, status: ['new'], range: { limit: remaining } },
			scope,
			undefined,
			false,
			schedule,
		);
		return running.items.concat(queued.items);
	}
}
