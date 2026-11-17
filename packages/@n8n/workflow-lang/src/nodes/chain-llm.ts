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
 * The node is also the native form of the Tools Agent without tools, memory and output
 * parser (`kind: 'agent'`): that agent is one call of the model too. A library node is one
 * file, so the two roots share this file and its request builders.
 *
 * Supported: the prompt as text, the system, AI and user text messages, and the
 * chat models `lmChatOpenAi` (versions 1 to 1.3: Chat Completions API and Responses
 * API), `lmChatOpenRouter`, `lmChatAnthropic` (versions 1 to 1.5, without thinking
 * options) and `lmChatGoogleGemini` (versions 1 and 1.1), with the options that map to
 * fields of the request body.
 * The chain also takes the Structured Output Parser of versions 1.2 and 1.3 without
 * auto-fixing (`outputParser`): the converter gives the format instructions that v1 adds to
 * the prompt, and the shape that zod checks the answer with.
 * Not supported (the converter keeps these in the fallback host): other output
 * parsers, a fallback model, image messages, the JSON response format, the reasoning
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
	/** The Anthropic model. */
	topK?: number;
}

interface AiModel {
	provider?: string;
	/** True when the model node asks for the Responses API (version 1.3). */
	responses?: boolean;
	model?: string;
	options?: ModelOptions;
	/** The Gemini model: `options.safetySettings.values`. */
	safetySettings?: unknown[];
}

/** What zod checks for one value (`OutputShape` of `src/convert/ai-output-schema.ts`). */
interface OutputShape {
	kind: string;
	values?: string[];
	items?: OutputShape;
	keys?: string[];
	shapes?: OutputShape[];
	required?: boolean[];
	extra?: string;
}

/** The Structured Output Parser sub-node, as the converter writes it. */
interface OutputParser {
	instructions?: string;
	shape?: OutputShape;
	outputRequired?: boolean;
}

/** The parameters of the root for one input item. */
interface ItemParameters {
	text?: unknown;
	/** The chain: the message list. */
	messages?: { messageValues?: MessageValue[] };
	/** The agent: `options.systemMessage`. */
	systemMessage?: unknown;
}

interface ChainParameters {
	/**
	 * `agent`: the root is a Tools Agent (`@n8n/n8n-nodes-langchain.agent`, versions 2 to 3.1)
	 * without tools, memory and output parser. It is one call of the model, as the chain is,
	 * so the converter links this node for it. The default is the chain.
	 */
	kind?: string;
	/** The agent: `options.returnIntermediateSteps`. Without tools the list is empty. */
	returnIntermediateSteps?: boolean;
	/** The agent: `options.maxIterations`. It counts when the model calls a tool. */
	maxIterations?: number;
	/** The version of the v1 node: batches of the chain start with version 1.7. */
	nodeVersion?: number;
	batchSize?: number;
	delayBetweenBatches?: number;
	/** True under a "continue" error setting: an item that fails gives `{ error }`. */
	continueOnFail?: boolean;
	/** The chat model sub-node. v1 reads its parameters for the first input item only. */
	aiModel?: AiModel;
	/** The chain: the Structured Output Parser sub-node. */
	outputParser?: OutputParser;
	batch?: ItemParameters[];
}

/** The outcome of one item: the output item, or the error message. */
interface Outcome {
	item?: Item;
	error?: string;
	/** The description of `error`, when v1 gives one. */
	description?: string;
	/** The agent of version 3: the answer calls a tool, so the engine runs the node again. */
	again?: boolean;
}

