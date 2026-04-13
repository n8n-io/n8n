/**
 * MockDataStorageService — Persists mock execution outputs as workflow pin data (TRUST-45).
 *
 * After a mock execution, maps nodeResults → ISimplifiedPinData format and
 * writes to the workflow entity. On re-execution, the engine automatically
 * skips runNode() for pinned nodes, using the cached data instead.
 * Logic nodes (Code, Set, Filter, IF, Switch) still execute their real code
 * against the pinned data.
 *
 * Pin data format: { [nodeName]: Array<{ json: IDataObject }> }
 * Stored as a JSON column on WorkflowEntity.
 */

import type { InstanceAiEvalExecutionResult, InstanceAiEvalNodeResult } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { WorkflowRepository } from '@n8n/db';
import type { ISimplifiedPinData } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IDataObject } from 'n8n-workflow';

// ---------------------------------------------------------------------------
// Type guard
// ---------------------------------------------------------------------------

/** Check whether a value looks like an INodeExecutionData item (has a `json` object property) */
function isExecutionDataItem(item: unknown): item is { json: IDataObject } {
	if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
	const record = item as Record<string, unknown>;
	return typeof record.json === 'object' && record.json !== null && !Array.isArray(record.json);
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

@Service()
export class MockDataStorageService {
	constructor(
		private readonly workflowRepository: WorkflowRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Persist mocked/pinned node outputs as pin data on the workflow.
	 *
	 * Only nodes with executionMode 'mocked' or 'pinned' are persisted — logic
	 * nodes ('real') should re-execute their actual code against the pinned data.
	 *
	 * @returns true if pin data was written successfully
	 * @throws if the database write fails — callers decide how to handle
	 */
	async persistAsPinData(
		workflowId: string,
		executionResult: InstanceAiEvalExecutionResult,
	): Promise<boolean> {
		const pinData = this.buildPinData(executionResult.nodeResults);

		if (Object.keys(pinData).length === 0) {
			this.logger.debug('[EvalStorage] No mocked/pinned nodes with output — nothing to persist');
			return false;
		}

		await this.workflowRepository.update(workflowId, { pinData });

		this.logger.debug(
			`[EvalStorage] Persisted pin data for ${Object.keys(pinData).length} nodes on workflow ${workflowId}`,
		);
		return true;
	}

	// ── Pin data builder ──────────────────────────────────────────────────

	/**
	 * Map execution node results to ISimplifiedPinData format.
	 * Only includes mocked and pinned nodes that have output data.
	 */
	private buildPinData(nodeResults: Record<string, InstanceAiEvalNodeResult>): ISimplifiedPinData {
		const pinData: ISimplifiedPinData = {};

		for (const [nodeName, nr] of Object.entries(nodeResults)) {
			// Only persist mocked/pinned nodes — logic nodes should re-execute
			if (nr.executionMode !== 'mocked' && nr.executionMode !== 'pinned') continue;

			// Skip nodes with no output
			if (nr.output === null || nr.output === undefined) continue;

			const items = this.normalizeOutput(nr.output);
			if (items.length > 0) {
				pinData[nodeName] = items;
			}
		}

		return pinData;
	}

	/**
	 * Normalize node output to the ISimplifiedPinData item format.
	 * Node output from the execution result is INodeExecutionData[] — each item
	 * has at minimum a `json` property with an IDataObject.
	 */
	private normalizeOutput(output: unknown): Array<{ json: IDataObject }> {
		if (!Array.isArray(output)) return [];

		const items: Array<{ json: IDataObject }> = [];

		for (const item of output) {
			if (isExecutionDataItem(item)) {
				items.push({ json: item.json });
			}
		}

		return items;
	}
}
