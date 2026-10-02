import {
	provider,
	type Action,
	type ChatModel,
	type ChatReply,
	type ChatRequest,
	type JsonSchema,
	type Memory,
	type Tool,
} from '@n8n/node-sdk';
import { mockHttp, runAction } from '@n8n/node-sdk/testing';

import { runAgent } from '../nodes/ai/actions/agent';
import { classifyText } from '../nodes/ai/actions/classify';
import { promptModel } from '../nodes/ai/actions/prompt';
import { anthropicChatModel } from '../nodes/anthropic/actions/chat-model';
import { geminiChatModel } from '../nodes/google-gemini/actions/chat-model';
import { openAiChatModel } from '../nodes/open-ai/actions/chat-model';

const reply = (text: string, toolCalls: ChatReply['toolCalls'] = []): ChatReply => ({
	text,
	toolCalls,
	finishReason: toolCalls.length ? 'tool_calls' : 'stop',
});

/** A model that answers with `replies` in order and records each request. */
function scripted(replies: readonly ChatReply[]) {
	const requests: ChatRequest[] = [];
	const model: ChatModel = {
		model: 'scripted',
		chat: async (request) => {
			requests.push(request);
			const next = replies[requests.length - 1];
			if (!next) throw new Error('No reply left');
			return next;
		},
	};
	return { model, requests };
}

const tool = (name: string, call: Tool['call']): Tool => ({
	name,
	description: `The ${name} tool`,
	input: { type: 'object', properties: { id: { type: 'number' } } },
	call,
});

describe('ai.agent', () => {
	it('gives tool results and tool errors back to the model, then answers', async () => {
		const { model, requests } = scripted([
			reply('', [
				{ id: 'c1', name: 'order', args: { id: 7 } },
				{ id: 'c2', name: 'refund', args: { id: 7 } },
				{ id: 'c3', name: 'missing', args: {} },
			]),
			reply('Order 7 shipped; the refund failed.'),
		]);
		const order = tool('order', async () => ({ status: 'shipped' }));
		const refund = tool('refund', async () => await Promise.reject(new Error('Not allowed')));
		const result = await runAction(runAgent, {
			input: { prompt: 'Order 7?', system: 'Be short' },
			providers: { chatModel: model, tool: [order, refund] },
		});
		expect(result).toEqual({ ok: true, items: [{ text: 'Order 7 shipped; the refund failed.' }] });
		expect(requests[0]?.tools?.map(({ name }) => name)).toEqual(['order', 'refund']);
		expect(requests[1]?.messages.slice(2)).toEqual([
			{
				role: 'assistant',
				content: '',
				toolCalls: [
					{ id: 'c1', name: 'order', args: { id: 7 } },
					{ id: 'c2', name: 'refund', args: { id: 7 } },
					{ id: 'c3', name: 'missing', args: {} },
				],
			},
			{ role: 'tool', toolCallId: 'c1', name: 'order', content: '{"status":"shipped"}' },
			{ role: 'tool', toolCallId: 'c2', name: 'refund', content: '{"error":"Not allowed"}' },
			{
				role: 'tool',
				toolCallId: 'c3',
				name: 'missing',
				content: '{"error":"There is no tool named missing"}',
			},
		]);
	});

	it('stops after maxIterations model calls', async () => {
		const call = reply('', [{ id: 'c', name: 'order', args: {} }]);
		const { model } = scripted([call, call, call]);
		const result = await runAction(runAgent, {
			input: { prompt: 'Loop', maxIterations: 2 },
			providers: { chatModel: model, tool: [tool('order', async () => 'ok')] },
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: 'The agent made 2 model calls and has no answer yet' },
		});
	});

	it('reads the history from memory and saves the new turn', async () => {
		const saved: unknown[] = [];
		const memory: Memory = {
			load: async () => [
				{ role: 'user', content: 'My name is Ada' },
				{ role: 'assistant', content: 'Hi Ada' },
			],
			save: async (messages) => {
				saved.push(...messages);
			},
		};
		const { model, requests } = scripted([reply('Your name is Ada.')]);
		await runAction(runAgent, {
			input: { prompt: 'What is my name?', system: 'Be kind' },
			providers: { chatModel: model, memory },
		});
		expect(requests[0]?.messages.map(({ role }) => role)).toEqual([
			'system',
			'user',
			'assistant',
			'user',
		]);
		expect(saved).toEqual([
			{ role: 'user', content: 'What is my name?' },
			{ role: 'assistant', content: 'Your name is Ada.' },
		]);
	});

	it('refuses two tools with one name', async () => {
		const { model } = scripted([reply('x')]);
		const result = await runAction(runAgent, {
			input: { prompt: 'Hi' },
			providers: {
				chatModel: model,
				tool: [tool('order', async () => 1), tool('order', async () => 2)],
			},
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('Two tools are named order') },
		});
	});
});

