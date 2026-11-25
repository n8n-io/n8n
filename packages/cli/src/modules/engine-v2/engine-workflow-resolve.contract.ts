import { jsonObjectSchema, triggerOutputsSchema, workflowGraphSchema } from '@n8n/engine';
import type { JsonValue, TriggerOutputs, WorkflowDocument, WorkflowGraph } from '@n8n/engine';
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

/** A sub-workflow that a step calls. */
const subWorkflowRequestSchema = z.object({
	kind: z.literal('sub-workflow'),
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

const stepErrorSchema = z.object({
	name: z.string(),
	message: z.string(),
	stack: z.string().optional(),
	// The body parser produced it, so it is JSON. Only the executor reads into it.
	details: z.custom<JsonValue>().optional(),
});

/** The execution that failed, as the engine describes it. */
const errorWorkflowSourceSchema = z.object({
	executionId: z.string().uuid(),
	workflowId: z.string().min(1),
	/** The workflow document captured at start. The settings and the nodes come from it. */
	workflow: jsonObjectSchema,
	/** The v1 mode that the host stored in the caller context at start. */
	hostMode: z.enum(WorkflowExecuteModeList),
	hasParent: z.boolean(),
	failedStep: z.object({ nodeName: z.string().min(1), error: stepErrorSchema }).optional(),
});

/** The error workflow of an execution that failed. */
const errorWorkflowRequestSchema = z.object({
	kind: z.literal('error-workflow'),
	/** The error execution's id, minted by the caller, so the trigger runs under it. */
	executionId: z.string().uuid(),
	source: errorWorkflowSourceSchema,
});

/** Schema for a request to resolve a workflow that the data plane starts. */
export const resolveWorkflowRequestSchema = z.discriminatedUnion('kind', [
	subWorkflowRequestSchema,
	errorWorkflowRequestSchema,
]);

/** A request as the control plane reads it, after validation. */
export type ResolveWorkflowRequest = z.infer<typeof resolveWorkflowRequestSchema>;
export type ResolveSubWorkflowRequest = Extract<ResolveWorkflowRequest, { kind: 'sub-workflow' }>;
export type ResolveErrorWorkflowRequest = Extract<
	ResolveWorkflowRequest,
	{ kind: 'error-workflow' }
>;
export type ResolveWorkflowKind = ResolveWorkflowRequest['kind'];

/** A request as the data plane sends it. */
export type ResolveWorkflowCall = ResolveWorkflowRequest;

/** What every start of a resolved workflow needs. */
interface ResolvedWorkflow {
	workflowId: string;
	graph: WorkflowGraph;
	workflow: WorkflowDocument;
	triggerOutputs: TriggerOutputs | null;
	/** Whether a failure of the new execution resolves an error workflow. */
	resolveErrorWorkflowOnFailure: boolean;
}

export interface ResolvedSubWorkflow extends ResolvedWorkflow {
	kind: 'sub-workflow';
	/** The trigger's "Items to Return" option, which the caller applies to the sub-execution's result. */
	returnLastRunOnly: boolean;
}

export interface ResolvedErrorWorkflow extends ResolvedWorkflow {
	kind: 'error-workflow';
	/**
	 * The project that the error execution runs in: the project of the failed
	 * workflow, as in v1. A sub-execution keeps the caller context of its parent
	 * instead, so only this kind returns a project.
	 */
	projectId: string;
}

/** Response of `POST /internal/workflows/resolve`. Its kind is the kind of the request. */
export type ResolveWorkflowResponse = ResolvedSubWorkflow | ResolvedErrorWorkflow;

/** The response to a request of the given kind. */
export type ResolveWorkflowResponseFor<K extends ResolveWorkflowKind> = Extract<
	ResolveWorkflowResponse,
	{ kind: K }
>;

// The engine defaults a missing edge index to 0 when it parses a start request.
// A resolve guard returns the body unparsed, so the indices must be present.
const slotIndexSchema = z.number().int().nonnegative();
/** A graph as the engine's start route would accept it, with every slot index present. */
const resolvedGraphSchema = workflowGraphSchema.extend({
	edges: z.array(
		workflowGraphSchema.shape.edges.element.extend({
			outputIndex: slotIndexSchema,
			inputIndex: slotIndexSchema,
		}),
	),
});

const resolvedWorkflowFields = {
	workflowId: z.string().min(1),
	graph: resolvedGraphSchema,
	workflow: jsonObjectSchema,
	triggerOutputs: triggerOutputsSchema.nullable(),
	resolveErrorWorkflowOnFailure: z.boolean(),
};

/** The response as the engine's start would accept it. */
const resolveWorkflowResponseSchema = z.discriminatedUnion('kind', [
	z.object({
		kind: z.literal('sub-workflow'),
		...resolvedWorkflowFields,
		returnLastRunOnly: z.boolean(),
	}),
	z.object({
		kind: z.literal('error-workflow'),
		...resolvedWorkflowFields,
		projectId: z.string().min(1),
	}),
]);

/** Narrows a parsed response body to the kind of the request. The client trusts nothing else about it. */
export function isResolveWorkflowResponse<K extends ResolveWorkflowKind>(
	kind: K,
	body: unknown,
): body is ResolveWorkflowResponseFor<K> {
	const parsed = resolveWorkflowResponseSchema.safeParse(body);
	return parsed.success && parsed.data.kind === kind;
}
