interface CompletionStep {
	kind?: 'tool_call' | 'final';
	toolName?: string;
	toolArguments?: Record<string, unknown>;
	content?: string;
	structuredContent?: Record<string, unknown>;
}

// Hoisted so the module mock factories below can resolve them.
const {
	submitQueue,
	submitCapture,
	promptCapture,
	mockGenerate,
	mockAgent,
	mockExtractText,
	extractTextLikeReal,
} = vi.hoisted(() => {
	const submitQueue: CompletionStep[] = [];
	const submitCapture: {
		handler?: (input: CompletionStep) => Promise<unknown>;
		endsTurn?: (output: unknown) => boolean;
	} = {};
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

	// Mirrors the real `extractText`: a run that ended in an error throws that error.
	const extractTextLikeReal = (result: {
		_text?: string;
		finishReason?: string;
		error?: unknown;
	}) => {
		if (result.finishReason === 'error') {
			throw result.error instanceof Error ? result.error : new Error(String(result.error));
		}
		return result._text ?? '';
	};
	const mockExtractText = vi.fn(extractTextLikeReal);

	return {
		submitQueue,
		submitCapture,
		promptCapture,
		mockGenerate,
		mockAgent,
		mockExtractText,
		extractTextLikeReal,
	};
});

const mockLogger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };

function toolBuilderMock(name: string) {
	const built: { _name: string; _handler?: unknown; _endsTurn?: (output: unknown) => boolean } = {
		_name: name,
	};
	return {
		description: vi.fn().mockReturnThis(),
		input: vi.fn().mockReturnThis(),
		handler: vi.fn(function (this: unknown, h: unknown) {
			built._handler = h;
			return this;
		}),
		endsTurnWhen: vi.fn(function (this: unknown, fn: (output: unknown) => boolean) {
			built._endsTurn = fn;
			return this;
		}),
		build: vi.fn(() => built),
	};
}

vi.mock('@n8n/instance-ai', () => ({
	createEvalAgent: vi.fn(() => mockAgent),
	extractText: mockExtractText,
}));

vi.mock('@n8n/agents/tool', () => ({
	Tool: vi.fn().mockImplementation(toolBuilderMock),
}));

vi.mock('@n8n/di', () => ({
	Container: { get: vi.fn(() => mockLogger) },
	Service: () => (target: unknown) => target,
}));

import { Tool } from '@n8n/agents/tool';
import { Container } from '@n8n/di';
import { createEvalAgent } from '@n8n/instance-ai';
import { OperationalError } from 'n8n-workflow';
import type { IHttpRequestOptions, INode } from 'n8n-workflow';
import { jsonParse } from 'n8n-workflow';

import { createLlmCompletionMockHandler } from '../llm-completion-mock';

