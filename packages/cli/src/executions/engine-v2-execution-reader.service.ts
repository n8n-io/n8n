import type { IExecutionResponse } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionMode, ExecutionSnapshot, ExecutionStatus } from '@n8n/engine';
import type {
	ExecutionStatus as ExecutionStatusV1,
	IRunExecutionData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

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

/**
 * Reads an engine 2.0 execution for display. The data plane is its only store:
 * the workflow comes from the copy captured when the run started, so an edit
 * after the run does not change what the execution reports.
 */
@Service()
export class EngineV2ExecutionReader {
	constructor(private readonly dataPlane: EngineDataPlaneProxyService) {}

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
