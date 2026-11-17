/**
 * Compiled library node: a hand port of `@n8n/n8n-nodes-langchain.anthropic`
 * version 1, operation `text.message` ("Message a model", Messages API).
 *
 * Supported: text messages, the system prompt, the request options that map to
 * fields of the request body, prompt caching, the merged response and the
 * simplified output. Not supported: attachments, the code execution and web
 * search tools, and connected tools (a node with tools runs as a cluster in the
 * fallback host).
 *
 * The converter gives the parameters of each input item in `batch`. The node runs
 * once for all items, as the router of the v1 node does: under "continue on fail"
 * an item that fails gives `{ error }`, and else the first failure stops the node.
 */
import { apiError, defineNode, type HttpResponse, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface Message {
	role?: string;
	content?: unknown;
}

interface AnthropicOptions {
	includeMergedResponse?: boolean;
	system?: string;
	promptCaching?: string;
	codeExecution?: boolean;
	webSearch?: boolean;
	maxUses?: number;
	allowedDomains?: string;
	blockedDomains?: string;
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	topK?: number;
	maxToolsIterations?: number;
}

interface AnthropicParameters {
	resource?: string;
	operation?: string;
	modelId?: string | Locator;
	messages?: { values?: Message[] };
	addAttachments?: boolean;
	simplify?: boolean;
	options?: AnthropicOptions;
	/** The parameters of each input item (the converter writes them). */
	batch?: AnthropicParameters[];
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

export default defineNode<AnthropicParameters>({
	type: '@n8n/n8n-nodes-langchain.anthropic',
	version: 1,
	supports: {
		resource: 'text',
		operation: { text: 'message' },
		operations: {
			'text.message': [
				'batch',
				'continueOnFail',
				'modelId',
				'messages',
				'addAttachments=false',
				'simplify',
				'options',
				'options.includeMergedResponse',
				'options.system',
				'options.promptCaching',
				'options.codeExecution=false',
				'options.webSearch=false',
				'options.maxUses',
				'options.allowedDomains',
				'options.blockedDomains',
				'options.maxTokens',
				'options.temperature',
				'options.topP',
				'options.topK',
				'options.maxToolsIterations',
			],
		},
	},
	async run(ctx, call, _items, credential) {
		const out: Item[] = [];
		for (const parameters of call.batch ?? [call]) {
			try {
				out.push(await one(parameters));
			} catch (error) {
				if (call.continueOnFail !== true) throw error;
				out.push({
					error:
						isObject(error) && typeof error.message === 'string' ? error.message : String(error),
				});
			}
		}
		return out;

		/** execute of actions/text/message.operation.ts for one item, without connected tools. */
		async function one(parameters: AnthropicParameters): Promise<Item> {
			const resource = parameters.resource ?? 'text';
			const operation = parameters.operation ?? 'message';
			if (resource !== 'text' || operation !== 'message') {
				throw new Error(`Anthropic: ${resource}.${operation} is not in the compiled library`);
			}
			const model =
				typeof parameters.modelId === 'string'
					? parameters.modelId
					: (parameters.modelId?.value ?? '');
			const options = parameters.options ?? {};
			// n8n fills the defaults of the members of a message.
			const messages: Message[] = (parameters.messages?.values ?? [{}])
				.map((m) => ({ ...m, role: m.role ?? 'user', content: m.content ?? '' }))
				.filter((m) => typeof m.content !== 'string' || m.content.trim() !== '');
			if (messages.length === 0) throw new Error('A non-empty prompt is required.');
			const body: Record<string, unknown> = {
				model,
				messages,
				tools: [],
				max_tokens: options.maxTokens ?? 1024,
				system: options.system,
				temperature: options.temperature,
				top_p: options.topP,
				top_k: options.topK,
			};
			if (options.promptCaching && options.promptCaching !== 'disabled') {
				body.cache_control = { type: 'ephemeral', ttl: options.promptCaching };
			}
			const send = async (): Promise<Record<string, unknown>> => {
				// n8n's request helper sends a request again, once, after a 401 answer.
				for (let attempt = 1; ; attempt++) {
					// A request that fails without an answer gives the error text of the v1 node.
					let response: HttpResponse<unknown>;
					try {
						response = await ctx.http<unknown>({
							method: 'POST',
							url: '{{$credentials.url}}/v1/messages',
							headers: {
								'anthropic-version': '2023-06-01',
								'anthropic-beta': 'files-api-2025-04-14',
							},
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
					if (!isObject(response.body)) throw new Error('Anthropic: the answer is not an object');
					return response.body;
				}
			};
			let response = await send();
			const maxToolsIterations = options.maxToolsIterations ?? 15;
			let iteration = 0;
			let pauseTurns = 0;
			for (;;) {
				if (response.stop_reason === 'tool_use') {
					if (maxToolsIterations > 0 && iteration >= maxToolsIterations) break;
					messages.push({ role: 'assistant', content: response.content });
					// No tool is connected, so each call of a tool gets an empty result.
					const results: unknown[] = [];
					const content = Array.isArray(response.content) ? response.content : [];
					for (const part of content) {
						if (!isObject(part) || part.type !== 'tool_use') continue;
						results.push({ type: 'tool_result', tool_use_id: part.id, content: '' });
					}
					if (results.length > 0) messages.push({ role: 'user', content: results });
					iteration++;
				} else if (response.stop_reason === 'pause_turn') {
					// The model paused; the v1 node asks again, three times at most.
					if (pauseTurns >= 3) break;
					messages.push({ role: 'assistant', content: response.content });
					pauseTurns++;
				} else {
					break;
				}
				response = await send();
			}
			let merged: string | undefined;
			if (options.includeMergedResponse) {
				merged = '';
				const content = Array.isArray(response.content) ? response.content : [];
				for (const part of content) {
					if (!isObject(part) || part.type !== 'text') continue;
					if (part.text !== undefined && part.text !== null) merged += String(part.text);
				}
			}
			if (parameters.simplify ?? true) {
				return { content: response.content, merged_response: merged };
			}
			return { ...response, merged_response: merged };
		}
	},
});
