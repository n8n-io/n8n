import { compareExecutionListItems } from '@n8n/api-types';
import type { IExecutionResponse, ExecutionSummaries } from '@n8n/db';
import { Service } from '@n8n/di';
import pLimit from 'p-limit';
import type {
	ExecutionListItem,
	ExecutionMode,
	ExecutionSnapshot,
	ExecutionStatus,
	SearchExecutionsRequest,
} from '@n8n/engine';
import type {
	ExecutionStatus as ExecutionStatusV1,
	IRunExecutionData,
	WorkflowExecuteMode,
	ExecutionSummary,
} from 'n8n-workflow';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import type { ExecutionPosition } from './execution-cursor';
import { toWorkflowSnapshot, type WorkflowSnapshot } from './execution-data/types';
import type { ExecutionIdV2 } from './execution-id';

/** A status added later reads as `unknown` rather than being guessed at. */
const STATUS_V1 = new Map<ExecutionStatus, ExecutionStatusV1>([
	['queued', 'new'],
	['running', 'running'],
	['completed', 'success'],
	['failed', 'error'],
	['cancelled', 'canceled'],
]);

/** Anything not manual is a production run. */
const MODE_V1 = new Map<ExecutionMode, WorkflowExecuteMode>([
	['manual', 'manual'],
	['production', 'trigger'],
]);

/** Matches the default `schedule` concurrency, so a batch never queues behind itself. */
const SCOPE_BATCH_SIZE = 4;

/**
 * Reads an engine 2.0 execution for display. The data plane is its only store:
 * the workflow comes from the copy captured when the run started, so an edit
 * after the run does not change what the execution reports.
 */
@Service()
export class EngineV2ExecutionReader {
	constructor(private readonly dataPlane: EngineDataPlaneProxyService) {}

	async findMany(
		query: ExecutionSummaries.RangeQuery,
		scope: string[] | 'all',
		before?: ExecutionPosition,
		includeTotal = true,
		schedule = pLimit(4),
	) {
		const empty = { items: [], hasMore: false, total: 0 };
		if (scope !== 'all' && !scope.length) return empty;

		const status = this.resolveStatuses(query);
		if (!status.length) return empty;

		const request = this.buildSearchRequest(query, scope, status, before, includeTotal);
		const scopeChunks = this.chunkWorkflowIds(scope);

		const items: ExecutionSummary[] = [];
		let total = 0;
		let hasMore = false;
		for (let i = 0; i < scopeChunks.length; i += SCOPE_BATCH_SIZE) {
			const pages = await Promise.all(
				scopeChunks
					.slice(i, i + SCOPE_BATCH_SIZE)
					.map(
						async (workflowIds) =>
							await schedule(
								async () => await this.dataPlane.searchExecutions({ ...request, workflowIds }),
							),
					),
			);
			for (const page of pages) {
				total += page.total ?? 0;
				hasMore ||= page.hasMore;
				items.push(...page.items.map((item) => this.toExecutionSummary(item)));
			}
			// Retain only the candidates that can reach this page.
			items.sort(compareExecutionListItems);
			hasMore ||= items.length > query.range.limit;
			items.splice(query.range.limit);
		}
		return { items, total, hasMore };
	}

	/** Status codes to search for: the v1 filter, narrowed by the v1 `finished` flag. */
	private resolveStatuses(query: ExecutionSummaries.RangeQuery): ExecutionStatus[] {
		const status = [...STATUS_V1.entries()]
			.filter(([, v1]) => !query.status?.length || query.status.includes(v1))
			.map(([v2]) => v2);
		if (query.finished === undefined) return status;
		return status.filter((s) => (s === 'completed') === query.finished);
	}

	private buildSearchRequest(
		query: ExecutionSummaries.RangeQuery,
		scope: string[] | 'all',
		status: ExecutionStatus[],
		before: ExecutionPosition | undefined,
		includeTotal: boolean,
	): SearchExecutionsRequest {
		return {
			workflowIds: scope,
			id: query.id,
			status,
			mode: query.mode,
			createdAfter: query.startedAfter ? new Date(query.startedAfter).toISOString() : undefined,
			createdBefore: query.startedBefore ? new Date(query.startedBefore).toISOString() : undefined,
			before: before ? { createdAt: before.timestamp, id: before.id } : undefined,
			limit: query.range.limit,
			includeTotal,
		};
	}

