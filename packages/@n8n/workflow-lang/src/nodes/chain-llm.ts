/**
 * Compiled library node: a native form of `@n8n/n8n-nodes-langchain.chainLlm`
 * ("Basic LLM Chain") with its chat model sub-node.
 *
 * The v1 node is built on LangChain classes. This node does the same work with
 * plain data: it builds the messages from the prompt and the message list, sends
 * one request to the model provider for each item, and reads the text of the answer.
 *
 * The converter (`src/convert/ai-cluster.ts`) gives the parameters of each input item
 * in `batch`, with the model sub-node in `aiModel`, and the credential of the model as
 * the credential. The node runs once for all items, as v1 does: from version 1.7 the
 * items run in batches, and a batch sends all its requests before a failure stops it.
 *
 * The result is one object: `items` (the output items; under "continue on fail" an
 * item that failed is `{ error }`), `runs` (the runs of the model sub-node, with the
 * error of a run that failed), and `error` (the message, when the node fails). The
 * node does not throw for a failure of its own, so the caller can trace the runs of
 * the model before it throws the error.
 *
 * Supported: the prompt as text, the system, AI and user text messages, and the
 * chat model `lmChatOpenAi` (versions 1 to 1.3: Chat Completions API and Responses
 * API) with the options that map to fields of the request body.
 * Not supported (the converter keeps these in the fallback host): an output
 * parser, a fallback model, image messages, the JSON response format, the reasoning
 * effort, built-in tools, a custom base URL of the model node, and other model providers.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface MessageValue {
	type?: string;
	message?: string;
}

interface ModelOptions {
	temperature?: number;
	maxTokens?: number;
	topP?: number;
	frequencyPenalty?: number;
	presencePenalty?: number;
	maxRetries?: number;
}

interface AiModel {
	provider?: string;
	/** True when the model node asks for the Responses API (version 1.3). */
	responses?: boolean;
	model?: string;
	options?: ModelOptions;
}

/** The parameters of the chain for one input item. */
interface ItemParameters {
	text?: unknown;
	messages?: { messageValues?: MessageValue[] };
}

interface ChainParameters {
	/** The version of the v1 node: batches start with version 1.7. */
	nodeVersion?: number;
	batchSize?: number;
	delayBetweenBatches?: number;
	/** True under a "continue" error setting: an item that fails gives `{ error }`. */
	continueOnFail?: boolean;
	/** The chat model sub-node. v1 reads its parameters for the first input item only. */
	aiModel?: AiModel;
	batch?: ItemParameters[];
}

/** The outcome of one item: the output item, or the error message. */
interface Outcome {
	item?: Item;
	error?: string;
}