describe('ai.prompt', () => {
	const schema = {
		type: 'object',
		properties: { colour: { type: 'string' } },
		required: ['colour'],
	};

	it('asks for the schema and parses the reply', async () => {
		const { model, requests } = scripted([reply('{"colour":"red"}')]);
		const result = await runAction(promptModel, {
			input: { prompt: 'A colour', schema },
			providers: { chatModel: model },
		});
		expect(result).toEqual({
			ok: true,
			items: [{ text: '{"colour":"red"}', output: { colour: 'red' } }],
		});
		expect(requests[0]?.output).toEqual(schema);
	});

	it('fails on a reply that does not match the schema', async () => {
		const { model } = scripted([reply('{"color":"red"}')]);
		const result = await runAction(promptModel, {
			input: { prompt: 'A colour', schema },
			providers: { chatModel: model },
		});
		expect(result).toMatchObject({
			ok: false,
			error: {
				message: expect.stringContaining(
					'The model reply does not match the schema: output.colour: is required',
				),
			},
		});
	});

	it('fails on a reply cut off by the token limit', async () => {
		const { model } = scripted([{ text: 'Half a sen', toolCalls: [], finishReason: 'length' }]);
		const result = await runAction(promptModel, {
			input: { prompt: 'Hi' },
			providers: { chatModel: model },
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: 'scripted reached its token limit before it finished the reply' },
		});
	});

	it('types the output field by the schema', () => {
		// The build passes the parameters only; sub-nodes are connections.
		const { model } = scripted([]);
		const schema = { type: 'object', properties: {} } as const;
		expect(promptModel.deriveOutput?.({ model, prompt: 'x', schema })).toMatchObject({
			properties: { output: { type: 'object', properties: {} } },
			required: ['text', 'output'],
		});
		expect(promptModel.deriveOutput?.({ model, prompt: 'x' })?.properties).toEqual({
			text: { type: 'string', 'x-n8n-hint': 'The reply text' },
		});
	});
});

describe('ai.classify', () => {
	it('routes an item to every category it fits when multiple is set', async () => {
		const { model, requests } = scripted([reply('{"categories":["praise","question"]}')]);
		const result = await runAction(classifyText, {
			input: {
				text: 'Love it, does it come in blue?',
				categories: [{ output: 'complaint' }, { output: 'praise' }, { output: 'question' }],
				multiple: true,
			},
			items: [{ id: 1 }],
			providers: { chatModel: model },
		});
		expect(result).toMatchObject({ ok: true, outputs: [[], [{ id: 1 }], [{ id: 1 }], []] });
		expect(requests[0]?.output).toEqual({
			type: 'object',
			properties: {
				categories: { type: 'array', items: { enum: ['complaint', 'praise', 'question'] } },
			},
			required: ['categories'],
			additionalProperties: false,
		});
	});

	it('fails on a category the model invents', async () => {
		const { model } = scripted([reply('{"categories":["spam"]}')]);
		const result = await runAction(classifyText, {
			input: { text: 'Buy now', categories: [{ output: 'complaint' }] },
			providers: { chatModel: model },
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('output.categories[0]') },
		});
	});

	it('fails before the model call on a category named other', async () => {
		const { model, requests } = scripted([]);
		const result = await runAction(classifyText, {
			input: { text: 'Hi', categories: [{ output: 'other' }] },
			providers: { chatModel: model },
		});
		expect(result).toMatchObject({
			ok: false,
			error: { message: expect.stringContaining('No category can be named "other"') },
		});
		expect(requests).toEqual([]);
	});
});

