/**
 * Compiled library node: a hand port of `@n8n/n8n-nodes-langchain.openAi`
 * version 2.3, operation `text.response` ("Message a model", Responses API).
 *
 * Supported: text messages, the request options that map to fields of the
 * request body, text formats (text, JSON object, JSON schema), reasoning and
 * the simplified output. Not supported: images and files, built-in tools,
 * connected tools (a compiled workflow has no tool sub-nodes), prompt
 * templates and background mode.
 */
import { defineNode, type Item } from '@n8n/workflow-lang';

interface Locator {
	__rl?: boolean;
	mode?: string;
	value?: string;
}

interface Message {
	type?: string;
	role?: string;
	content?: string;
}

interface OpenAiOptions {
	conversationId?: string;
	include?: string[];
	instructions?: string;
	maxTokens?: number;
	maxToolCalls?: number;
	metadata?: string | Record<string, unknown>;
	parallelToolCalls?: boolean;
	previousResponseId?: string;
	promptCacheKey?: string;
	reasoning?: { reasoningOptions?: { effort?: string; summary?: string } };
	safetyIdentifier?: string;
	serviceTier?: string;
	store?: boolean;
	textFormat?: {
		textOptions?: {
			type?: string;
			verbosity?: string;
			name?: string;
			schema?: string | Record<string, unknown>;
		};
	};
	topLogprobs?: number;
	temperature?: number;
	topP?: number;
	truncation?: boolean;
}

interface OpenAiParameters {
	resource?: string;
	operation?: string;
	modelId?: string | Locator;
	responses?: { values?: Message[] };
	simplify?: boolean;
	options?: OpenAiOptions;
}

interface OutputItem {
	type?: string;
	content?: Array<{ type?: string; text?: unknown }>;
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJson(value: string | Record<string, unknown>, message: string): unknown {
	if (typeof value === 'object') return value;
	try {
		return JSON.parse(value);
	} catch {
		throw new Error(message);
	}
}

/** removeEmptyProperties of the v1 node: drops '', undefined and empty objects. */
function removeEmpty(source: Record<string, unknown>): Record<string, unknown> {
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(source)) {
		if (value === '' || value === undefined) continue;
		if (isObject(value) && Object.keys(value).length === 0) continue;
		out[key] = value;
	}
	return out;
}

export default defineNode<OpenAiParameters>({
	type: '@n8n/n8n-nodes-langchain.openAi',
	version: 2.3,
	supports: {
		resource: 'text',
		operation: { text: 'response' },
		operations: {
			'text.response': [
				'modelId',
				'responses',
				'simplify',
				'options',
				'options.conversationId',
				'options.include',
				'options.instructions',
				'options.maxTokens',
				'options.maxToolCalls',
				'options.metadata',
				'options.parallelToolCalls',
				'options.previousResponseId',
				'options.promptCacheKey',
				'options.reasoning',
				'options.safetyIdentifier',
				'options.serviceTier',
				'options.store',
				'options.textFormat',
				'options.topLogprobs',
				'options.temperature',
				'options.topP',
				'options.truncation',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'text';
		const operation = parameters.operation ?? 'response';
		if (resource !== 'text' || operation !== 'response') {
			throw new Error(`OpenAI: ${resource}.${operation} is not in the compiled library`);
		}
		const model =
			typeof parameters.modelId === 'string'
				? parameters.modelId
				: (parameters.modelId?.value ?? '');
		const messages = parameters.responses?.values ?? [{ type: 'text' }];
		const options = parameters.options ?? {};
		const out: Item[] = [];
		for (const _item of items ?? [{}]) {
			const hasText = messages.some(
				(m) =>
					(m.type === 'text' || !m.type) &&
					typeof m.content === 'string' &&
					m.content.trim() !== '',
			);
			if (!hasText) throw new Error('A non-empty prompt is required.');
			// formatInputMessages of the v1 node, for text messages.
			let input: unknown[] = messages.map((m) => {
				if (m.type !== undefined && m.type !== 'text') {
					throw new Error(`OpenAI: messages of type "${m.type}" are not in the compiled library`);
				}
				const role = m.role ?? 'user';
				const content =
					role === 'assistant'
						? [{ type: 'output_text', text: m.content, annotations: [] }]
						: [{ type: 'input_text', text: m.content }];
				return { role, content };
			});
			// createRequest of the v1 node.
			const body: Record<string, unknown> = {
				model,
				input,
				parallel_tool_calls: options.parallelToolCalls ?? true,
				store: options.store ?? true,
				instructions: options.instructions,
				max_output_tokens: options.maxTokens,
				previous_response_id: options.previousResponseId,
				prompt_cache_key: options.promptCacheKey,
				safety_identifier: options.safetyIdentifier,
				service_tier: options.serviceTier,
				temperature: options.temperature,
				top_p: options.topP,
				top_logprobs: options.topLogprobs,
				tools: undefined,
				max_tool_calls: options.maxToolCalls,
				background: false,
			};
			if (options.truncation !== undefined)
				body.truncation = options.truncation ? 'auto' : 'disabled';
			if (options.conversationId) body.conversation = options.conversationId;
			if (Array.isArray(options.include) && options.include.length > 0)
				body.include = options.include;
			if (options.metadata) body.metadata = parseJson(options.metadata, 'Failed to parse metadata');
			if (options.reasoning) {
				const reasoning = options.reasoning.reasoningOptions ?? {};
				const summary = reasoning.summary ?? 'auto';
				body.reasoning = removeEmpty({
					effort: reasoning.effort ?? 'medium',
					summary: summary && summary !== 'none' ? summary : undefined,
				});
			}
			if (options.textFormat) {
				const text = options.textFormat.textOptions ?? {};
				const config: Record<string, unknown> = { verbosity: text.verbosity ?? 'medium' };
				const type = text.type ?? '';
				if (type === 'json_schema') {
					config.format = removeEmpty({
						type,
						name: text.name ?? 'my_schema',
						schema: parseJson(text.schema ?? '{}', 'Failed to parse schema'),
					});
				} else if (type === 'json_object') {
					config.format = { type };
					input = [
						{
							role: 'system',
							content: [
								{
									type: 'input_text',
									text: 'You are a helpful assistant designed to output JSON.',
								},
							],
						},
						...input,
					];
					body.input = input;
				} else if (type === 'text') {
					config.format = { type };
				}
				body.text = config;
			}
			const response = await ctx.http<Record<string, unknown>>({
				method: 'POST',
				url: '{{$credentials.url}}/responses',
				headers: {},
				qs: {},
				body: removeEmpty(body),
				credential,
			});
			if (response.status >= 400) throw new Error(`OpenAI: HTTP status ${response.status}`);
			const result = response.body;
			if (result.error === null) result.error = undefined;
			const output: OutputItem[] = [];
			if (Array.isArray(result.output)) {
				for (const entry of result.output) if (isObject(entry)) output.push(entry);
			}
			const format =
				isObject(body.text) && isObject(body.text.format) ? body.text.format.type : undefined;
			if (format === 'json_object' || format === 'json_schema') {
				try {
					for (const entry of output) {
						if (entry.type !== 'message') continue;
						for (const part of entry.content ?? []) {
							if (part.type === 'output_text') part.text = JSON.parse(String(part.text));
						}
					}
				} catch {
					// The v1 node keeps the text when it is not JSON.
				}
			}
			if (parameters.simplify ?? true) {
				out.push({ output: output.filter((entry) => entry.type === 'message') });
			} else {
				out.push(result);
			}
		}
		return out;
	},
});
