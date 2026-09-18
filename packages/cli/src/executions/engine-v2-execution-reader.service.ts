import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	ExecutionListItem,
	ExecutionSnapshot,
	ExecutionStatus,
	SearchExecutionsRequest,
} from '@n8n/engine';
import type {
	ExecutionStatus as ExecutionStatusV1,
	IRunExecutionData,
	WorkflowExecuteMode,
	ExecutionSummary,
	Workflow,
} from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { resolveV2Statuses, toV1Mode, toV1Status } from './engine-v2-mapping';
import type { ExecutionPosition } from './execution-cursor';
import { toWorkflowSnapshot, type WorkflowSnapshot } from './execution-data/types';
import type { ExecutionIdV2 } from './execution-id';

/**
 * Workflow visibility scope for engine v2. Marks which workflows can be
 * returned by the search.
 */
export type V2Scope = 'all' | ReadonlyArray<Workflow['id']>;

/** The subset of a range query the data plane search actually understands. */
export interface EngineV2SearchQuery {
	/** A v1 status filter; resolved internally to the v2 statuses that map onto it. */
	status?: ExecutionStatusV1[];
	mode?: WorkflowExecuteMode;
	startedAfter?: string;
	startedBefore?: string;
	/** The DP source position to resume from, independent of the control plane's own cursor. */
	before?: ExecutionPosition;
	limit: number;
	order?: {
		top?: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
		startedAt?: 'DESC';
	};
}

/**
 * The most workflow IDs one data plane search takes. A wider scope throws for
 * now; splitting it across several searches can come later.
 */
const MAX_SCOPE_SIZE = 10_000;

/**
 * Reads an engine 2.0 execution for display. The data plane is its only store:
 * the workflow comes from the copy captured when the run started, so an edit
 * after the run does not change what the execution reports.
 */
@Service()
export class EngineV2ExecutionReader {
	constructor(private readonly dataPlane: EngineDataPlaneProxyService) {}

	async findMany(
		query: EngineV2SearchQuery,
		scope: V2Scope,
		options: { includeTotal?: boolean } = {},
	) {
		const { includeTotal = false } = options;
		if (scope !== 'all' && !scope.length) return this.empty();

		const status = resolveV2Statuses(query.status);
		// A filter that matches no v2 status can only return nothing.
		if (status?.length === 0) return this.empty();

		const request = this.buildSearchRequest(
			query,
			this.searchableScope(scope),
			status,
			includeTotal,
		);
		const page = await this.dataPlane.searchExecutions(request);

		return {
			items: page.items.map((item) => this.toExecutionSummary(item)),
			total: page.total ?? 0,
			hasMore: page.nextCursor !== null,
		};
	}

	private empty() {
		return { items: [], hasMore: false, total: 0 };
	}

	/** The deduplicated scope, or a user-facing error when one search cannot hold it. */
	private searchableScope(scope: V2Scope): V2Scope {
		if (scope === 'all') return scope;

		const ids = [...new Set(scope)];
		if (ids.length > MAX_SCOPE_SIZE) {
			throw new UserError(
				`Cannot search executions across more than ${MAX_SCOPE_SIZE} workflows. Filter by project or workflow.`,
			);
		}

		return ids;
	}

	private buildSearchRequest(
		query: EngineV2SearchQuery,
		scope: V2Scope,
		status: ExecutionStatus[] | undefined,
		includeTotal: boolean,
	): SearchExecutionsRequest {
		return {
			workflowIds: scope,
			status,
			mode: query.mode,
			createdAfter: query.startedAfter ? new Date(query.startedAfter).toISOString() : undefined,
			createdBefore: query.startedBefore ? new Date(query.startedBefore).toISOString() : undefined,
			before: query.before ? { createdAt: query.before.timestamp, id: query.before.id } : undefined,
			limit: query.limit,
			includeTotal,
			order: query.order,
		};
	}

	private toExecutionSummary(item: ExecutionListItem): ExecutionSummary {
		return {
			id: item.id,
			workflowId: item.workflowId,
			status: toV1Status(item.status),
			mode: toV1Mode(item.mode),
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
			mode: toV1Mode(snapshot.mode),
			status: toV1Status(snapshot.status),
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
