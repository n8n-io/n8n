/**
 * Compiled library node: a hand port of `@n8n/n8n-nodes-langchain.googleGemini`
 * versions 1 to 1.2, operation `text.message` ("Message a model", generateContent).
 *
 * Supported: text messages, the system message, the generation options, JSON
 * output, the merged response and the simplified output. Not supported: built-in
 * tools (search, maps, URL context, file search, code execution) and connected
 * tools (a node with tools runs as a cluster in the fallback host).
 *
 * The converter gives the parameters of each input item in `batch`. The node runs
 * once for all items, as the router of the v1 node does: under "continue on fail"
 * an item that fails gives `{ error }`, and else the first failure stops the node.
 */
import {
	apiError,
	defineNode,
	operationError,
	type HttpResponse,
	type Item,
} from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface Message {
	role?: string;
	content?: unknown;
}

interface GeminiParameters {
	resource?: string;
	operation?: string;
	modelId?: string | Locator;
	messages?: { values?: Message[] };
	simplify?: boolean;
	jsonOutput?: boolean;
	options?: Record<string, unknown>;
	/** The parameters of each input item (the converter writes them). */
	batch?: GeminiParameters[];
	/** True under a "continue" error setting. */
	continueOnFail?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** The messages of n8n's NodeApiError for a request without an answer, by the code of Node.js. */
const NETWORK_MESSAGES: Array<[string, string]> = [
	['ECONNREFUSED', 'The service refused the connection - perhaps it is offline'],
	[
		'ENOTFOUND',
		'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
	],
	[
		'ETIMEDOUT',
		"The connection timed out, consider setting the 'Retry on Fail' option in the node settings",
	],
	[
		'ECONNRESET',
		'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
	],
	['EAI_AGAIN', 'The DNS server returned an error, perhaps the server is offline'],
	['EHOSTUNREACH', 'The host is unreachable, perhaps the server is offline'],
];

/** The error of the v1 node for a request that fails without an answer. */
function networkError(error: unknown): Error {
	const text = isObject(error) && typeof error.message === 'string' ? error.message : String(error);
	for (const [code, message] of NETWORK_MESSAGES) {
		if (text.includes(code)) return new Error(message);
	}
	return new Error(text);
}

/** The options that the v1 node checks, in its order, with the type of each one. */
const OPTION_TYPES: Array<[string, string]> = [
	['includeMergedResponse', 'boolean'],
	['systemMessage', 'string'],
	['codeExecution', 'boolean'],
	['frequencyPenalty', 'number'],
	['maxOutputTokens', 'number'],
	['candidateCount', 'number'],
	['presencePenalty', 'number'],
	['temperature', 'number'],
	['topP', 'number'],
	['topK', 'number'],
	['thinkingBudget', 'number'],
	['maxToolsIterations', 'number'],
];

/** The name of a model without the `models/` prefix. */
function plainModel(model: string): string {
	return model.startsWith('models/') ? model.slice('models/'.length) : model;
}

/** The parts of all candidates of an answer. */
function partsOf(candidates: unknown[]): unknown[] {
	const parts: unknown[] = [];
	for (const candidate of candidates) {
		const content = isObject(candidate) ? candidate.content : undefined;
		const list = isObject(content) ? content.parts : undefined;
		if (Array.isArray(list)) for (const part of list) parts.push(part);
	}
	return parts;
}

export default defineNode<GeminiParameters>({
	type: '@n8n/n8n-nodes-langchain.googleGemini',
	version: 1.2,
	supports: {
		resource: 'text',
		operation: { text: 'message' },
		operations: {
			'text.message': [
				'batch',
				'continueOnFail',
				'modelId',
				'messages',
				'simplify',
				'jsonOutput',
				'options',
				'options.includeMergedResponse',
				'options.systemMessage',
				'options.codeExecution=false',
				'options.frequencyPenalty',
				'options.maxOutputTokens',
				'options.candidateCount',
				'options.presencePenalty',
				'options.temperature',
				'options.topP',
				'options.topK',
				'options.thinkingBudget',
				'options.maxToolsIterations',
			],
		},
	},
	async run(ctx, call, _items, credential) {
		const out: Item[] = [];
		for (const parameters of call.batch ?? [call]) {
			try {
				for (const item of await one(parameters)) out.push(item);
			} catch (error) {
				if (call.continueOnFail !== true) throw error;
				out.push({
					error:
						isObject(error) && typeof error.message === 'string' ? error.message : String(error),
				});
			}
		}
		return out;

		/** execute of actions/text/message.operation.ts for one item, without tools. */
		async function one(parameters: GeminiParameters): Promise<Item[]> {
			const resource = parameters.resource ?? 'text';
			const operation = parameters.operation ?? 'message';
			if (resource !== 'text' || operation !== 'message') {
				throw new Error(`Google Gemini: ${resource}.${operation} is not in the compiled library`);
			}
			const model =
				typeof parameters.modelId === 'string'
					? parameters.modelId
					: (parameters.modelId?.value ?? '');
			const options = parameters.options ?? {};
			for (const [name, type] of OPTION_TYPES) {
				const value = options[name];
				if (value !== undefined && typeof value !== type) {
					throw new Error(`Parameter "${name}" does not match any of the expected types: ${type}`);
				}
			}
			const generationConfig: Record<string, unknown> = {
				frequencyPenalty: options.frequencyPenalty,
				maxOutputTokens: options.maxOutputTokens,
				candidateCount: options.candidateCount,
				presencePenalty: options.presencePenalty,
				temperature: options.temperature,
				topP: options.topP,
				topK: options.topK,
				responseMimeType: (parameters.jsonOutput ?? false) ? 'application/json' : undefined,
			};
			if (options.thinkingBudget !== undefined) {
				generationConfig.thinkingConfig = { thinkingBudget: options.thinkingBudget };
			}
			// n8n fills the defaults of the members of a message.
			const contents: unknown[] = [];
			for (const m of parameters.messages?.values ?? [{}]) {
				const content = m.content ?? '';
				if (typeof content !== 'string') throw new Error('m.content.trim is not a function');
				if (content.trim() === '') continue;
				contents.push({ parts: [{ text: content }], role: m.role ?? 'user' });
			}
			if (contents.length === 0) throw new Error('A non-empty prompt is required.');
			const body: Record<string, unknown> = {
				tools: [],
				contents,
				generationConfig,
				systemInstruction: options.systemMessage
					? { parts: [{ text: options.systemMessage }] }
					: undefined,
			};
			const requested = plainModel(model);
			const generate = async (): Promise<Record<string, unknown>> => {
				// n8n's request helper sends a request again, once, after a 401 answer.
				for (let attempt = 1; ; attempt++) {
					// A request that fails without an answer gives the error text of the v1 node.
					let response: HttpResponse<unknown>;
					try {
						response = await ctx.http<unknown>({
							method: 'POST',
							url: `{{$credentials.host}}/v1beta/${model}:generateContent`,
							headers: {},
							qs: {},
							body,
							credential,
						});
					} catch (error) {
						throw networkError(error);
					}
					if (response.status === 401 && attempt === 1) continue;
					// The router of the v1 node gives a NodeOperationError with the message and the description.
					if (response.status >= 400) throw apiError(response, { operationError: true });
					const answer = response.body;
					if (!isObject(answer)) throw new Error('Google Gemini: the answer is not an object');
					const version = answer.modelVersion;
					if (
						requested.startsWith('gemma-') &&
						typeof version === 'string' &&
						version !== '' &&
						plainModel(version) !== requested
					) {
						throw operationError(
							'Google returned a different model',
							`Requested "${model}", but Google returned "${version}". Check that the selected model is available for your API key.`,
						);
					}
					return answer;
				}
			};
			const candidatesOf = (answer: Record<string, unknown>): unknown[] => {
				if (!Array.isArray(answer.candidates)) {
					throw new Error("Cannot read properties of undefined (reading 'flatMap')");
				}
				return answer.candidates;
			};
			let response = await generate();
			let candidates = candidatesOf(response);
			const limit = options.maxToolsIterations ?? 15;
			const maxToolsIterations = typeof limit === 'number' ? limit : 15;
			let iteration = 1;
			for (;;) {
				const calls: Array<Record<string, unknown>> = [];
				for (const part of partsOf(candidates)) {
					if (isObject(part) && part.functionCall !== undefined) calls.push(part);
				}
				if (calls.length === 0) break;
				if (maxToolsIterations > 0 && iteration >= maxToolsIterations) break;
				for (const candidate of candidates) {
					contents.push(isObject(candidate) ? candidate.content : undefined);
				}
				// No tool is connected, so each call of a function gets no result.
				for (const part of calls) {
					const functionCall = isObject(part.functionCall) ? part.functionCall : {};
					contents.push({
						parts: [
							{ functionResponse: { id: functionCall.id, name: functionCall.name, response: {} } },
						],
						role: 'user',
					});
				}
				response = await generate();
				candidates = candidatesOf(response);
				iteration++;
			}
			if (options.includeMergedResponse) {
				candidates = candidates.map((candidate) => {
					let merged = '';
					for (const part of partsOf([candidate])) {
						if (!isObject(part) || part.text === undefined) continue;
						if (part.text !== null) merged += String(part.text);
					}
					return { ...(isObject(candidate) ? candidate : {}), mergedResponse: merged };
				});
			}
			if (parameters.simplify ?? true) {
				const items: Item[] = [];
				for (const candidate of candidates) if (isObject(candidate)) items.push(candidate);
				return items;
			}
			return [{ ...response, candidates }];
		}
	},
});