// `restoreMocks: true` wipes factory `.mockImplementation`s before each test.
function reapplyMockImplementations() {
	vi.mocked(Container.get).mockReturnValue(mockLogger as never);
	vi.mocked(createEvalAgent).mockReturnValue(mockAgent as never);
	vi.mocked(Tool).mockImplementation(toolBuilderMock as never);
	mockAgent.tool.mockImplementation(function (
		this: unknown,
		builtTool: { _name?: string; _handler?: unknown; _endsTurn?: (output: unknown) => boolean },
	) {
		if (builtTool._name === 'submit_agent_step') {
			submitCapture.handler = builtTool._handler as (input: CompletionStep) => Promise<unknown>;
			submitCapture.endsTurn = builtTool._endsTurn;
		}
		return this;
	});
	mockGenerate.mockImplementation(async (prompt: string) => {
		promptCapture.prompt = prompt;
		const next = submitQueue.shift();
		if (next && submitCapture.handler) await submitCapture.handler(next);
		return { messages: [], _text: '' };
	});
	mockExtractText.mockImplementation(extractTextLikeReal);
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
	mockGenerate.mockClear();
	mockLogger.warn.mockClear();
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

	it('ends the model loop once a step is accepted, but not after a rejected step', async () => {
		const handler = createLlmCompletionMockHandler();
		submitQueue.push({ kind: 'final', content: 'Hello' });
		await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(submitCapture.endsTurn?.('Accepted.')).toBe(true);
		expect(submitCapture.endsTurn?.('Invalid: kind="tool_call" requires toolName.')).toBe(false);
	});

	it('rejects a tool name the request does not declare, so the model can retry', async () => {
		const handler = createLlmCompletionMockHandler();
		// No step is queued, so the run accepts nothing and throws; only the submit tool matters here.
		await expect(
			handler(
				chatRequest({
					messages: [{ role: 'user', content: 'hi' }],
					tools: [{ type: 'function', function: { name: 'search_web', parameters: {} } }],
				}),
				node,
			),
		).rejects.toThrow(OperationalError);

		expect(await submitCapture.handler?.({ kind: 'tool_call', toolName: 'web_search' })).toMatch(
			/^Invalid:/,
		);
		expect(await submitCapture.handler?.({ kind: 'tool_call', toolName: 'search_web' })).toBe(
			'Accepted.',
		);
	});

	it('rejects a final step with no content, so the turn never ends empty', async () => {
		const handler = createLlmCompletionMockHandler();
		// No step is queued, so the run accepts nothing and throws; only the submit tool matters here.
		await expect(
			handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node),
		).rejects.toThrow(OperationalError);

		expect(await submitCapture.handler?.({ kind: 'final' })).toMatch(/^Invalid:/);
		expect(await submitCapture.handler?.({ kind: 'final', content: '' })).toMatch(/^Invalid:/);
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

	it('asks again after a rejected submit and returns the next accepted step', async () => {
		submitQueue.push({ kind: 'tool_call', content: 'draft' });
		submitQueue.push({ kind: 'final', content: 'The Daily Dragon: 3 stories' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(
			chatRequest({ messages: [{ role: 'user', content: 'Write the newsletter' }] }),
			node,
		);

		expect(res?.body).toEqual({ content: 'The Daily Dragon: 3 stories' });
		expect(mockGenerate).toHaveBeenCalledTimes(2);
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('requires toolName');
		expect(warning).toContain('"draft"');
		expect(promptCapture.prompt).toContain('## Previous attempt');
		expect(promptCapture.prompt).toContain('requires toolName');
	});

	it('throws instead of answering with empty text when no attempt submits an accepted step', async () => {
		submitQueue.push({ kind: 'tool_call' }, { kind: 'tool_call' }, { kind: 'tool_call' });
		const handler = createLlmCompletionMockHandler();

		await expect(
			handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node),
		).rejects.toThrow(/no accepted submit_agent_step for "My Agent" after 2 attempts/);
		expect(mockGenerate).toHaveBeenCalledTimes(2);
	});

	it('logs a submit that failed input validation, with the finish reason', async () => {
		mockGenerate.mockImplementationOnce((async () => ({
			finishReason: 'stop',
			messages: [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'call-1',
							toolName: 'submit_agent_step',
							state: 'rejected',
							input: { kind: 'final', content: { html: '<p>x</p>' } },
							error: 'Invalid tool input: content: Expected string, received object',
						},
					],
				},
			],
			_text: '',
		})) as never);
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'ok' });
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('finishReason=stop');
		expect(warning).toContain('Invalid tool input');
		expect(warning).toContain('<p>x</p>');
	});

	it('asks again, then throws, when no attempt calls submit_agent_step or writes text', async () => {
		mockGenerate.mockImplementation((async (prompt: string) => {
			promptCapture.prompt = prompt;
			return {
				finishReason: 'stop',
				messages: [{ role: 'assistant', content: [{ type: 'text', text: '' }] }],
				_text: '',
			};
		}) as never);
		const handler = createLlmCompletionMockHandler();

		const run = handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		await expect(run).rejects.toThrow(OperationalError);
		await expect(run).rejects.toThrow(/none \(no submit_agent_step call\)/);
		expect(mockGenerate).toHaveBeenCalledTimes(2);
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('attempt 2/2');
		expect(warning).toContain('rejected: none (no submit_agent_step call)');
		expect(promptCapture.prompt).toContain('## Previous attempt');
		expect(promptCapture.prompt).toContain('none (no submit_agent_step call)');
	});

	it('logs a submit that was cut off and left without a result', async () => {
		mockGenerate.mockImplementationOnce((async () => ({
			finishReason: 'length',
			messages: [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'call-1',
							toolName: 'submit_agent_step',
							state: 'pending',
							input: { kind: 'final', content: 'The Daily Drag' },
						},
					],
				},
			],
			_text: '',
		})) as never);
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'ok' });
		expect(mockGenerate).toHaveBeenCalledTimes(2);
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('finishReason=length');
		expect(warning).toContain('call left pending');
		expect(warning).toContain('The Daily Drag');
	});

	it('truncates a long rejected input in the log', async () => {
		submitQueue.push({ kind: 'tool_call', content: 'x'.repeat(5000) });
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).not.toContain('x'.repeat(600));
		expect(warning.length).toBeLessThan(2000);
	});

	it('asks again after a final step with no content', async () => {
		submitQueue.push({ kind: 'final' });
		submitQueue.push({ kind: 'final', content: 'Done.' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'Done.' });
		expect(mockGenerate).toHaveBeenCalledTimes(2);
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('kind="final" requires content');
	});

	it('logs the run error and rethrows it, without asking again, when an attempt ends in an error', async () => {
		mockGenerate.mockImplementationOnce((async () => ({
			finishReason: 'error',
			error: new Error('provider timed out'),
			messages: [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'call-1',
							toolName: 'submit_agent_step',
							state: 'rejected',
							input: { kind: 'final', content: { html: '<p>x</p>' } },
							error: 'Invalid tool input: content: Expected string, received object',
						},
					],
				},
			],
			_text: '',
		})) as never);
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		await expect(
			handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node),
		).rejects.toThrow('provider timed out');
		expect(mockGenerate).toHaveBeenCalledTimes(1);
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('attempt 1/2');
		expect(warning).toContain('finishReason=error');
		expect(warning).toContain('error=Error: provider timed out');
		expect(warning).toContain('Invalid tool input');
	});

	it('redacts secrets in the run error and rejected submits before the log caps them', async () => {
		const apiKey = 'sk-proj-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		const bearer = 'eyJhbGciOiJIUzI1NiJ9abcdefghijklmnopqrstuvwxyz';
		// The key starts just before the 500-character cap: a cap that runs before
		// the scrub keeps its leading bytes.
		const longError = `${'a'.repeat(470)} ${apiKey}`;
		mockGenerate.mockImplementationOnce((async () => ({
			finishReason: 'error',
			error: new Error(`401 from provider: ${longError}`),
			messages: [
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'call-1',
							toolName: 'submit_agent_step',
							state: 'rejected',
							input: {
								kind: 'final',
								content: { apiKey },
								note: `Authorization: Bearer ${bearer}`,
							},
							error: `Invalid tool input for key ${apiKey}`,
						},
					],
				},
			],
			_text: '',
		})) as never);
		const handler = createLlmCompletionMockHandler();

		await expect(
			handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node),
		).rejects.toThrow('401 from provider');
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('finishReason=error');
		expect(warning).not.toContain('sk-proj-');
		expect(warning).not.toContain(apiKey.slice(0, 20));
		expect(warning).not.toContain(bearer.slice(0, 20));
		expect(warning).toContain('<redacted>');
	});

	it('redacts secrets in a rejected submit from the log and the re-ask prompt', async () => {
		const apiKey = 'sk-ant-ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		submitQueue.push({ kind: 'tool_call', content: `use api_key=${apiKey}` });
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		const res = await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		expect(res?.body).toEqual({ content: 'ok' });
		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('kind="tool_call" requires toolName');
		expect(warning).not.toContain(apiKey.slice(0, 20));
		expect(promptCapture.prompt).toContain('## Previous attempt');
		expect(promptCapture.prompt).not.toContain(apiKey.slice(0, 20));
	});

	it('caps the total length of the rejected list in the log', async () => {
		const rejectedPart = (i: number) => ({
			type: 'tool-call',
			toolCallId: `call-${i}`,
			toolName: 'submit_agent_step',
			state: 'rejected',
			input: { kind: 'final', content: { html: `<p>${'y'.repeat(400)}</p>` } },
			error: `Invalid tool input #${i}: ${'z'.repeat(400)}`,
		});
		mockGenerate.mockImplementationOnce((async () => ({
			finishReason: 'stop',
			messages: [
				{ role: 'assistant', content: Array.from({ length: 20 }, (_, i) => rejectedPart(i)) },
			],
			_text: '',
		})) as never);
		submitQueue.push({ kind: 'final', content: 'ok' });
		const handler = createLlmCompletionMockHandler();

		await handler(chatRequest({ messages: [{ role: 'user', content: 'hi' }] }), node);

		const warning = String(mockLogger.warn.mock.calls.at(-1)?.[0]);
		expect(warning).toContain('Invalid tool input #0');
		expect(warning).toContain('Invalid tool input #19');
		expect(warning).toContain('(+18 more)');
		expect(warning.length).toBeLessThan(3000);
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

	it('serializes a structured final answer, so quotes inside its values stay valid JSON', async () => {
		submitQueue.push({
			kind: 'final',
			structuredContent: { output: { html: '<p>Say <em>"just arrived"</em></p>' } },
		});
		const handler = createLlmCompletionMockHandler();

		const res = await handler(
			chatRequest({ messages: [{ role: 'user', content: 'write' }] }),
			node,
		);

		const content = (res?.body as { content: string }).content;
		expect(jsonParse(content)).toEqual({ output: { html: '<p>Say <em>"just arrived"</em></p>' } });
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
