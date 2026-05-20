import type { Logger } from '@n8n/backend-common';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';

import { type InterceptedTurn, LlmWireServer } from '../llm-wire-server';

async function postChatCompletion(url: string, path: string, body: unknown): Promise<Response> {
	return await fetch(`${url}${path}`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

function makeSubNode(overrides: Partial<INode> & { name: string }): INode {
	return {
		id: `node-${overrides.name}`,
		typeVersion: 1,
		position: [0, 0] as [number, number],
		parameters: {},
		type: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
		...overrides,
	};
}

describe('LlmWireServer', () => {
	let server: LlmWireServer;

	afterEach(async () => {
		await server?.stop();
	});

	describe('lifecycle', () => {
		beforeEach(() => {
			server = new LlmWireServer();
		});

		it('binds to 127.0.0.1 on an OS-assigned port', async () => {
			const url = await server.start();
			expect(url).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
			expect(server.url).toBe(url);
		});

		it('start() is idempotent — second call returns the same URL', async () => {
			const url1 = await server.start();
			const url2 = await server.start();
			expect(url2).toBe(url1);
		});

		it('stop() is a no-op when the server was never started', async () => {
			await expect(server.stop()).resolves.toBeUndefined();
		});

		it('throws when url is accessed before start() resolves', () => {
			expect(() => server.url).toThrow('start() resolved');
		});

		it('binds two independent instances to different ports', async () => {
			const second = new LlmWireServer();
			try {
				const urlA = await server.start();
				const urlB = await second.start();
				expect(urlA).not.toBe(urlB);
			} finally {
				await second.stop();
			}
		});
	});

	describe('POST /eval/:root/v1/chat/completions — stub fallback', () => {
		beforeEach(() => {
			server = new LlmWireServer();
		});

		it('returns a chat.completion envelope when no mock handler is attached', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: 'hi' }],
			});
			const body = (await response.json()) as Record<string, unknown>;

			expect(response.status).toBe(200);
			expect(body.object).toBe('chat.completion');
			expect(body.model).toBe('gpt-4o-mini');
			const choice = (body.choices as Array<{ message: { content: string } }>)[0];
			expect(choice.message.content).toContain('eval wire server stub');
		});

		it('echoes the request model in the stub envelope', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-5',
				messages: [],
			});
			const body = (await response.json()) as Record<string, unknown>;

			expect(body.model).toBe('gpt-5');
		});
	});

	describe('POST /eval/:root/v1/chat/completions — mock handler integration', () => {
		const subNode = makeSubNode({ name: 'OpenAI Chat Model' });

		it('calls the mock handler with the synthetic OpenAI request shape', async () => {
			const mockHandler = jest
				.fn<ReturnType<EvalLlmMockHandler>, Parameters<EvalLlmMockHandler>>()
				.mockResolvedValue({
					body: { content: 'handler said hi' },
					headers: { 'content-type': 'application/json' },
					statusCode: 200,
				});
			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});

			expect(mockHandler).toHaveBeenCalledTimes(1);
			const [requestOptions, node] = mockHandler.mock.calls[0];
			expect(requestOptions.url).toBe('https://api.openai.com/v1/chat/completions');
			expect(requestOptions.method).toBe('POST');
			expect(requestOptions.body).toEqual({
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});
			expect(node).toBe(subNode);
		});

		it('forwards the handler content into the chat.completion envelope', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'mocked assistant reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});
			const body = (await response.json()) as {
				choices: Array<{ message: { role: string; content: string }; finish_reason: string }>;
			};

			expect(response.status).toBe(200);
			expect(body.choices[0].message.content).toBe('mocked assistant reply');
			expect(body.choices[0].finish_reason).toBe('stop');
		});

		it('fires onIntercept with the rootName attribution key', async () => {
			const intercepts: InterceptedTurn[] = [];
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;

			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([['LLM Chain', subNode]]),
				onIntercept: (t) => intercepts.push(t),
			});
			const url = await server.start();

			await postChatCompletion(url, '/eval/LLM%20Chain/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});

			expect(intercepts).toHaveLength(1);
			expect(intercepts[0].rootName).toBe('LLM Chain');
			expect(intercepts[0].method).toBe('POST');
			expect(intercepts[0].nodeType).toBe(subNode.type);
			expect(intercepts[0].mockResponse).toEqual({ content: 'reply' });
		});

		it('returns 500 with an OpenAI error envelope when the mock handler throws', async () => {
			const error = jest.fn();
			const mockHandler = jest
				.fn()
				.mockRejectedValue(new Error('LLM rate-limited')) as unknown as EvalLlmMockHandler;

			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
				logger: { error } as unknown as Logger,
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [],
			});
			const body = (await response.json()) as { error: Record<string, unknown> };

			expect(response.status).toBe(500);
			expect(body.error.type).toBe('eval_wire_server_error');
			expect(body.error.message).toContain('LLM rate-limited');
			expect(error).toHaveBeenCalledTimes(1);
			expect(error.mock.calls[0][0]).toContain('LLM rate-limited');
		});

		it('falls back to a synthetic sub-node when rootToSubNode has no entry', async () => {
			const warn = jest.fn();
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map(),
				logger: { warn } as unknown as Logger,
			});
			const url = await server.start();

			await postChatCompletion(url, '/eval/Unmapped/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [],
			});

			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('Unmapped');
			const [, node] = (mockHandler as unknown as jest.Mock).mock.calls[0];
			expect(node.name).toBe('Unmapped');
			expect(node.type).toBe('@n8n/eval-wire-server.unknown-vendor-llm');
		});

		it('decodes URL-encoded root names with special characters', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			const rootName = 'My Agent/v1 (special)';
			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([[rootName, subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(
				url,
				`/eval/${encodeURIComponent(rootName)}/v1/chat/completions`,
				{ model: 'gpt-4o', messages: [] },
			);

			expect(response.status).toBe(200);
			expect((mockHandler as unknown as jest.Mock).mock.calls[0][1]).toBe(subNode);
		});
	});

	describe('POST /v1/chat/completions — unrouted prefix', () => {
		beforeEach(() => {
			server = new LlmWireServer();
		});

		it('returns 500 with an OpenAI error envelope explaining the misconfiguration', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, '/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [],
			});
			const body = (await response.json()) as { error: { message: string } };

			expect(response.status).toBe(500);
			expect(body.error.message).toContain('/eval/<root>/');
		});
	});
});
