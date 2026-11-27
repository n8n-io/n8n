import {
	toWorkflowSnapshot,
	type WorkflowRunDocument,
	type WorkflowSnapshot,
} from '@n8n/backend-services';
import type { TriggerOutputs, WorkflowDocument, WorkflowGraph } from '@n8n/engine';
import type { INodeExecutionData, INodeTypes, IPinData, IWorkflowBase } from 'n8n-workflow';

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
	pinData,
	nodeTypes,
}: {
	workflowData: IWorkflowBase;
	/** The workflow the graph is built from, when a plan rewrote it. */
	graphSource?: IWorkflowBase;
	/** Stored with the workflow, so an execution read can mark the pinned nodes. */
	pinData?: IPinData;
	/** Absent when no trigger is named; the converter then takes the sole one. */
	triggerName?: string;
	triggerOutputs: INodeExecutionData[][];
	allowNonTriggerRoot?: boolean;
	/** For the idempotency annotation of each node, which the graph records. */
	nodeTypes: INodeTypes;
}): Promise<EngineWorkflowPayload> {
	// Lazily imported: a top-level import would pull the v1 step executor and
	// its dependencies into every n8n process, including ones with the module off.
	const { V1WorkflowConverter, createIdempotencyResolver, toStepOutputs } = await import(
		'@n8n/node-engine-compatibility'
	);
	const slots = toStepOutputs(triggerOutputs);

	return {
		graph: new V1WorkflowConverter().convert(graphSource, triggerName, {
			allowNonTriggerRoot,
			isIdempotent: createIdempotencyResolver(nodeTypes),
		}),
		workflow: toWorkflowDocument(workflowData, pinData),
		// The wire schema rejects an empty array; `null` is how "no slots" is sent.
		triggerOutputs: slots.length === 0 ? null : slots,
	};
}

/**
 * The workflow snapshot, shaped for the engine v2 start request. The data plane
 * stores it beside the execution and reports it back, without reading into it,
 * so it crosses the boundary as plain JSON. The cast is unavoidable: the engine
 * has no `n8n-workflow` dependency, and `INode` and friends are interfaces, so
 * they never gain the index signature `JsonObject` asks for.
 */
function toWorkflowDocument(workflow: WorkflowSnapshot, pinData?: IPinData): WorkflowDocument {
	const document: WorkflowRunDocument = toWorkflowSnapshot(workflow);
	if (pinData !== undefined) document.pinData = pinData;
	return document as unknown as WorkflowDocument;
}