interface ChatMessage {
	role: string;
	content: string;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDigit(char: string | undefined): boolean {
	return char !== undefined && char >= '0' && char <= '9';
}

function messageOf(error: unknown): string {
	return isObject(error) && typeof error.message === 'string' ? error.message : String(error);
}

/** isReasoningModel of @langchain/openai. */
function isReasoningModel(model: string): boolean {
	if (model.startsWith('o') && isDigit(model[1])) return true;
	return model.startsWith('gpt-5') && !model.startsWith('gpt-5-chat');
}

/** _modelPrefersResponsesAPI of @langchain/openai. */
function prefersResponses(model: string): boolean {
	return model.includes('gpt-5.2-pro') || model.includes('gpt-5.4-pro') || model.includes('codex');
}

/** The prompt as the text that the v1 node gives to the prompt template. */
function promptText(value: unknown): string {
	if (typeof value === 'string') return value;
	if (typeof value === 'object' && value !== null) return JSON.stringify(value);
	return String(value);
}

const ROLES: Record<string, string> = {
	SystemMessagePromptTemplate: 'system',
	AIMessagePromptTemplate: 'assistant',
	HumanMessagePromptTemplate: 'user',
};

/** The messages of the v1 prompt template: the message list, then the prompt as a user message. */
function chatMessages(parameters: ItemParameters, model: string): ChatMessage[] {
	const reasoning = isReasoningModel(model);
	const out: ChatMessage[] = [];
	for (const value of parameters.messages?.messageValues ?? []) {
		const role = ROLES[value.type ?? 'SystemMessagePromptTemplate'];
		if (role === undefined) throw new Error('Invalid message type');
		out.push({
			role: role === 'system' && reasoning ? 'developer' : role,
			content: value.message ?? '',
		});
	}
	out.push({ role: 'user', content: promptText(parameters.text) });
	return out;
}

const STATUS_MESSAGES: Record<string, string> = {
	'400': 'Bad request - please check your parameters',
	'401': 'Authorization failed - please check your credentials',
	'402': 'Payment required - perhaps check your payment details?',
	'403': 'Forbidden - perhaps check your credentials?',
	'404': 'The resource you are requesting could not be found',
	'405': 'Method not allowed - please check you are using the right HTTP method',
};

const RATE_LIMIT_MESSAGES: Record<string, string> = {
	insufficient_quota:
		'Insufficient quota detected. <a href="https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.openai/common-issues/#insufficient-quota" target="_blank">Learn more</a> about resolving this issue',
	rate_limit_exceeded: 'OpenAI: Rate limit reached',
};

/** Statuses that LangChain does not try again (STATUS_NO_RETRY of its AsyncCaller). */
const NO_RETRY = [400, 401, 402, 403, 404, 405, 406, 407, 409, 413];

/** The message of the error of the OpenAI client for a failed request (APIError.makeMessage). */
function clientMessage(status: number, body: unknown): string {
	const error = isObject(body) ? body.error : undefined;
	let message: string | undefined;
	if (isObject(error) && error.message) {
		message = typeof error.message === 'string' ? error.message : JSON.stringify(error.message);
	} else if (error) {
		message = JSON.stringify(error);
	} else if (typeof body === 'string' && body !== '') {
		message = body;
	}
	return message ? `${status} ${message}` : `${status} status code (no body)`;
}

/** The message of the error of the v1 model node for a failed request. */
function failure(status: number, body: unknown): string {
	if (status === 429) {
		const error = isObject(body) ? body.error : undefined;
		const code = isObject(error) && typeof error.code === 'string' ? error.code : '';
		return RATE_LIMIT_MESSAGES[code] ?? RATE_LIMIT_MESSAGES.rate_limit_exceeded;
	}
	if (NO_RETRY.includes(status)) {
		return (
			STATUS_MESSAGES[String(status)] ??
			'Your request is invalid or could not be processed by the service'
		);
	}
	return clientMessage(status, body);
}

/** The wait of LangChain's caller before try `attempt + 1` (p-retry with `randomize`). */
function retryWait(random: number, attempt: number): number {
	let factor = 1;
	for (let k = 1; k < attempt; k++) factor *= 2;
	return Math.round((random + 1) * 1000 * factor);
}

/** The text of a Chat Completions answer: the work of the model run in v1. */
function completionText(data: unknown): string {
	const choices = isObject(data) && Array.isArray(data.choices) ? data.choices : [];
	if (choices.length === 0) {
		throw new Error(
			`Received empty response from chat model call (no choices). Response body: ${JSON.stringify(data)}`,
		);
	}
	const first: unknown = choices[0];
	const message = isObject(first) ? first.message : undefined;
	const content = isObject(message) ? message.content : undefined;
	if (typeof content === 'string') return content;
	if (content === undefined || content === null) return '';
	throw new Error('OpenAI chat model: the content of the answer is not text');
}

/** One content part of a Responses answer, as LangChain keeps it in the message. */
function responsePart(part: Record<string, unknown>): Record<string, unknown> | undefined {
	if (part.type === 'output_text') {
		if (!Array.isArray(part.annotations)) {
			throw new Error("Cannot read properties of undefined (reading 'map')");
		}
		return { type: 'text', text: part.text };
	}
	if (part.type === 'refusal') return undefined;
	return part;
}

/** The content parts of a Responses answer: the work of the model run in v1. */
function responseParts(data: unknown): Array<Record<string, unknown>> {
	if (!isObject(data)) throw new Error('OpenAI chat model: the answer is not an object');
	if (isObject(data.error)) throw new Error(String(data.error.message));
	if (!Array.isArray(data.output)) {
		throw new Error("Cannot read properties of undefined (reading 'map')");
	}
	const parts: Array<Record<string, unknown>> = [];
	for (const item of data.output) {
		if (!isObject(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
		for (const part of item.content) {
			const kept = isObject(part) ? responsePart(part) : undefined;
			if (kept !== undefined) parts.push(kept);
		}
	}
	return parts;
}

/** The text of one content part, as the string output parser of LangChain reads it. */
function partText(part: Record<string, unknown>): string {
	if (part.type === 'reasoning' || part.type === 'thinking' || part.type === 'redacted_thinking') {
		return '';
	}
	if ((part.type === 'text' || part.type === 'text_delta') && part.text !== undefined) {
		return String(part.text);
	}
	if (part.type === 'image_url' && part.image_url !== undefined) {
		throw new Error('Cannot coerce a multimodal "image_url" message part into a string.');
	}
	if (part.type === 'text' || part.type === 'text_delta' || part.type === 'image_url') {
		throw new Error(`Invalid content type: ${String(part.type)}`);
	}
	throw new Error(`Cannot coerce "${String(part.type)}" message part into a string.`);
}

/** The request body of the item, and true when it goes to the Responses API. */
function requestOf(
	item: ItemParameters,
	ai: AiModel,
): { responses: boolean; body: Record<string, unknown> } {
	const options = ai.options ?? {};
	const maxTokens = options.maxTokens === -1 ? undefined : options.maxTokens;
	const model = ai.model ?? '';
	const messages = chatMessages(item, model);
	if (ai.responses === true || prefersResponses(model)) {
		return {
			responses: true,
			body: {
				input: messages.map((m) => ({ type: 'message', role: m.role, content: m.content })),
				model,
				temperature: options.temperature,
				top_p: options.topP,
				stream: false,
				text: {},
				max_output_tokens: maxTokens,
			},
		};
	}
	const body: Record<string, unknown> = {
		model,
		temperature: options.temperature,
		top_p: options.topP,
		frequency_penalty: options.frequencyPenalty,
		presence_penalty: options.presencePenalty,
		stream: false,
		messages,
	};
	if (isReasoningModel(model)) body.max_completion_tokens = maxTokens;
	else body.max_tokens = maxTokens;
	return { responses: false, body };
}

export default defineNode<ChainParameters>({
	type: '@n8n/n8n-nodes-langchain.chainLlm',
	version: 1.9,
	supports: {
		operations: {
			default: [
				'nodeVersion',
				'batchSize',
				'delayBetweenBatches',
				'continueOnFail',
				'aiModel',
				'batch',
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		const batch = parameters.batch ?? [];
		const ai = parameters.aiModel ?? {};
		const runs: Array<{ error: string | null }> = [];
		// True when the credential has an organization (the flag `f0a11c001` of
		// `src/convert/ai-cluster.ts`). The credential type then injects a header that the
		// LangChain client does not send, so the request names the key itself.
		const hasOrganization = ctx.credentialFlag(credential, 'f0a11c001');
		const items: Item[] = [];
		const size = parameters.batchSize ?? 5;
		const delay = parameters.delayBetweenBatches ?? 0;
		const step = (parameters.nodeVersion ?? 1.9) >= 1.7 && size > 1 ? size : 1;
		for (let start = 0; start < batch.length; start += step) {
			// v1 starts the requests of a batch together, so all of them run before a failure counts.
			const outcomes: Outcome[] = [];
			for (const item of batch.slice(start, start + step)) {
				if (ai.provider !== 'openAi') {
					outcomes.push({
						error: 'Basic LLM Chain: the chat model is not in the compiled library',
					});
					continue;
				}
				// An expression that finds no value gives undefined, as in v1.
				if (item.text === undefined) {
					outcomes.push({ error: 'No prompt specified' });
					continue;
				}
				const request = requestOf(item, ai);
				const tries = (ai.options?.maxRetries ?? 2) + 1;
				// v1 records the run of the model when the request starts.
				const run: { error: string | null } = { error: null };
				runs.push(run);
				let data: unknown;
				for (let attempt = 1; run.error === null; attempt++) {
					const response = await ctx.http<unknown>({
						method: 'POST',
						url: request.responses
							? '{{$credentials.url}}/responses'
							: '{{$credentials.url}}/chat/completions',
						headers: hasOrganization
							? {
									authorization: 'Bearer {{$credentials.apiKey}}',
									'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ',
								}
							: { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' },
						qs: {},
						body: request.body,
						credential,
						inject: !hasOrganization,
					});
					if (response.status < 400) {
						data = response.body;
						break;
					}
					const final = response.status === 429 || NO_RETRY.includes(response.status);
					if (final || attempt >= tries) {
						run.error = failure(response.status, response.body);
					} else {
						await ctx.wait({ duration: retryWait(ctx.random(), attempt) });
					}
				}
				if (run.error !== null) {
					outcomes.push({ error: run.error });
					continue;
				}
				let parts: Array<Record<string, unknown>> = [];
				try {
					if (request.responses) parts = responseParts(data);
					else parts = [{ type: 'text', text: completionText(data) }];
				} catch (error) {
					run.error = messageOf(error);
					outcomes.push({ error: run.error });
					continue;
				}
				// The string output parser of the chain works after the run of the model.
				try {
					let text = '';
					for (const part of parts) text += partText(part);
					outcomes.push({ item: { text: text.trim() } });
				} catch (error) {
					outcomes.push({ error: messageOf(error) });
				}
			}
			for (const outcome of outcomes) {
				if (outcome.item !== undefined) {
					items.push(outcome.item);
				} else if (parameters.continueOnFail === true) {
					items.push({ error: outcome.error });
				} else {
					return [{ items: [], runs, error: outcome.error }];
				}
			}
			if (step > 1 && start + step < batch.length && delay > 0) {
				await ctx.wait({ duration: delay });
			}
		}
		return [{ items, runs }];
	},
});