/** Runs a chat model sub-node and makes one chat call through it. */
async function chatThrough(
	action: Action,
	input: Record<string, unknown>,
	credential: { type: string; data: Record<string, unknown> },
	request: ChatRequest,
	body: unknown,
) {
	const http = mockHttp([{ method: 'POST', path: '', reply: { json: body } }]);
	// The body mapping is under test, so the credential signs nothing.
	const credentials = [{ name: credential.type, displayName: credential.type, properties: [] }];
	const result = await runAction(action, { input, credential, credentials, fetch: http });
	const model = result.ok ? result.items[0] : undefined;
	if (!provider.is('chatModel', model)) throw new Error(JSON.stringify(result));
	const answer = await model.chat(request);
	return { answer, call: http.calls[0] };
}

const conversation: ChatRequest = {
	messages: [
		{ role: 'system', content: 'Be short' },
		{ role: 'user', content: 'Order 7?' },
		{ role: 'assistant', content: '', toolCalls: [{ id: 'c1', name: 'order', args: { id: 7 } }] },
		{ role: 'tool', toolCallId: 'c1', name: 'order', content: '{"status":"shipped"}' },
	],
	tools: [
		{
			name: 'order',
			description: 'Get an order',
			input: { type: 'object', properties: { id: { type: 'number' } } },
		},
	],
};

const colourSchema: JsonSchema = {
	type: 'object',
	properties: { colour: { type: 'string' } },
	required: ['colour'],
};

