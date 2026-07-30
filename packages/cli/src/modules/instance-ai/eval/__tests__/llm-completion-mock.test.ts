interface CompletionStep {
	kind?: 'tool_call' | 'final';
	toolName?: string;
	toolArguments?: Record<string, unknown>;
	content?: string;
}

// Hoisted so the `vi.mock('@n8n/instance-ai')` factory below can resolve them.
const { submitQueue, submitCapture, promptCapture, mockGenerate, mockAgent, mockExtractText } =
	vi.hoisted(() => {
		const submitQueue: CompletionStep[] = [];
		const submitCapture: { handler?: (input: CompletionStep) => Promise<unknown> } = {};
		const promptCapture: { prompt?: string } = {};

		const mockGenerate = vi.fn(async (prompt: string) => {
			promptCapture.prompt = prompt;
			const next = submitQueue.shift();
			if (next && submitCapture.handler) await submitCapture.handler(next);
			return { messages: [], _text: '' };
		});

		const mockAgent = {
			tool: vi.fn(function (this: unknown, builtTool: { _name?: string; _handler?: unknown }) {
				if (builtTool._name === 'submit_agent_step') {
					submitCapture.handler = builtTool._handler as (input: CompletionStep) => Promise<unknown>;
				}
				return this;
			}),
			generate: mockGenerate,
		};

		const mockExtractText = vi.fn((result: { _text?: string }) => result._text ?? '');

		return { submitQueue, submitCapture, promptCapture, mockGenerate, mockAgent, mockExtractText };
	});

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function toolBuilderMock(name: string) {
	const built: { _name: string; _handler?: unknown } = { _name: name };
	return {
		description: vi.fn().mockReturnThis(),
		input: vi.fn().mockReturnThis(),
		handler: vi.fn(function (this: unknown, h: unknown) {
			built._handler = h;
			return this;
		}),
		build: vi.fn(() => built),
	};
}

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => mockAgent),
	extractText: mockExtractText,
	Tool: vi.fn().mockImplementation(toolBuilderMock),
}));

vi.mock('@n8n/di', () => ({
	Container: { get: vi.fn(() => mockLogger) },
	Service: () => (target: unknown) => target,
}));

import { Container } from '@n8n/di';
import { createEvalAgent, Tool } from '@n8n/instance-ai';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';

import { createLlmCompletionMockHandler } from '../llm-completion-mock';

// `restoreMocks: true` wipes factory `.mockImplementation`s before each test.
function reapplyMockImplementations() {
	vi.mocked(Container.get).mockReturnValue(mockLogger as never);
	vi.mocked(createEvalAgent).mockReturnValue(mockAgent as never);
	vi.mocked(Tool).mockImplementation(toolBuilderMock as never);
	mockAgent.tool.mockImplementation(function (
		this: unknown,
		builtTool: { _name?: string; _handler?: unknown },
	) {
		if (builtTool._name === 'submit_agent_step') {
			submitCapture.handler = builtTool._handler as (input: CompletionStep) => Promise<unknown>;
		}
		return this;
	});
	mockGenerate.mockImplementation(async (prompt: string) => {
		promptCapture.prompt = prompt;
		const next = submitQueue.shift();
		if (next && submitCapture.handler) await submitCapture.handler(next);
		return { messages: [], _text: '' };
	});
	mockExtractText.mockImplementation((result: { _text?: string }) => result._text ?? '');
}

const node = {
	name: 'My Agent',
	type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
} as unknown as INode;

function chatRequest(body: unknown): IHttpRequestOptions {
	return {
		url: 'http://127.0.0.1/eval/My%20Agent/v1/chat/completions',
		method: 'POST',
		body,
	} as unknown as IHttpRequestOptions;
}

function responsesRequest(body: unknown): IHttpRequestOptions {
	return {
		url: 'http://127.0.0.1/eval/My%20Agent/v1/responses',
		method: 'POST',
		body,
	} as unknown as IHttpRequestOptions;
}

const strictSchema = {
	type: 'object',
	properties: { category: { type: 'string' } },
	additionalProperties: false,
};

beforeEach(() => {
	submitQueue.length = 0;
	submitCapture.handler = undefined;
	promptCapture.prompt = undefined;
	reapplyMockImplementations();
});

