import { compareExecutionListItems } from '@n8n/api-types';
import type { ExecutionSummaries } from '@n8n/db';
import { ExecutionListRepository, ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { hasGlobalScope } from '@n8n/permissions';
import type { ExecutionSummary } from 'n8n-workflow';
import assert from 'node:assert';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import {
	EngineV2ExecutionReader,
	type EngineV2SearchQuery,
	type V2Scope,
} from './engine-v2-execution-reader.service';
import type { ExecutionCursor, ExecutionPosition } from './execution-cursor';
import { isExecutionIdV2 } from './execution-id';
import {
	CURRENT_STATUSES,
	ExecutionListV1Service,
	type ListExecutionsResponse,
} from './execution-list-v1.service';
import { mergeExecutionPages } from './merge-execution-pages';

class ExecutionListCtx {
	constructor(
		readonly query: Readonly<ExecutionSummaries.RangeQuery>,
		readonly v2Reader: EngineV2ExecutionReader,
		/** `null` keeps the data plane out of this request. */
		readonly v2Scopes: V2Scope | null,
		readonly cursor?: Readonly<ExecutionCursor>,
	) {}
}

/** Provides the logic for listing executions from both engine v1 and v2 */
@Service()
export class ExecutionListV2Service {
	constructor(
		private readonly executionListV1Service: ExecutionListV1Service,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionListRepository: ExecutionListRepository,
		private readonly reader: EngineV2ExecutionReader,
		private readonly dataPlane: EngineDataPlaneProxyService,
	) {}

	async findPageWithCount(
		query: ExecutionSummaries.RangeQuery,
		cursor?: ExecutionCursor,
	): Promise<ListExecutionsResponse> {
		const ctx = await this.buildCtx(query, cursor);

		const result = await this.findPageMerged(ctx);
		await this.resolveWorkflowNames(result.results);

		return result;
	}

	/**
	 * Retrieves current (new & running) and completed (all other) executions
	 * from both v1 and v2 engines and merges the results.
	 *
	 * @param query the completed-only page query. The current block overrides the
	 * status, order and range itself, so that narrowing does not reach it.
	 */
	async findCurrentAndCompleted(
		query: ExecutionSummaries.RangeQuery,
	): Promise<ListExecutionsResponse> {
		const ctx = await this.buildCtx(query);

		const [currentMerged, completedMerged] = await Promise.all([
			this.findCurrentMerged(ctx),
			this.findPageMerged(ctx),
		]);

		const results = currentMerged.concat(completedMerged.results);
		await this.resolveWorkflowNames(results);

		return {
			results,
			nextCursor: completedMerged.nextCursor,
			count: completedMerged.count,
			estimated: completedMerged.estimated,
		};
	}

	private async findCurrentMerged(ctx: ExecutionListCtx) {
		const [v1Current, v2Current] = await Promise.all([
			this.executionListV1Service.findCurrentExecutions(ctx.query),
			this.findCurrentExecutionsV2(ctx),
		]);

		// Not capped to `limit`: each store contributes up to `limit` current rows,
		// so the block can hold twice that. Current rows are few in practice.
		return v1Current.concat(v2Current).sort((a, b) => {
			const aRunning = a.status === 'running';
			const bRunning = b.status === 'running';
			if (aRunning !== bRunning) return aRunning ? -1 : 1;

			return compareExecutionListItems(a, b);
		});
	}

	private async findPageMerged(ctx: ExecutionListCtx): Promise<ListExecutionsResponse> {
		const [v1Page, v2Page] = await Promise.all([this.v1Page(ctx), this.v2Page(ctx)]);

		const merged = mergeExecutionPages([v1Page, v2Page], ctx.query.range.limit, ctx.cursor);

		return {
			results: merged.results,
			nextCursor: merged.nextCursor,
			// `-1` means the control plane could not count at all, so no total exists.
			count: v1Page.count === -1 ? -1 : v1Page.count + v2Page.total,
			estimated: v1Page.estimated,
		};
	}

	/**
	 * Which workflows the data plane may be searched for, or `null` to keep it out
	 * of this request.
	 *
	 * The data plane search has no equivalent for a metadata, annotation, vote, or
	 * workflow-version filter, so a query using one is answered from the control
	 * plane alone. That silently drops every engine 2.0 execution from the result.
	 */
	async resolveV2Scope(query: ExecutionSummaries.RangeQuery): Promise<V2Scope | null> {
		if (
			query.metadata?.length ||
			query.annotationTags?.length ||
			query.vote ||
			query.workflowVersionId !== undefined
		)
			return null;

		const user = query.user;
		assert(user);

		if (
			hasGlobalScope(user, 'workflow:read') &&
			!query.workflowId &&
			!query.projectId &&
			query.isArchived === undefined &&
			!query.workflowBooleanSettings?.length
		)
			return 'all';

		return await this.executionListRepository.findWorkflowIdsForExecutionList(query);
	}

	private async v1Page(ctx: ExecutionListCtx) {
		const { range: _, ...countQuery } = ctx.query;

		const [rows, executionCount] = await Promise.all([
			this.executionRepository.findManyByRangeQuery({
				...ctx.query,
				// One row past the page tells the merge whether the store has more.
				range: {
					limit: ctx.query.range.limit + 1,
					beforeId: ctx.cursor?.v1?.id ?? ctx.query.range.beforeId,
				},
			}),
			this.executionListV1Service.getExecutionsCountForQuery({ ...countQuery, kind: 'count' }),
		]);

		return {
			items: rows.slice(0, ctx.query.range.limit),
			hasMore: rows.length > ctx.query.range.limit,
			count: executionCount.count,
			estimated: executionCount.estimated,
		};
	}

	private async v2Page(ctx: ExecutionListCtx) {
		if (!ctx.v2Scopes) return { items: [], total: 0, hasMore: false };

		// The page reports a total, so `count` can add both stores together.
		return await ctx.v2Reader.findMany(this.toV2Query(ctx.query, ctx.cursor?.v2), ctx.v2Scopes, {
			includeTotal: true,
		});
	}

	/** Narrows a control-plane range query down to what the data plane search understands. */
	private toV2Query(
		query: ExecutionSummaries.RangeQuery,
		before?: ExecutionPosition,
	): EngineV2SearchQuery {
		return {
			status: query.status,
			mode: query.mode,
			startedAfter: query.startedAfter,
			startedBefore: query.startedBefore,
			before,
			limit: query.range.limit,
		};
	}

	/** Resolves and assigns `workflowName` on every v2 result, in place. */
	private async resolveWorkflowNames(results: ExecutionSummary[]): Promise<void> {
		const v2Results = results.filter((item) => isExecutionIdV2(item.id));
		if (!v2Results.length) return;

		const uniqV2WorkflowIds = [...new Set(v2Results.map((item) => item.workflowId))];
		const workflowNames =
			await this.executionListRepository.findNamesForExecutionList(uniqV2WorkflowIds);
		const namesById = new Map(workflowNames.map((workflow) => [workflow.id, workflow.name]));

		for (const item of v2Results) item.workflowName = namesById.get(item.workflowId);
	}

	private async findCurrentExecutionsV2(ctx: ExecutionListCtx) {
		if (!ctx.v2Scopes) return [];

		// No total: the current block is never paged, and `count` excludes it.
		const currentExecutions = await ctx.v2Reader.findMany(
			{
				...this.toV2Query(ctx.query, ctx.cursor?.v2),
				status: CURRENT_STATUSES,
				order: { top: 'running' }, // ensure limit cannot exclude running
			},
			ctx.v2Scopes,
		);

		return currentExecutions.items;
	}

	private async buildCtx(query: ExecutionSummaries.RangeQuery, cursor?: ExecutionCursor) {
		// The router only picks this provider while the data plane is up.
		assert(this.dataPlane.isAvailable());

		return new ExecutionListCtx(query, this.reader, await this.resolveV2Scope(query), cursor);
	}
}
