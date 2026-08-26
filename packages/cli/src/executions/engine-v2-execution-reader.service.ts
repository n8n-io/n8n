import type { IExecutionResponse } from '@n8n/db';
import { WorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionMode, ExecutionSnapshot, ExecutionStatus } from '@n8n/engine';
import type { ExecutionStatus as ExecutionStatusV1, WorkflowExecuteMode } from 'n8n-workflow';
import { createEmptyRunExecutionData } from 'n8n-workflow';

import { EngineDataPlaneProxyService } from '@/services/engine-data-plane-proxy.service';

import type { ExecutionIdV2 } from './execution-id';

/** A status this map has not learned yet reads as v1's `unknown`, which says just that. */
const STATUS_V1 = new Map<ExecutionStatus, ExecutionStatusV1>([
	['queued', 'new'],
	['running', 'running'],
	['completed', 'success'],
	['failed', 'error'],
	['cancelled', 'canceled'],
]);

/** Only a manual run is manual in v1 terms; anything else the engine adds is a production run. */
const MODE_V1 = new Map<ExecutionMode, WorkflowExecuteMode>([
	['manual', 'manual'],
	['production', 'trigger'],
]);

/**
 * Reads an engine 2.0 execution for display.
 *
 * The data plane is the only store of a v2 execution, so the control plane has
 * no row to read. It does still own the workflow, which is where `workflowData`
 * comes from — and it must come from somewhere, because the redaction policy is
 * read off `workflowData.settings`.
 */
@Service()
export class EngineV2ExecutionReader {
	constructor(
		private readonly dataPlane: EngineDataPlaneProxyService,
		private readonly workflowRepository: WorkflowRepository,
	) {}

	/**
	 * `undefined` when the execution is absent, its workflow is not shared with
	 * the caller, or the workflow is gone — all of which the caller reports as
	 * "not found", so a caller without access learns nothing about existence.
	 *
	 * Step data is not mapped yet (CAT-2923): `data` is an empty run-data object,
	 * so the response carries the execution's identity, status and timing only.
	 */
	async findOne(
		executionId: ExecutionIdV2,
		sharedWorkflowIds: string[],
	): Promise<IExecutionResponse | undefined> {
		// TODO(CAT-4235): store the basic execution metadata on the control-plane
		// side too, so we can authorize against it. Today the workflow id arrives
		// only with the data-plane response, which forces this read to happen
		// before the access check and before the workflow lookup below.
		const snapshot = await this.dataPlane.getExecution(executionId);
		if (!snapshot) return undefined;

		// Checked here rather than inside the query, as the v1 path does.
		if (!sharedWorkflowIds.includes(snapshot.workflowId)) return undefined;

		const workflowData = await this.workflowRepository.findById(snapshot.workflowId);
		if (!workflowData) return undefined;

		return this.toExecutionResponse(snapshot, workflowData);
	}

	private toExecutionResponse(
		snapshot: ExecutionSnapshot,
		workflowData: IExecutionResponse['workflowData'],
	): IExecutionResponse {
		// The engine reports row timestamps, not run timing (CAT-4234), so the row's
		// creation is the best available answer for both.
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
			data: createEmptyRunExecutionData(),
			workflowData,
			// The data plane stores neither.
			customData: {},
			annotation: { tags: [] },
		};
	}
}
