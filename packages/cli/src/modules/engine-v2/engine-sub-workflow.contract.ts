import type { TriggerOutputs, WorkflowDocument, WorkflowGraph } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import { WorkflowExecuteModeList } from 'n8n-workflow';
import type { INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod';

/** An item as the node hands it over: `json` is required, the rest rides along. */
function isNodeExecutionData(value: unknown): value is INodeExecutionData {
	return isRecord(value) && isRecord(value.json);
}

/**
 * Body of `POST /internal/sub-workflows/resolve`: the data plane asks the control
 * plane for the graph of a sub-workflow that a step calls, and for the trigger
 * outputs the parent's items become.
 *
 * The one definition of the body's shape. `ResolveSubWorkflowRequest` is
 * inferred from it, so the client and the controller cannot disagree.
 */
export const resolveSubWorkflowRequestSchema = z.object({
	/** The sub-workflow, by id. The inline, file and URL sources are not served. */
	workflowId: z.string().min(1),
	/** The child execution's id, minted by the caller, so the trigger runs under it. */
	executionId: z.string().uuid(),
	parent: z.object({
		/** An engine execution id. No control plane execution row exists for it. */
		executionId: z.string().min(1),
		workflowId: z.string().min(1),
		/** The v1 mode: a manual or chat run calls the draft, any other the published version. */
		mode: z.enum(WorkflowExecuteModeList),
		/** The node that calls the sub-workflow, named in a policy denial. */
		node: z
			.object({
				id: z.string(),
				name: z.string(),
				type: z.string(),
				typeVersion: z.number(),
			})
			.optional(),
	}),
	/** Who the parent runs for. Both are unknown until the host supplies them at start. */
	context: z.object({
		userId: z.string().min(1).optional(),
		projectId: z.string().min(1).optional(),
	}),
	/** The items the parent hands over, which the trigger maps onto its outputs. */
	items: z.array(z.custom<INodeExecutionData>(isNodeExecutionData)),
});

export type ResolveSubWorkflowRequest = z.infer<typeof resolveSubWorkflowRequestSchema>;

/** Response of `POST /internal/sub-workflows/resolve`: what a child start needs. */
export interface ResolveSubWorkflowResponse {
	workflowId: string;
	graph: WorkflowGraph;
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
	/** The trigger's "Items to Return" option, which the caller applies to the child's result. */
	returnLastRunOnly: boolean;
}

/** Narrows a parsed response body. The client trusts nothing else about it. */
export function isResolveSubWorkflowResponse(body: unknown): body is ResolveSubWorkflowResponse {
	if (!isRecord(body)) return false;
	const { workflowId, graph, workflow, triggerOutputs, returnLastRunOnly } = body;
	return (
		typeof workflowId === 'string' &&
		isRecord(graph) &&
		Array.isArray(graph.nodes) &&
		Array.isArray(graph.edges) &&
		isRecord(workflow) &&
		(triggerOutputs === null || Array.isArray(triggerOutputs)) &&
		typeof returnLastRunOnly === 'boolean'
	);
}
