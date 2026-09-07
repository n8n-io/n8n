import type { IExecutionResponse, WorkflowEntity } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionMode, ExecutionSnapshot, ExecutionStatus } from '@n8n/engine';
import type {
	ExecutionStatus as ExecutionStatusV1,
	IRunExecutionData,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import { toWorkflowSnapshot } from './execution-data/types';
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
 * Reads an engine 2.0 execution for display. The data plane is its only store,
 * but the workflow it ran still comes from the control plane.
 */
@Service()
export class EngineV2ExecutionReader {
	constructor(
		private readonly dataPlane: EngineDataPlaneProxyService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

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

		const workflowData = await this.workflowRepository.findById(snapshot.workflowId);
		if (!workflowData) return undefined;

		// Lazily imported: a top-level import would pull `@n8n/engine` into every
		// n8n process, including ones with the module off.
		const { toV1RunExecutionData } = await import('@n8n/node-engine-compatibility');

		return this.toExecutionResponse(
			snapshot,
			workflowData,
			toV1RunExecutionData(snapshot.graph, snapshot.steps ?? []),
		);
	}

	private toExecutionResponse(
		snapshot: ExecutionSnapshot,
		workflow: WorkflowEntity,
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
