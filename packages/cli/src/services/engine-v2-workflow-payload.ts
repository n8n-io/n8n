import type { TriggerOutputs, WorkflowDocument, WorkflowGraph } from '@n8n/engine';
import type { INodeExecutionData, IWorkflowBase } from 'n8n-workflow';

import { toWorkflowDocument } from '@/executions/execution-data/types';

/** The part of an engine start that describes the workflow to run. */
export interface EngineWorkflowPayload {
	graph: WorkflowGraph;
	/** Sent alongside the graph, so an execution read can report the workflow that ran. */
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
}

/**
 * Converts a v1 workflow and its trigger's outputs into what the engine starts
 * from. The dispatcher and the sub-workflow resolve route both build this, so
 * the graph and trigger-output contracts are applied in one place.
 */
export async function toEngineWorkflowPayload({
	workflowData,
	graphSource = workflowData,
	triggerName,
	triggerOutputs,
	allowNonTriggerRoot = false,
}: {
	workflowData: IWorkflowBase;
	/** The workflow the graph is built from, when a plan rewrote it. */
	graphSource?: IWorkflowBase;
	/** Absent when no trigger is named; the converter then takes the sole one. */
	triggerName?: string;
	triggerOutputs: INodeExecutionData[][];
	allowNonTriggerRoot?: boolean;
}): Promise<EngineWorkflowPayload> {
	// Lazily imported: a top-level import would pull the v1 step executor and
	// its dependencies into every n8n process, including ones with the module off.
	const { V1WorkflowConverter, toStepOutputs } = await import('@n8n/node-engine-compatibility');
	const slots = toStepOutputs(triggerOutputs);

	return {
		graph: new V1WorkflowConverter().convert(graphSource, triggerName, { allowNonTriggerRoot }),
		workflow: toWorkflowDocument(workflowData),
		// The wire schema rejects an empty array; `null` is how "no slots" is sent.
		triggerOutputs: slots.length === 0 ? null : slots,
	};
}