	/** `'all'` needs no chunking; a workflow-scoped search stays under the engine's per-request cap. */
	private chunkWorkflowIds(scope: string[] | 'all'): Array<string[] | 'all'> {
		if (scope === 'all') return [scope];
		const ids = [...new Set(scope)];
		const chunks: Array<string[] | 'all'> = [];
		for (let i = 0; i < ids.length; i += 10_000) chunks.push(ids.slice(i, i + 10_000));
		return chunks;
	}

	private toExecutionSummary(item: ExecutionListItem): ExecutionSummary {
		return {
			id: item.id,
			workflowId: item.workflowId,
			status: STATUS_V1.get(item.status) ?? 'unknown',
			mode: MODE_V1.get(item.mode) ?? 'trigger',
			finished: item.status === 'completed',
			createdAt: new Date(item.createdAt),
			startedAt: new Date(item.createdAt),
			stoppedAt: item.finishedAt ? new Date(item.finishedAt) : undefined,
			annotation: { tags: [] },
		};
	}

	/** `undefined` for absent and for inaccessible alike, so neither reveals the other. */
	async findOne(
		executionId: ExecutionIdV2,
		sharedWorkflowIds: string[],
	): Promise<IExecutionResponse | undefined> {
		// TODO(CAT-4235): mirror this metadata on the control plane, so we can
		// authorize before reading.
		const snapshot = await this.dataPlane.getExecution(executionId, { includeSteps: true });
		if (!snapshot) return undefined;

		// The `workflow:read` check.
		if (!sharedWorkflowIds.includes(snapshot.workflowId)) return undefined;

		const workflow = asWorkflowSnapshot(snapshot.workflow);
		if (!workflow) return undefined;

		// Lazily imported: a top-level import would pull `@n8n/engine` into every
		// n8n process, including ones with the module off.
		const { toV1RunExecutionData } = await import('@n8n/node-engine-compatibility');

		return this.toExecutionResponse(
			snapshot,
			workflow,
			toV1RunExecutionData(snapshot.graph, snapshot.steps ?? []),
		);
	}

	private toExecutionResponse(
		snapshot: ExecutionSnapshot,
		workflow: WorkflowSnapshot,
		data: IRunExecutionData,
	): IExecutionResponse {
		// No real run timing yet (CAT-4234), so both come from the row.
		const startedAt = new Date(snapshot.createdAt);

		return {
			id: snapshot.id,
			workflowId: snapshot.workflowId,
			mode: MODE_V1.get(snapshot.mode) ?? 'trigger',
			status: STATUS_V1.get(snapshot.status) ?? 'unknown',
			finished: snapshot.status === 'completed',
			createdAt: startedAt,
			startedAt,
			stoppedAt: snapshot.finishedAt ? new Date(snapshot.finishedAt) : undefined,
			storedAt: 'db',
			data,
			// The same projection the v1 path reports, so the editor sees one shape.
			// The cast: the declared type overstates what either path returns.
			workflowData: toWorkflowSnapshot(workflow) as IExecutionResponse['workflowData'],
			// The data plane stores neither.
			customData: {},
			annotation: { tags: [] },
		};
	}
}

/**
 * The document is opaque to the data plane, so its shape is only promised by
 * whoever started the run. `nodes` is the one field the read path cannot do
 * without — redaction walks it unguarded — so a document without it reads as no
 * execution at all rather than as a 500.
 */
function asWorkflowSnapshot(document: unknown): WorkflowSnapshot | undefined {
	if (typeof document !== 'object' || document === null) return undefined;
	if (!Array.isArray((document as { nodes?: unknown }).nodes)) return undefined;

	return document as unknown as WorkflowSnapshot;
}
