import { jsonObjectSchema, triggerOutputsSchema, workflowGraphSchema } from '@n8n/engine';
import type { TriggerOutputs, WorkflowDocument, WorkflowGraph } from '@n8n/engine';
import { isRecord } from '@n8n/utils/is-record';
import { WorkflowExecuteModeList } from 'n8n-workflow';
import type { IBinaryData, INodeExecutionData } from 'n8n-workflow';
import { z } from 'zod';

/** On the data plane, binary data is a reference into the binary data store, never the bytes. */
function isStoredBinary(value: unknown): value is IBinaryData {
	return (
		isRecord(value) &&
		typeof value.id === 'string' &&
		value.id !== '' &&
		typeof value.mimeType === 'string'
	);
}

/** An item as the node hands it over: `json` is required, `binary` holds stored references. */
function isNodeExecutionData(value: unknown): value is INodeExecutionData {
	if (!isRecord(value) || !isRecord(value.json)) return false;
	if (value.binary === undefined) return true;
	return isRecord(value.binary) && Object.values(value.binary).every(isStoredBinary);
}

/** Schema for a request to resolve a sub-workflow definition. */
export const resolveSubWorkflowRequestSchema = z.object({
	/** The sub-workflow, by id. The inline, file and URL sources are not served. */
	workflowId: z.string().min(1),
	/** The sub-execution's id, minted by the caller, so the trigger runs under it. */
	executionId: z.string().uuid(),
	parent: z.object({
		/** An engine execution id. No control plane execution row exists for it. */
		executionId: z.string().uuid(),
		workflowId: z.string().min(1),
		/** The v1 mode: a manual or chat run calls the draft, any other the published version. */
		mode: z.enum(WorkflowExecuteModeList),
		/** The node that calls the sub-workflow, named in a policy denial. */
		node: z.object({
			id: z.string(),
			name: z.string(),
			type: z.string(),
			typeVersion: z.number(),
		}),
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

/** Response of `POST /internal/sub-workflows/resolve`: what a sub-execution start needs. */
export interface ResolveSubWorkflowResponse {
	workflowId: string;
	graph: WorkflowGraph;
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
	/** The trigger's "Items to Return" option, which the caller applies to the sub-execution's result. */
	returnLastRunOnly: boolean;
}

// The engine defaults a missing edge index to 0 when it parses a start request.
// This guard returns the body unparsed, so the indices must be present.
const slotIndexSchema = z.number().int().nonnegative();
const graphSchema = workflowGraphSchema.extend({
	edges: z.array(
		workflowGraphSchema.shape.edges.element.extend({
			outputIndex: slotIndexSchema,
			inputIndex: slotIndexSchema,
		}),
	),
});

/** The response as the engine's start route would accept it. */
const resolveSubWorkflowResponseSchema = z.object({
	workflowId: z.string().min(1),
	graph: graphSchema,
	workflow: jsonObjectSchema,
	triggerOutputs: triggerOutputsSchema.nullable(),
	returnLastRunOnly: z.boolean(),
});

/** Narrows a parsed response body. The client trusts nothing else about it. */
export function isResolveSubWorkflowResponse(body: unknown): body is ResolveSubWorkflowResponse {
	return resolveSubWorkflowResponseSchema.safeParse(body).success;
}