describe('createLlmCompletionMockHandler', () => {
	it('emits a tool_calls shorthand when the model calls a tool', async () => {
		submitQueue.push({ kind: 'tool_call', toolName: 'search_web', toolArguments: { q: 'x' } });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(
			chatRequest({
				messages: [{ role: 'user', content: 'hi' }],
				tools: [{ type: 'function', function: { name: 'search_web', parameters: {} } }],
			}),
			node,
		);

		expect(res?.statusCode).toBe(200);
		expect(res?.body).toEqual({ tool_calls: [{ name: 'search_web', arguments: { q: 'x' } }] });
	});

	it('lets a named tool win even when the step is labeled "final"', async () => {
		submitQueue.push({
			kind: 'final',
			toolName: 'format_response',
			toolArguments: { text: 'x' },
			content: 'ignored',
		});
		const handler = createLlmCompletionMockHandler();

		const res = await handler(
			chatRequest({
				messages: [{ role: 'user', content: 'hi' }],
				tools: [{ type: 'function', function: { name: 'format_response', parameters: {} } }],
			}),
			node,
		);

		expect(res?.body).toEqual({
			tool_calls: [{ name: 'format_response', arguments: { text: 'x' } }],
		});
	});

	it('emits content for a final answer', async () => {
		submitQueue.push({ kind: 'final', content: 'done' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'done' });
	});

	it('falls back to raw text (and warns) when the model never submits a step', async () => {
		mockGenerate.mockImplementation(async (prompt: string) => {
			promptCapture.prompt = prompt;
			return { messages: [], _text: 'raw fallback text' };
		});
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'raw fallback text' });
		expect(mockLogger.warn).toHaveBeenCalled();
	});

	it('unwraps a chat.completion envelope the model wrongly returns as content', async () => {
		const envelope = JSON.stringify({
			id: 'chatcmpl-x',
			object: 'chat.completion',
			created: 1,
			model: 'gpt',
			choices: [
				{ index: 0, message: { role: 'assistant', content: '{"image_prompt":"a red bike"}' } },
			],
		});
		submitQueue.push({ kind: 'final', content: envelope });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: '{"image_prompt":"a red bike"}' });
	});

	it('unwraps a responses-API envelope the model wrongly returns as content', async () => {
		const envelope = JSON.stringify({
			id: 'resp_x',
			object: 'response',
			status: 'completed',
			output: [
				{
					type: 'message',
					role: 'assistant',
					content: [{ type: 'output_text', text: 'the answer' }],
				},
			],
		});
		submitQueue.push({ kind: 'final', content: envelope });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'the answer' });
	});

	it('unwraps a provider envelope in the raw-text fallback too', async () => {
		const envelope = JSON.stringify({
			object: 'chat.completion',
			choices: [{ message: { role: 'assistant', content: 'fb answer' } }],
		});
		mockGenerate.mockImplementation(async (prompt: string) => {
			promptCapture.prompt = prompt;
			return { messages: [], _text: envelope };
		});
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'fb answer' });
	});

	it('leaves a plain structured-JSON answer unchanged (no false-positive unwrap)', async () => {
		submitQueue.push({ kind: 'final', content: '{"image_prompt":"a red bike"}' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: '{"image_prompt":"a red bike"}' });
	});

	it('feeds the available tools and conversation (incl. tool-result state) into the prompt', async () => {
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		await handler(
			chatRequest({
				messages: [
					{ role: 'user', content: 'analyze this' },
					{ role: 'tool', content: 'result data' },
				],
				tools: [
					{
						type: 'function',
						function: { name: 'fetch_data', description: 'gets data', parameters: {} },
					},
				],
			}),
			node,
		);

		expect(promptCapture.prompt).toContain('fetch_data');
		expect(promptCapture.prompt).toContain('analyze this');
		expect(promptCapture.prompt).toContain('Tool results ARE present');
	});

	it('conforms final content to a declared structured-output schema (drops undeclared fields)', async () => {
		submitQueue.push({ kind: 'final', content: '{"category":"bug","subject":"extra"}' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(
			responsesRequest({
				input: [{ role: 'user', content: 'classify this' }],
				text: { format: { type: 'json_schema', name: 'c', schema: strictSchema } },
			}),
			node,
		);

		expect(res?.body).toEqual({ content: '{"category":"bug"}' });
	});

	it('injects the declared structured-output schema into the mock prompt', async () => {
		submitQueue.push({ kind: 'final', content: '{}' });
		const handler = createLlmCompletionMockHandler();

		await handler(
			responsesRequest({
				input: [{ role: 'user', content: 'classify this' }],
				text: {
					format: {
						type: 'json_schema',
						name: 'c',
						schema: {
							type: 'object',
							properties: { client_project: { type: 'boolean' }, ignore: { type: 'boolean' } },
							additionalProperties: false,
						},
					},
				},
			}),
			node,
		);

		expect(promptCapture.prompt).toContain('client_project');
		expect(promptCapture.prompt?.toLowerCase()).toContain('schema');
	});

	it('leaves final content unchanged when the request declares no schema', async () => {
		submitQueue.push({ kind: 'final', content: '{"category":"bug","subject":"kept"}' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(responsesRequest({ input: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: '{"category":"bug","subject":"kept"}' });
	});
});
