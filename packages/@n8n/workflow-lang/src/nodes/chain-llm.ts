/**
 * Compiled library node: a native form of `@n8n/n8n-nodes-langchain.chainLlm`
 * ("Basic LLM Chain") with its chat model sub-node.
 *
 * The v1 node is built on LangChain classes. This node does the same work with
 * plain data: it builds the messages from the prompt and the message list, sends
 * one request to the model provider for each item, and reads the text of the answer.
 *
 * The converter gives the model sub-node in the parameter `aiModel` (see
 * `src/convert/ai-cluster.ts`), and the credential of the model as the credential.
 *
 * Supported: the prompt as text, the system, AI and user text messages, and the
 * chat model `lmChatOpenAi` (versions 1 to 1.3: Chat Completions API and Responses
 * API) with the options that map to fields of the request body.
 * Not supported (the converter keeps these in the fallback host): an output
 * parser, a fallback model, image messages, the JSON response format, the reasoning
 * effort, built-in tools, a custom base URL of the model node, and other model providers.
 *
 * A prompt that is the JSON value null fails with "No prompt specified", as a prompt
 * without a value does. v1 sends the text "null" for it.
 *
 * Failures: v1 waits between the tries of a request that the provider can serve
 * later (status 408, 5xx). This node sends the tries without the wait.
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

interface ChainParameters {
	text?: unknown;
	messages?: { messageValues?: MessageValue[] };
	aiModel?: AiModel;
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
function chatMessages(parameters: ChainParameters, model: string): ChatMessage[] {
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

/** The error of the v1 model node for a failed request. */
function failure(status: number, body: unknown): Error {
	if (status === 429) {
		const error = isObject(body) ? body.error : undefined;
		const code = isObject(error) && typeof error.code === 'string' ? error.code : '';
		return new Error(RATE_LIMIT_MESSAGES[code] ?? RATE_LIMIT_MESSAGES.rate_limit_exceeded);
	}
	if (NO_RETRY.includes(status)) {
		return new Error(
			STATUS_MESSAGES[String(status)] ??
				'Your request is invalid or could not be processed by the service',
		);
	}
	return new Error(clientMessage(status, body));
}

/** The text of a Chat Completions answer, as the string output parser of LangChain reads it. */
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

/** The text of one content part of a Responses answer. */
function partText(part: Record<string, unknown>): string {
	if (part.type === 'output_text') {
		if (!Array.isArray(part.annotations)) {
			throw new Error("Cannot read properties of undefined (reading 'map')");
		}
		return typeof part.text === 'string' ? part.text : '';
	}
	if (part.type === 'refusal') return '';
	if (part.type === 'reasoning' || part.type === 'thinking' || part.type === 'redacted_thinking') {
		return '';
	}
	if ((part.type === 'text' || part.type === 'text_delta') && typeof part.text === 'string') {
		return part.text;
	}
	if (part.type === 'image_url') {
		throw new Error('Cannot coerce a multimodal "image_url" message part into a string.');
	}
	throw new Error(`Cannot coerce "${String(part.type)}" message part into a string.`);
}

/** The text of a Responses answer, as the string output parser of LangChain reads it. */
function responseText(data: unknown): string {
	if (!isObject(data)) throw new Error('OpenAI chat model: the answer is not an object');
	if (isObject(data.error)) throw new Error(String(data.error.message));
	if (!Array.isArray(data.output)) {
		throw new Error("Cannot read properties of undefined (reading 'map')");
	}
	let text = '';
	for (const item of data.output) {
		if (!isObject(item) || item.type !== 'message' || !Array.isArray(item.content)) continue;
		for (const part of item.content) if (isObject(part)) text += partText(part);
	}
	return text;
}

export default defineNode<ChainParameters>({
	type: '@n8n/n8n-nodes-langchain.chainLlm',
	version: 1.9,
	supports: {
		operations: {
			default: ['text', 'messages', 'aiModel'],
		},
	},
	async run(ctx, parameters, items, credential) {
		const ai = parameters.aiModel ?? {};
		if (ai.provider !== 'openAi') {
			throw new Error('Basic LLM Chain: the chat model is not in the compiled library');
		}
		const options = ai.options ?? {};
		const maxTokens = options.maxTokens === -1 ? undefined : options.maxTokens;
		const tries = (options.maxRetries ?? 2) + 1;
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			// An expression that finds no value gives null here; in v1 it gives undefined.
			if (parameters.text === undefined || parameters.text === null) {
				throw new Error('No prompt specified');
			}
			const model = ai.model ?? '';
			const messages = chatMessages(parameters, model);
			const responses = ai.responses === true || prefersResponses(model);
			let body: Record<string, unknown>;
			if (responses) {
				body = {
					input: messages.map((m) => ({ type: 'message', role: m.role, content: m.content })),
					model,
					temperature: options.temperature,
					top_p: options.topP,
					stream: false,
					text: {},
					max_output_tokens: maxTokens,
				};
			} else {
				body = {
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
			}
			let data: unknown;
			for (let attempt = 1; ; attempt++) {
				const response = await ctx.http<unknown>({
					method: 'POST',
					url: responses
						? '{{$credentials.url}}/responses'
						: '{{$credentials.url}}/chat/completions',
					headers: {
						authorization: 'Bearer {{$credentials.apiKey}}',
						'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ',
					},
					qs: {},
					body,
					credential,
					inject: false,
				});
				if (response.status < 400) {
					data = response.body;
					break;
				}
				const final = response.status === 429 || NO_RETRY.includes(response.status);
				if (final || attempt >= tries) throw failure(response.status, response.body);
			}
			const text = responses ? responseText(data) : completionText(data);
			out.push({ text: text.trim() });
		}
		return out;
	},
});