describe('chat model sub-nodes', () => {
	it('map a tool conversation to Chat Completions', async () => {
		const { call } = await chatThrough(
			openAiChatModel,
			{ model: 'gpt-5-mini', maxTokens: 100 },
			{ type: 'openAiApi', data: { apiKey: 'k' } },
			conversation,
			{ choices: [{ message: { content: 'Shipped' }, finish_reason: 'stop' }] },
		);
		expect(call?.url).toBe('https://api.openai.com/v1/chat/completions');
		expect(call?.body).toEqual({
			model: 'gpt-5-mini',
			messages: [
				{ role: 'system', content: 'Be short' },
				{ role: 'user', content: 'Order 7?' },
				{
					role: 'assistant',
					content: '',
					tool_calls: [
						{ id: 'c1', type: 'function', function: { name: 'order', arguments: '{"id":7}' } },
					],
				},
				{ role: 'tool', tool_call_id: 'c1', content: '{"status":"shipped"}' },
			],
			tools: [
				{
					type: 'function',
					function: {
						name: 'order',
						description: 'Get an order',
						parameters: { type: 'object', properties: { id: { type: 'number' } } },
					},
				},
			],
			max_completion_tokens: 100,
		});
	});

	it('map a tool conversation to the Gemini API', async () => {
		const { call } = await chatThrough(
			geminiChatModel,
			{ model: 'gemini-2.5-flash' },
			{ type: 'googlePalmApi', data: { apiKey: 'k' } },
			conversation,
			{ candidates: [{ content: { parts: [{ text: 'Shipped' }] }, finishReason: 'STOP' }] },
		);
		expect(call?.path).toBe('/v1beta/models/gemini-2.5-flash:generateContent');
		expect(call?.body).toMatchObject({
			systemInstruction: { parts: [{ text: 'Be short' }] },
			contents: [
				{ role: 'user', parts: [{ text: 'Order 7?' }] },
				{ role: 'model', parts: [{ functionCall: { name: 'order', args: { id: 7 } } }] },
				{
					role: 'user',
					parts: [{ functionResponse: { name: 'order', response: { status: 'shipped' } } }],
				},
			],
			tools: [{ functionDeclarations: [{ name: 'order', description: 'Get an order' }] }],
		});
	});

	it('map a tool conversation to the Anthropic Messages API, one user turn for the results', async () => {
		const { call, answer } = await chatThrough(
			anthropicChatModel,
			{ model: 'claude-sonnet-4-5' },
			{ type: 'anthropicApi', data: { apiKey: 'k' } },
			conversation,
			{ content: [{ type: 'text', text: 'Shipped' }], stop_reason: 'end_turn' },
		);
		expect(call?.headers['anthropic-version']).toBe('2023-06-01');
		expect(call?.body).toMatchObject({
			model: 'claude-sonnet-4-5',
			max_tokens: 4096,
			system: 'Be short',
			messages: [
				{ role: 'user', content: 'Order 7?' },
				{
					role: 'assistant',
					content: [{ type: 'tool_use', id: 'c1', name: 'order', input: { id: 7 } }],
				},
				{
					role: 'user',
					content: [{ type: 'tool_result', tool_use_id: 'c1', content: '{"status":"shipped"}' }],
				},
			],
			tools: [{ name: 'order', description: 'Get an order', input_schema: { type: 'object' } }],
		});
		expect(answer).toEqual({ text: 'Shipped', toolCalls: [], finishReason: 'stop' });
	});

	it('force the Anthropic output tool for a structured reply and keep only the answer', async () => {
		const { call, answer } = await chatThrough(
			anthropicChatModel,
			{ model: 'claude-sonnet-4-5' },
			{ type: 'anthropicApi', data: { apiKey: 'k' } },
			{ messages: [{ role: 'user', content: 'Colour?' }], output: colourSchema },
			{
				content: [
					{ type: 'tool_use', id: 't1', name: 'order', input: { id: 7 } },
					{ type: 'tool_use', id: 't2', name: '__n8n_output', input: { colour: 'red' } },
				],
				stop_reason: 'tool_use',
			},
		);
		expect(call?.body).toMatchObject({
			tools: [{ name: '__n8n_output', input_schema: colourSchema }],
			tool_choice: { type: 'tool', name: '__n8n_output' },
		});
		expect(answer).toEqual({ text: '{"colour":"red"}', toolCalls: [], finishReason: 'stop' });
	});

	it('ask Gemini for JSON by schema for a structured reply', async () => {
		const { call, answer } = await chatThrough(
			geminiChatModel,
			{ model: 'gemini-2.5-flash', temperature: 0.2 },
			{ type: 'googlePalmApi', data: { apiKey: 'k' } },
			{ messages: [{ role: 'user', content: 'Colour?' }], output: colourSchema },
			{
				candidates: [{ content: { parts: [{ text: '{"colour":"red"}' }] }, finishReason: 'STOP' }],
			},
		);
		expect(call?.body).toMatchObject({
			generationConfig: {
				temperature: 0.2,
				responseMimeType: 'application/json',
				responseJsonSchema: colourSchema,
			},
		});
		expect(answer).toEqual({ text: '{"colour":"red"}', toolCalls: [], finishReason: 'stop' });
	});

	it.each([
		['MAX_TOKENS', 'length'],
		['SAFETY', 'content_filter'],
		['OTHER', 'OTHER'],
	])('map the Gemini finish reason %s to %s', async (reason, finishReason) => {
		const { answer } = await chatThrough(
			geminiChatModel,
			{ model: 'gemini-2.5-flash' },
			{ type: 'googlePalmApi', data: { apiKey: 'k' } },
			{ messages: [{ role: 'user', content: 'Hi' }] },
			{ candidates: [{ content: { parts: [{ text: 'Hel' }] }, finishReason: reason }] },
		);
		expect(answer.finishReason).toBe(finishReason);
	});
});
