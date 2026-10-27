import {
	NodeConnectionTypes,
	NodeHelpers,
	type INode,
	type IWorkflowExecuteAdditionalData,
	type Workflow,
} from 'n8n-workflow';
import { AsyncLocalStorage } from 'node:async_hooks';
import { pipeline, Readable, Transform } from 'node:stream';

import {
	buildLlmUsageNodeContext,
	type LlmResponseInspector,
	type LlmUsageRun,
} from '../../../llm-usage-context';

/** The node that sends a request, and its run. */
export interface LlmUsageCaptureTarget {
	workflow: Workflow;
	node: INode;
	additionalData: IWorkflowExecuteAdditionalData;
	llmUsageRun?: LlmUsageRun;
	/** The credential type that the helper authenticates with, when it is known. */
	credentialType?: string;
}

const isFullResponse = (
	value: unknown,
): value is { body: unknown; statusCode: number; headers?: Record<string, unknown> } =>
	typeof value === 'object' && value !== null && 'body' in value && 'statusCode' in value;

/**
 * Only JSON and event streams carry usage. Any other stream, such as audio or an image, is
 * left as it is: a node can read properties of the original response stream.
 */
const carriesUsage = (headers: Record<string, unknown> | undefined) => {
	const contentType = headers?.['content-type'];
	return typeof contentType === 'string' && /json|text\/event-stream/i.test(contentType);
};

/**
 * Set while a captured request is sent. A helper can send through other helpers (OAuth signing
 * sends through `request`), and only the outer one reports the call.
 */
const captureInProgress = new AsyncLocalStorage<true>();

/** Runs `fn` and ignores its errors: capture must never fail a request or a stream. */
const safely = (fn: () => void) => {
	try {
		fn();
	} catch {}
};

/** Passes the stream through unchanged and hands each chunk to the inspector. Keeps no data. */
function tap(source: Readable, inspector: LlmResponseInspector) {
	const observer = new Transform({
		transform(chunk: Buffer | string, _encoding, done) {
			safely(() => inspector.onStreamChunk(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
			done(null, chunk);
		},
		flush(done) {
			safely(() => inspector.onStreamEnd());
			done();
		},
	});
	// `pipeline` forwards a source error to the consumer, `pipe` would leave it waiting.
	return pipeline(source, observer, () => {});
}

/**
 * Returns true for a language-model sub-node. LangChain already reports these nodes, so
 * capture skips their HTTP calls. `getNodeOutputs` resolves outputs that an expression defines.
 */
function outputsLanguageModel(workflow: Workflow, node: INode) {
	const description = workflow.nodeTypes.getByNameAndVersion(
		node.type,
		node.typeVersion,
	)?.description;
	if (!description) return false;
	return NodeHelpers.getNodeOutputs(workflow, node, description).some(
		(output) =>
			(typeof output === 'string' ? output : output.type) === NodeConnectionTypes.AiLanguageModel,
	);
}

function startInspection(
	{ workflow, node, additionalData, llmUsageRun, credentialType }: LlmUsageCaptureTarget,
	requestBody: unknown,
): LlmResponseInspector | undefined {
	try {
		const hooks = additionalData['llm-usage'];
		// An evaluation run with mocked LLM responses makes no real LLM calls.
		if (!hooks?.inspectRequest || additionalData.evalLlmMockHandler) return undefined;
		const inspector = hooks.inspectRequest({
			context: buildLlmUsageNodeContext(workflow, node, additionalData, llmUsageRun),
			credentialTypes: Object.keys(node.credentials ?? {}),
			credentials: node.credentials,
			credentialType,
			requestBody,
		});
		// Checked only for LLM calls: resolving the outputs can evaluate an expression.
		return inspector && !outputsLanguageModel(workflow, node) ? inspector : undefined;
	} catch {
		// An error here means "do not capture", never "do not send".
		return undefined;
	}
}

/**
 * Sends a node's HTTP request and, when it is an LLM call, hands the response to the
 * llm-usage module. The context comes from the arguments, not from a scope: task-runner
 * helper calls run outside the node's async context.
 */
export async function withLlmUsageCapture<T>(
	target: LlmUsageCaptureTarget,
	requestBody: unknown,
	send: () => Promise<T>,
): Promise<T> {
	if (captureInProgress.getStore()) return await send();
	const inspector = startInspection(target, requestBody);
	if (!inspector) return await send();
	// Outside `startInspection`: a capture error never blocks a request, but a check must.
	await inspector.check?.();

	const response = await captureInProgress.run(true, send);
	if (isFullResponse(response) && response.body instanceof Readable) {
		if (carriesUsage(response.headers)) response.body = tap(response.body, inspector);
	} else if (!(response instanceof Readable)) {
		// A bare stream is left alone: replacing it could drop properties the caller reads.
		safely(() => inspector.onResponse(isFullResponse(response) ? response.body : response));
	}
	return response;
}