/** The request of one item: the body, and true when it goes to the Responses API. */
interface ModelRequest {
	responses: boolean;
	body: Record<string, unknown>;
	/** True for the Messages API of Anthropic. */
	anthropic?: boolean;
	/** True for the generateContent API of Google Gemini. */
	gemini?: boolean;
	/** The request cannot go out: the error of the LangChain client, on the run of the model. */
	refused?: string;
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

/**
 * The messages of the v1 prompt template. The chain: the message list, then the prompt as a
 * user message. The agent: the system message when the option has a value, then the prompt.
 */
function chatMessages(
	parameters: ItemParameters,
	model: string,
	agent: boolean,
	instructions?: string,
): ChatMessage[] {
	const reasoning = isReasoningModel(model);
	const out: ChatMessage[] = [];
	if (agent) {
		const system = parameters.systemMessage;
		if (system) {
			out.push({
				role: reasoning ? 'developer' : 'system',
				content: typeof system === 'string' ? system : String(system),
			});
		}
		out.push({ role: 'user', content: promptText(parameters.text) });
		return out;
	}
	for (const value of parameters.messages?.messageValues ?? []) {
		const role = ROLES[value.type ?? 'SystemMessagePromptTemplate'];
		if (role === undefined) throw new Error('Invalid message type');
		out.push({
			role: role === 'system' && reasoning ? 'developer' : role,
			content: value.message ?? '',
		});
	}
	// With an output parser, the format instructions follow the prompt on a new line.
	const query = promptText(parameters.text);
	out.push({
		role: 'user',
		content: instructions === undefined ? query : `${query}\n${instructions}`,
	});
	return out;
}

const PARSER_EMPTY = 'The AI model returned an empty response to the Structured Output Parser';
const PARSER_EMPTY_DESCRIPTION =
	"This usually happens when the model runs out of tokens before it can generate the structured output. Try reducing the prompt length, increasing the model's max output tokens, or simplifying the output schema. To continue the execution when this happens, change the 'On Error' parameter in the root node's settings.";
const PARSER_FAILED = "Model output doesn't fit required format";
const PARSER_FAILED_DESCRIPTION =
	"To continue the execution when this happens, change the 'On Error' parameter in the root node's settings";

/** The first issue that zod finds: `empty` is a missing object, the test of v1 for an empty answer. */
interface Issues {
	first: string;
}

interface Checked {
	ok: boolean;
	value: unknown;
}

function refuse(issues: Issues, kind: string): Checked {
	if (issues.first === '') issues.first = kind;
	return { ok: false, value: undefined };
}

/**
 * The value as zod gives it for the shape. zod reads the keys of an object in the order of
 * the schema, then the other keys, so the result has that order. Only the first issue counts
 * for the error of v1, so the check stops there.
 */
function checkShape(shape: OutputShape, value: unknown, present: boolean, issues: Issues): Checked {
	const kind = shape.kind;
	if (kind === 'any') return { ok: true, value };
	if (!present) return refuse(issues, kind === 'object' || kind === 'record' ? 'empty' : 'other');
	if (kind === 'string' || kind === 'number' || kind === 'boolean') {
		return typeof value === kind ? { ok: true, value } : refuse(issues, 'other');
	}
	if (kind === 'integer') {
		return typeof value === 'number' && Number.isInteger(value)
			? { ok: true, value }
			: refuse(issues, 'other');
	}
	if (kind === 'null') return value === null ? { ok: true, value } : refuse(issues, 'other');
	if (kind === 'enum') {
		return typeof value === 'string' && (shape.values ?? []).includes(value)
			? { ok: true, value }
			: refuse(issues, 'other');
	}
	if (kind === 'array') {
		if (!Array.isArray(value)) return refuse(issues, 'other');
		const items = shape.items ?? { kind: 'any' };
		const list: unknown[] = [];
		for (const element of value) {
			const checked = checkShape(items, element, true, issues);
			if (!checked.ok) return checked;
			list.push(checked.value);
		}
		return { ok: true, value: list };
	}
	if (!isObject(value)) return refuse(issues, 'other');
	if (kind === 'record') return { ok: true, value };
	const keys = shape.keys ?? [];
	const shapes = shape.shapes ?? [];
	const required = shape.required ?? [];
	const out: Record<string, unknown> = {};
	for (let k = 0; k < keys.length; k++) {
		const key = keys[k];
		const child = value[key];
		const has = child !== undefined;
		if (!has && !required[k]) continue;
		const checked = checkShape(shapes[k], child, has, issues);
		if (!checked.ok) return checked;
		if (has) out[key] = checked.value;
	}
	if (shape.extra !== 'strip') {
		for (const key of Object.keys(value)) {
			if (keys.includes(key)) continue;
			if (shape.extra === 'strict') return refuse(issues, 'other');
			out[key] = value[key];
		}
	}
	return { ok: true, value: out };
}

/** The text between the first code fence of the answer and its end, or the text. */
function fencedJson(text: string): string {
	const lines = text.split('\n');
	let start = -1;
	let end = -1;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i].trim();
		if (start === -1 && (line === '```' || line === '```json')) {
			start = i;
		} else if (start !== -1 && line === '```') {
			end = i;
			break;
		}
	}
	return start !== -1 && end !== -1 ? lines.slice(start + 1, end).join('\n') : text;
}

/**
 * `parse` of the Structured Output Parser of v1 (N8nStructuredOutputParser): the JSON of the
 * answer, the check of zod, and the two errors. The result is `{ output }`; an output that
 * is `{ output }` again loses one level.
 */
export function parseStructured(
	text: string,
	parser: OutputParser,
): { value?: Item; error?: string; description?: string } {
	const issues: Issues = { first: '' };
	let result: Item | undefined;
	let json: unknown;
	let valid = true;
	try {
		json = JSON.parse(fencedJson(text.trim()).trim());
	} catch {
		valid = false;
	}
	if (valid) {
		if (!isObject(json)) {
			issues.first = 'other';
		} else {
			const output = json.output;
			const has = output !== undefined;
			if (!has && parser.outputRequired !== true) {
				result = {};
			} else {
				const checked = checkShape(parser.shape ?? { kind: 'any' }, output, has, issues);
				if (checked.ok) result = has ? { output: checked.value } : {};
			}
		}
	}
	if (result === undefined) {
		const trimmed = text.trim();
		return trimmed === '' || trimmed === '{}' || issues.first === 'empty'
			? { error: PARSER_EMPTY, description: PARSER_EMPTY_DESCRIPTION }
			: { error: PARSER_FAILED, description: PARSER_FAILED_DESCRIPTION };
	}
	const inner = result.output;
	if (isObject(inner) && Object.keys(inner).length === 1 && inner.output !== undefined) {
		return { value: inner };
	}
	return { value: result };
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

/**
 * The message of the OpenAI client for a request without an answer. The text of the failure
 * names the code of Node.js; the client reads a timeout from it.
 */
function connectionMessage(text: string): string {
	const lower = text.toLowerCase();
	const timeout =
		lower.includes('timedout') || lower.includes('timed out') || lower.includes('timeout');
	return timeout ? 'Request timed out.' : 'Connection error.';
}

/**
 * The agent of version 2 (LangChain's executor) with a tool call and no tools: it adds the
 * answer of the model and, for each call, the text that the tool is not valid. Returns an
 * error text when the answer is not one that this node can repeat as v1 does.
 */
function answerToolCalls(request: ModelRequest, data: unknown): string | undefined {
	const messages = request.body.messages;
	const contents = request.body.contents;
	if (request.gemini === true && Array.isArray(contents)) {
		const calls: unknown[] = [];
		const results: unknown[] = [];
		for (const part of geminiParts(data)) {
			const call = part.functionCall;
			if (part.type !== 'functionCall' || !isObject(call)) {
				return 'AI Agent: the model called a tool, and the agent has no tools';
			}
			calls.push({ functionCall: { name: call.name, args: call.args } });
			results.push({
				functionResponse: {
					name: call.name,
					response: { result: `${String(call.name)} is not a valid tool, try another one.` },
				},
			});
		}
		contents.push({ role: 'model', parts: calls });
		contents.push({ role: 'user', parts: results });
		return undefined;
	}
	if (request.anthropic === true && Array.isArray(messages)) {
		const blocks: unknown[] = [];
		const results: unknown[] = [];
		for (const part of anthropicParts(data)) {
			if (part.type === 'text') {
				blocks.push({ type: 'text', text: part.text });
			} else if (part.type === 'tool_use') {
				blocks.push({ type: 'tool_use', id: part.id, name: part.name, input: part.input });
				results.push({
					type: 'tool_result',
					content: `${String(part.name)} is not a valid tool, try another one.`,
					tool_use_id: part.id,
				});
			} else {
				return 'AI Agent: the model called a tool, and the agent has no tools';
			}
		}
		messages.push({ role: 'assistant', content: blocks });
		messages.push({ role: 'user', content: results });
		return undefined;
	}
	if (request.responses || !Array.isArray(messages) || !isObject(data)) {
		return 'AI Agent: the model called a tool, and the agent has no tools';
	}
	const first: unknown = Array.isArray(data.choices) ? data.choices[0] : undefined;
	const message = isObject(first) && isObject(first.message) ? first.message : {};
	const calls = Array.isArray(message.tool_calls) ? message.tool_calls : [];
	const sent: unknown[] = [];
	const results: unknown[] = [];
	for (const call of calls) {
		const fn = isObject(call) && isObject(call.function) ? call.function : undefined;
		if (!isObject(call) || fn === undefined || typeof fn.arguments !== 'string') {
			return 'AI Agent: the model called a tool, and the agent has no tools';
		}
		let args: unknown;
		try {
			args = JSON.parse(fn.arguments);
		} catch {
			return 'AI Agent: the model called a tool, and the agent has no tools';
		}
		sent.push({
			id: call.id,
			type: 'function',
			function: { name: fn.name, arguments: JSON.stringify(args) },
		});
		results.push({
			role: 'tool',
			content: `${String(fn.name)} is not a valid tool, try another one.`,
			tool_call_id: call.id,
		});
	}
	messages.push({
		role: 'assistant',
		content: typeof message.content === 'string' ? message.content : '',
		tool_calls: sent,
	});
	for (const result of results) messages.push(result);
	return undefined;
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

/** The content blocks of an answer of the Anthropic Messages API. */
function anthropicParts(data: unknown): Array<Record<string, unknown>> {
	const parts: Array<Record<string, unknown>> = [];
	const content = isObject(data) && Array.isArray(data.content) ? data.content : [];
	for (const part of content) if (isObject(part)) parts.push(part);
	return parts;
}

/** True when the answer of the model calls a tool. The agent of this node has no tools. */
function callsTool(data: unknown, responses: boolean): boolean {
	if (!isObject(data)) return false;
	if (responses) {
		const output = Array.isArray(data.output) ? data.output : [];
		return output.some((item) => isObject(item) && item.type === 'function_call');
	}
	const first: unknown = Array.isArray(data.choices) ? data.choices[0] : undefined;
	const message = isObject(first) ? first.message : undefined;
	const calls = isObject(message) ? message.tool_calls : undefined;
	return Array.isArray(calls) && calls.length > 0;
}

/**
 * The output text of the agent (handleAgentFinishOutput of v1). A Chat Completions answer is
 * text as it is. A Responses answer is a list of parts: the text parts joined and trimmed,
 * or else the thinking parts.
 */
function agentOutput(parts: Array<Record<string, unknown>>, responses: boolean): string {
	if (!responses) return String(parts[0]?.text ?? '');
	let text = '';
	for (const part of parts) if (part.type === 'text' && part.text) text += String(part.text);
	if (text.trim() !== '') return text.trim();
	let thinking = '';
	for (const part of parts) {
		if (part.type === 'thinking' && part.thinking) thinking += String(part.thinking);
	}
	return thinking.trim();
}

/** The default of `max_tokens` for a model (MODEL_DEFAULT_MAX_OUTPUT_TOKENS of @langchain/anthropic). */
const ANTHROPIC_MAX_TOKENS: Array<[string, number]> = [
	['claude-opus-5', 16384],
	['claude-fable-5', 16384],
	['claude-mythos-5', 16384],
	['claude-mythos-preview', 16384],
	['claude-opus-4-7', 16384],
	['claude-opus-4-6', 16384],
	['claude-sonnet-4-6', 16384],
	['claude-opus-4-5', 16384],
	['claude-sonnet-4-5', 16384],
	['claude-haiku-4-5', 16384],
	['claude-opus-4-1', 16384],
	['claude-sonnet-4', 16384],
	['claude-opus-4', 16384],
	['claude-3-7-sonnet', 8192],
	['claude-3-5-sonnet', 8192],
	['claude-3-5-haiku', 8192],
	['claude-3-opus', 4096],
	['claude-3-sonnet', 4096],
	['claude-3-haiku', 4096],
];

/** Models that the Anthropic client limits to 8192 tokens without a stream. */
const ANTHROPIC_NONSTREAMING = [
	'claude-opus-4-20250514',
	'claude-opus-4-0',
	'claude-4-opus-20250514',
	'anthropic.claude-opus-4-20250514-v1:0',
	'claude-opus-4@20250514',
	'claude-opus-4-1-20250805',
	'anthropic.claude-opus-4-1-20250805-v1:0',
	'claude-opus-4-1@20250805',
];

function isDigits(text: string): boolean {
	if (text === '') return false;
	for (let i = 0; i < text.length; i++) if (!isDigit(text[i])) return false;
	return true;
}

/**
 * True when the v1 model node sends the sampling parameters for the model
 * (modelSupportsSamplingParams): other Claude models take none, and the node drops them.
 */
function anthropicSamples(model: string): boolean {
	if (!model.startsWith('claude-')) return true;
	if (
		model.startsWith('claude-2') ||
		model.startsWith('claude-instant') ||
		model.startsWith('claude-3') ||
		model.startsWith('claude-sonnet-4') ||
		model.startsWith('claude-haiku-4')
	) {
		return true;
	}
	// `claude-opus-4`, then `-0` to `-6` or nothing, then a date of 8 digits or nothing.
	if (!model.startsWith('claude-opus-4')) return false;
	let rest = model.slice('claude-opus-4'.length);
	if (rest.length >= 2 && rest[0] === '-' && rest[1] >= '0' && rest[1] <= '6') {
		if (rest.length === 2 || rest[2] === '-') rest = rest.slice(2);
	}
	if (rest === '') return true;
	return rest.length === 9 && rest[0] === '-' && isDigits(rest.slice(1));
}

/** The request of the Anthropic chat model (`lmChatAnthropic`, ChatAnthropic of LangChain). */
function anthropicRequest(
	item: ItemParameters,
	ai: AiModel,
	agent: boolean,
	instructions?: string,
): ModelRequest {
	const options = ai.options ?? {};
	const model = ai.model ?? '';
	const messages = chatMessages(item, '', agent, instructions);
	const request: ModelRequest = { responses: false, anthropic: true, body: {} };
	let maxTokens = options.maxTokens;
	if (maxTokens === undefined) {
		maxTokens = 4096;
		for (const [prefix, tokens] of ANTHROPIC_MAX_TOKENS) {
			if (model.startsWith(prefix)) {
				maxTokens = tokens;
				break;
			}
		}
	}
	const body: Record<string, unknown> = { model, stream: false, max_tokens: maxTokens };
	if (anthropicSamples(model)) {
		body.temperature = options.temperature;
		body.top_k = options.topK;
		body.top_p = options.topP;
	}
	if (agent) body.tools = [];
	const sent: unknown[] = [];
	for (let i = 0; i < messages.length; i++) {
		const message = messages[i];
		if (message.role !== 'system') {
			sent.push(message);
		} else if (i === 0) {
			body.system = message.content;
		} else {
			request.refused = 'System messages are only permitted as the first passed message.';
		}
	}
	body.messages = sent;
	// The client refuses a request without a stream that can take longer than 10 minutes.
	const long = (60 * 60 * maxTokens) / 128000 > 10 * 60;
	if (long || (ANTHROPIC_NONSTREAMING.includes(model) && maxTokens > 8192)) {
		if (request.refused === undefined) {
			request.refused =
				'Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details';
		}
	}
	request.body = body;
	return request;
}

/** The model of a Gemini request as the client writes it in the URL. */
function geminiModel(model: string): string {
	return model.includes('/') ? model : `models/${model}`;
}

/** The request of the Gemini chat model (`lmChatGoogleGemini`, ChatGoogleGenerativeAI of LangChain). */
function geminiRequest(
	item: ItemParameters,
	ai: AiModel,
	agent: boolean,
	instructions?: string,
): ModelRequest {
	const options = ai.options ?? {};
	const messages = chatMessages(item, '', agent, instructions);
	const request: ModelRequest = { responses: false, gemini: true, body: {} };
	const body: Record<string, unknown> = {
		generationConfig: {
			stopSequences: [],
			maxOutputTokens: options.maxTokens,
			temperature: options.temperature,
			topP: options.topP,
			topK: options.topK,
		},
		safetySettings: ai.safetySettings ?? [],
	};
	const contents: unknown[] = [];
	for (let i = 0; i < messages.length; i++) {
		const message = messages[i];
		// LangChain sends no part for an empty text.
		const parts = message.content === '' ? [] : [{ text: message.content }];
		if (message.role !== 'system') {
			contents.push({
				role: message.role === 'assistant' ? 'model' : 'user',
				parts,
			});
		} else if (i === 0) {
			body.systemInstruction = { role: 'system', parts };
		} else {
			request.refused = 'System message should be the first one';
		}
	}
	body.contents = contents;
	request.body = body;
	return request;
}

/**
 * The content blocks of a Gemini answer, as LangChain makes them from the parts of the
 * first candidate: text, thinking (a thought part), or a block named after the part.
 */
function geminiParts(data: unknown): Array<Record<string, unknown>> {
	const candidates = isObject(data) && Array.isArray(data.candidates) ? data.candidates : [];
	if (candidates.length === 0) {
		const feedback = isObject(data) && isObject(data.promptFeedback) ? data.promptFeedback : {};
		if (feedback.blockReason) {
			throw new Error(`Gemini blocked the prompt (reason: ${String(feedback.blockReason)})`);
		}
		throw new Error('Gemini returned an empty response');
	}
	const first: unknown = candidates[0];
	const content = isObject(first) ? first.content : undefined;
	if (!isObject(content)) {
		throw new Error("Cannot read properties of undefined (reading 'parts')");
	}
	const blocks: Array<Record<string, unknown>> = [];
	for (const part of Array.isArray(content.parts) ? content.parts : []) {
		if (!isObject(part)) continue;
		if (part.text !== undefined) {
			if (part.thought === true) blocks.push({ type: 'thinking', thinking: part.text });
			else blocks.push({ type: 'text', text: part.text });
		} else {
			blocks.push({ ...part, type: Object.keys(part)[0] });
		}
	}
	return blocks;
}

/** The text of a failed answer as the Anthropic client writes it: the status, then the body. */
function anthropicClientMessage(status: number, body: unknown): string {
	const text = typeof body === 'string' ? body : body === undefined ? '' : JSON.stringify(body);
	return text === '' ? `${status} status code (no body)` : `${status} ${text}`;
}

/**
 * True when the text names a sampling parameter and then says that it is deprecated or not
 * supported: the test of the v1 model node on the message of a failed request.
 */
function refusesSampling(message: string): boolean {
	const lower = message.toLowerCase();
	let first = -1;
	for (const name of ['temperature', 'top_p', 'top_k']) {
		const at = lower.indexOf(name);
		if (at >= 0 && (first < 0 || at < first)) first = at;
	}
	if (first < 0) return false;
	const after = lower.slice(first);
	return after.includes('deprecated') || after.includes('not supported');
}

/** The request body of the item, and true when it goes to the Responses API. */
function requestOf(
	item: ItemParameters,
	ai: AiModel,
	agent: boolean,
	instructions?: string,
): ModelRequest {
	if (ai.provider === 'anthropic') return anthropicRequest(item, ai, agent, instructions);
	if (ai.provider === 'gemini') return geminiRequest(item, ai, agent, instructions);
	const options = ai.options ?? {};
	const maxTokens = options.maxTokens === -1 ? undefined : options.maxTokens;
	const model = ai.model ?? '';
	const messages = chatMessages(item, model, agent, instructions);
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
				'kind',
				'returnIntermediateSteps',
				'maxIterations',
				'nodeVersion',
				'batchSize',
				'delayBetweenBatches',
				'continueOnFail',
				'aiModel',
				'outputParser',
				'batch',
			],
		},
	},
	async run(ctx, parameters, _items, credential) {
		const batch = parameters.batch ?? [];
		const ai = parameters.aiModel ?? {};
		const runs: Array<{ error: string | null }> = [];
		// The runs of the output parser sub-node: one for each answer that it parses.
		const parserRuns: Array<{ error: string | null }> = [];
		const parser = parameters.kind === 'agent' ? undefined : parameters.outputParser;
		// The OpenRouter model is the same LangChain client with another credential type, which
		// injects the key only, and without the header of the OpenAI nodes.
		const openAi = ai.provider === 'openAi';
		// True when the credential has an organization (the flag `f0a11c001` of
		// `src/convert/ai-cluster.ts`). The credential type then injects a header that the
		// LangChain client does not send, so the request names the key itself.
		const hasOrganization = openAi && ctx.credentialFlag(credential, 'f0a11c001');
		const platform: Record<string, string> = openAi
			? { 'openai-platform': 'org-qkmJQuJ2WnvoIKMr2UJwIJkZ' }
			: {};
		const agent = parameters.kind === 'agent';
		const version = parameters.nodeVersion ?? 1.9;
		const size = parameters.batchSize ?? (agent ? 1 : 5);
		const delay = parameters.delayBetweenBatches ?? 0;
		// The chain has batches from version 1.7, for a batch size above 1. The agent has them always.
		const batched = agent ? size >= 1 : version >= 1.7 && size > 1;
		const step = batched ? size : 1;
		const maxIterations = parameters.maxIterations ?? 10;
		const tries = (ai.options?.maxRetries ?? 2) + 1;

		/**
		 * One call of the Anthropic model. The credential type injects the key and the custom
		 * header. LangChain tries a failed request 7 times, also after a 429 answer.
		 */
		const sendAnthropic = async (
			request: ModelRequest,
			run: { error: string | null },
		): Promise<{ data?: unknown; error?: string }> => {
			for (let attempt = 1; ; attempt++) {
				let status = 0;
				let body: unknown;
				let transport = '';
				try {
					const response = await ctx.http<unknown>({
						method: 'POST',
						url: '{{$credentials.url}}/v1/messages',
						headers: { 'anthropic-version': '2023-06-01' },
						qs: {},
						body: request.body,
						credential,
					});
					status = response.status;
					body = response.body;
				} catch (error) {
					transport = messageOf(error);
				}
				if (status > 0 && status < 400) return { data: body };
				if (status > 0 && refusesSampling(anthropicClientMessage(status, body))) {
					run.error = `The model "${String(request.body.model)}" does not support the Sampling Temperature, Top K, or Top P options. Remove them from Options and try again.`;
					return { error: run.error };
				}
				if (NO_RETRY.includes(status)) {
					run.error =
						STATUS_MESSAGES[String(status)] ??
						'Your request is invalid or could not be processed by the service';
					return { error: run.error };
				}
				if (attempt >= 7) {
					run.error =
						status > 0 ? anthropicClientMessage(status, body) : connectionMessage(transport);
					return { error: run.error };
				}
				await ctx.wait({ duration: retryWait(ctx.random(), attempt) });
			}
		};

		/**
		 * One call of the Gemini model. The client sends the key in a header, not in the query
		 * as the credential type does, so the request names the key itself. LangChain tries a
		 * failed request 7 times. The text of the last failure has the URL of the request: the
		 * converter gives this node only credentials with the host of Google.
		 */
		const sendGemini = async (
			request: ModelRequest,
			run: { error: string | null },
		): Promise<{ data?: unknown; error?: string }> => {
			const path = `/v1beta/${geminiModel(ai.model ?? '')}:generateContent`;
			for (let attempt = 1; ; attempt++) {
				let status = 0;
				let body: unknown;
				try {
					const response = await ctx.http<unknown>({
						method: 'POST',
						url: `{{$credentials.host}}${path}`,
						headers: { 'x-goog-api-key': '{{$credentials.apiKey}}' },
						qs: {},
						body: request.body,
						credential,
						inject: false,
					});
					status = response.status;
					body = response.body;
				} catch {
					status = 0;
				}
				if (status > 0 && status < 400) return { data: body };
				if (NO_RETRY.includes(status)) {
					run.error =
						STATUS_MESSAGES[String(status)] ??
						'Your request is invalid or could not be processed by the service';
					return { error: run.error };
				}
				if (attempt >= 7) {
					const error = isObject(body) && isObject(body.error) ? body.error : {};
					const text = typeof error.message === 'string' ? error.message : '';
					const reason = status > 0 ? `[${status} ] ${text}` : 'fetch failed';
					run.error = `[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com${path}: ${reason}`;
					return { error: run.error };
				}
				await ctx.wait({ duration: retryWait(ctx.random(), attempt) });
			}
		};

		/**
		 * One call of the model, with the tries of LangChain's caller. It records the run of the
		 * model sub-node when the request starts, and gives the body of the answer or the error.
		 */
		const send = async (request: ModelRequest): Promise<{ data?: unknown; error?: string }> => {
			const run: { error: string | null } = { error: null };
			runs.push(run);
			if (request.refused !== undefined) {
				run.error = request.refused;
				return { error: run.error };
			}
			if (request.anthropic === true) return await sendAnthropic(request, run);
			if (request.gemini === true) return await sendGemini(request, run);
			for (let attempt = 1; ; attempt++) {
				let status = 0;
				let body: unknown;
				let transport = '';
				try {
					const response = await ctx.http<unknown>({
						method: 'POST',
						url: request.responses
							? '{{$credentials.url}}/responses'
							: '{{$credentials.url}}/chat/completions',
						headers: hasOrganization
							? { authorization: 'Bearer {{$credentials.apiKey}}', ...platform }
							: platform,
						qs: {},
						body: request.body,
						credential,
						inject: !hasOrganization,
					});
					status = response.status;
					body = response.body;
				} catch (error) {
					// The request has no answer (a network failure). LangChain tries it again.
					transport = messageOf(error);
				}
				if (status > 0 && status < 400) return { data: body };
				const final = status === 429 || NO_RETRY.includes(status);
				if (final || attempt >= tries) {
					run.error = status > 0 ? failure(status, body) : connectionMessage(transport);
					return { error: run.error };
				}
				await ctx.wait({ duration: retryWait(ctx.random(), attempt) });
			}
		};

		/**
		 * The root for one item. `again` is true when the answer calls a tool and the agent of
		 * version 3 gives the call to n8n's engine: the engine then runs the whole node again.
		 */
		const one = async (item: ItemParameters, iteration: number): Promise<Outcome> => {
			if (
				ai.provider !== 'openAi' &&
				ai.provider !== 'openRouter' &&
				ai.provider !== 'anthropic' &&
				ai.provider !== 'gemini'
			) {
				return { error: 'Basic LLM Chain: the chat model is not in the compiled library' };
			}
			if (agent && version >= 3 && iteration >= maxIterations) {
				return {
					error: `Max iterations (${maxIterations}) reached. The agent could not complete the task within the allowed number of iterations.`,
				};
			}
			// An expression that finds no value gives undefined, as in v1.
			if (item.text === undefined) return { error: 'No prompt specified' };
			const request = requestOf(item, ai, agent, parser?.instructions);
			for (let turn = 1; ; turn++) {
				const answer = await send(request);
				if (answer.error !== undefined) return { error: answer.error };
				const run = runs[runs.length - 1];
				let parts: Array<Record<string, unknown>> = [];
				try {
					if (request.anthropic === true) parts = anthropicParts(answer.data);
					else if (request.gemini === true) parts = geminiParts(answer.data);
					else if (request.responses) parts = responseParts(answer.data);
					else parts = [{ type: 'text', text: completionText(answer.data) }];
				} catch (error) {
					run.error = messageOf(error);
					return { error: run.error };
				}
				if (agent) {
					const calls =
						request.anthropic === true
							? parts.some((part) => part.type === 'tool_use')
							: request.gemini === true
								? parts.some((part) => part.type === 'functionCall')
								: callsTool(answer.data, request.responses);
					if (calls) {
						// The agent has no tools. Version 3 gives the calls to the engine, which has no
						// tool to run and runs the agent again. Version 2 answers each call itself.
						if (version >= 3) return { again: true };
						if (turn >= maxIterations) {
							return { item: { output: 'Agent stopped due to max iterations.' } };
						}
						const failed = answerToolCalls(request, answer.data);
						if (failed !== undefined) return { error: failed };
						continue;
					}
					// One text part of Gemini is a text answer; more parts are a list of blocks.
					const single = request.gemini === true && parts.length === 1 && parts[0].type === 'text';
					const blocks = request.responses || request.anthropic === true || request.gemini === true;
					const output: Item = { output: agentOutput(parts, blocks && !single) };
					if (parameters.returnIntermediateSteps === true) output.intermediateSteps = [];
					return { item: output };
				}
				if (parser !== undefined) {
					// The parser reads the text of the answer: the text parts, joined.
					let answerText = '';
					for (const part of parts) {
						if (part.type === 'text' && typeof part.text === 'string') answerText += part.text;
					}
					const parserRun: { error: string | null } = { error: null };
					parserRuns.push(parserRun);
					const parsed = parseStructured(answerText, parser);
					if (parsed.value !== undefined) return { item: parsed.value };
					parserRun.error = parsed.error ?? null;
					return { error: parsed.error, description: parsed.description };
				}
				// The string output parser of the chain works after the run of the model.
				try {
					let text = '';
					for (const part of parts) text += partText(part);
					return { item: { text: text.trim() } };
				} catch (error) {
					return { error: messageOf(error) };
				}
			}
		};

		for (let iteration = 0; ; iteration++) {
			const items: Item[] = [];
			let again = false;
			for (let start = 0; start < batch.length; start += step) {
				// v1 starts the requests of a batch together, so all of them run before a failure counts.
				const outcomes: Outcome[] = [];
				for (const item of batch.slice(start, start + step)) {
					outcomes.push(await one(item, iteration));
				}
				for (const outcome of outcomes) {
					if (outcome.again === true) {
						again = true;
					} else if (outcome.item !== undefined) {
						items.push(outcome.item);
					} else if (parameters.continueOnFail === true) {
						items.push({ error: outcome.error });
					} else {
						return [
							{
								items: [],
								runs,
								parserRuns,
								error: outcome.error,
								errorDescription: outcome.description ?? '',
							},
						];
					}
				}
				if (batched && start + step < batch.length && delay > 0) {
					await ctx.wait({ duration: delay });
				}
			}
			if (!again) return [{ items, runs, parserRuns }];
		}
	},
});
