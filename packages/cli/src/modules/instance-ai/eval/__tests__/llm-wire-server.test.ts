import type { Logger } from '@n8n/backend-common';
import type { EvalLlmMockHandler } from 'n8n-core';
import type { INode } from 'n8n-workflow';
import OpenAI from 'openai';

import { type InterceptedTurn, LlmWireServer } from '../llm-wire-server';

const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
} as unknown as Logger;

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
			server = new LlmWireServer({ logger: mockLogger });
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
			const second = new LlmWireServer({ logger: mockLogger });
			try {
				const urlA = await server.start();
				const urlB = await second.start();
				expect(urlA).not.toBe(urlB);
			} finally {
				await second.stop();
			}
		});

		it('accepts requests after start() → stop() → start() — shutdown latch resets', async () => {
			await server.start();
			await server.stop();
			const url = await server.start();
			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o-mini',
				messages: [],
			});
			// Post-restart the route must hand back a 200 envelope, NOT the
			// 503 the in-flight shutdown latch would emit if it weren't reset.
			expect(response.status).toBe(200);
		});
	});

	describe('POST /eval/:root/v1/chat/completions — stub fallback', () => {
		beforeEach(() => {
			server = new LlmWireServer({ logger: mockLogger });
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
				logger: mockLogger,
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
				logger: mockLogger,
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
				logger: mockLogger,
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

		it('still returns 200 with a valid envelope when onIntercept throws (ledger failure is isolated)', async () => {
			const warn = jest.fn();
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;

			server = new LlmWireServer({
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
				onIntercept: () => {
					throw new Error('ledger disk full');
				},
				logger: { warn } as unknown as Logger,
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});
			const body = (await response.json()) as {
				object: string;
				choices: Array<{ message: { content: string } }>;
			};

			// Envelope is intact — the SDK must not see the ledger failure.
			expect(response.status).toBe(200);
			expect(body.object).toBe('chat.completion');
			expect(body.choices[0].message.content).toBe('reply');
			// Logger sees the diagnostic warning.
			expect(warn).toHaveBeenCalledTimes(1);
			expect(warn.mock.calls[0][0]).toContain('ledger write failed');
			expect(warn.mock.calls[0][0]).toContain('ledger disk full');
		});

		it('records a per-request body in the ledger that does not bleed across requests', async () => {
			const intercepts: InterceptedTurn[] = [];
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;

			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
				onIntercept: (t) => intercepts.push(t),
			});
			const url = await server.start();

			await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});

			expect(intercepts).toHaveLength(1);
			const recordedBody = intercepts[0].requestBody as {
				messages: Array<{ content: string }>;
			};
			// Mutating the recorded entry must not affect a freshly-served
			// request — proves the entry is owned by the ledger consumer, not
			// shared with later route handling.
			recordedBody.messages[0].content = 'mutated';

			await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'pong' }],
			});

			expect(intercepts).toHaveLength(2);
			const secondBody = intercepts[1].requestBody as {
				messages: Array<{ content: string }>;
			};
			expect(secondBody.messages[0].content).toBe('pong');
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
				logger: mockLogger,
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

		it.each([
			['literal % in the root name', '100% Off Agent'],
			['encoded % sequence in the root name', '50%25 cohort'],
			['only-special-chars root', '%&?#='],
		])('handles %s without a double-decode (no URIError)', async (_label, rootName) => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([[rootName, subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(
				url,
				`/eval/${encodeURIComponent(rootName)}/v1/chat/completions`,
				{ model: 'gpt-4o', messages: [] },
			);

			// Pre-fix, a literal `%` after Express's single decode would have
			// triggered URIError in the wire-server's own decodeURIComponent
			// and the response would have surfaced as 500 (or worse, a 404 if
			// the route never matched).
			expect(response.status).toBe(200);
			expect((mockHandler as unknown as jest.Mock).mock.calls[0][1]).toBe(subNode);
		});
	});

	describe('POST /v1/chat/completions — unrouted prefix', () => {
		beforeEach(() => {
			server = new LlmWireServer({ logger: mockLogger });
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

	// SSE branch — switches when the inbound body has `stream: true`. The spec
	// is strict on chunk semantics; the openai SDK throws opaque `BadStream`
	// errors when the envelope is malformed, so the assertions here mirror
	// what the SDK validates internally.
	describe('POST /eval/:root/v1/chat/completions — SSE branch (stream: true)', () => {
		const subNode = makeSubNode({ name: 'OpenAI Chat Model' });

		async function readSseChunks(url: string, path: string, body: unknown) {
			const response = await fetch(`${url}${path}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
				body: JSON.stringify(body),
			});
			const text = await response.text();
			const frames = text
				.split('\n\n')
				.map((f) => f.trim())
				.filter((f) => f.startsWith('data: '))
				.map((f) => f.slice('data: '.length));
			return { response, frames };
		}

		it('returns Content-Type: text/event-stream and a [DONE] terminator', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'streamed reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const { response, frames } = await readSseChunks(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				stream: true,
				messages: [{ role: 'user', content: 'hi' }],
			});

			expect(response.status).toBe(200);
			expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
			expect(frames[frames.length - 1]).toBe('[DONE]');
		});

		it('emits chat.completion.chunk frames terminated with a stop finish_reason', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'hello via SSE' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const { frames } = await readSseChunks(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				stream: true,
				messages: [{ role: 'user', content: 'hi' }],
			});

			const dataFrames = frames.filter((f) => f !== '[DONE]').map((f) => JSON.parse(f));
			expect(dataFrames.every((f) => f.object === 'chat.completion.chunk')).toBe(true);

			const ids = new Set(dataFrames.map((f) => f.id));
			expect(ids.size).toBe(1);

			const contentChunk = dataFrames.find((f) => f.choices[0].delta.content === 'hello via SSE');
			expect(contentChunk).toBeDefined();

			const terminal = dataFrames[dataFrames.length - 1];
			expect(terminal.choices[0].finish_reason).toBe('stop');
		});

		it('streams tool_calls with first-chunk id+name and a terminal tool_calls finish_reason', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: {
					tool_calls: [
						{ id: 'call_1', function: { name: 'get_weather', arguments: '{"city":"NYC"}' } },
					],
				},
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const { frames } = await readSseChunks(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				stream: true,
				messages: [{ role: 'user', content: 'weather in NYC?' }],
				tools: [
					{
						type: 'function',
						function: { name: 'get_weather', parameters: { type: 'object' } },
					},
				],
			});

			const dataFrames = frames.filter((f) => f !== '[DONE]').map((f) => JSON.parse(f));

			const firstToolFrame = dataFrames.find(
				(f) => f.choices[0].delta.tool_calls?.[0]?.id === 'call_1',
			);
			expect(firstToolFrame).toBeDefined();
			expect(firstToolFrame.choices[0].delta.tool_calls[0].function.name).toBe('get_weather');

			const argsFrame = dataFrames.find(
				(f) => f.choices[0].delta.tool_calls?.[0]?.function?.arguments === '{"city":"NYC"}',
			);
			expect(argsFrame).toBeDefined();
			// Args frame MUST NOT repeat id or name.
			expect(argsFrame.choices[0].delta.tool_calls[0].id).toBeUndefined();
			expect(argsFrame.choices[0].delta.tool_calls[0].function.name).toBeUndefined();

			const terminal = dataFrames[dataFrames.length - 1];
			expect(terminal.choices[0].finish_reason).toBe('tool_calls');
		});

		it('attributes the streamed turn against the requested root in onIntercept', async () => {
			const intercepts: InterceptedTurn[] = [];
			const mockHandler = jest.fn().mockResolvedValue({
				body: { content: 'streamed' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
				onIntercept: (t) => intercepts.push(t),
			});
			const url = await server.start();

			await readSseChunks(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				stream: true,
				messages: [],
			});

			expect(intercepts).toHaveLength(1);
			expect(intercepts[0].rootName).toBe('Agent');
		});

		it('uses the no-handler stub for streaming when no mock handler is attached', async () => {
			server = new LlmWireServer({ logger: mockLogger });
			const url = await server.start();

			const { response, frames } = await readSseChunks(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				stream: true,
				messages: [],
			});

			expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
			const dataFrames = frames.filter((f) => f !== '[DONE]').map((f) => JSON.parse(f));
			const stubFrame = dataFrames.find(
				(f) =>
					typeof f.choices[0].delta.content === 'string' &&
					f.choices[0].delta.content.includes('eval wire server stub'),
			);
			expect(stubFrame).toBeDefined();
		});

		// Live SDK round-trip — the master spec mandates this: "Test against
		// the live `openai` v5 SDK — do not hand-roll envelope shape against
		// documentation alone." The hand-rolled `readSseChunks` frame splitter
		// above proves our wire shape against the spec; this test proves it
		// against the *actual SDK parser*. If our `delta.tool_calls` chunks
		// drift from what `openai`'s reducer expects, this test will throw a
		// typed BadStream error before any of the per-frame asserts above
		// would notice.
		describe('live `openai` SDK round-trip (catches SDK-strict envelope drift)', () => {
			function makeClient(serverUrl: string, rootName: string) {
				return new OpenAI({
					apiKey: 'sk-eval-test',
					baseURL: `${serverUrl}/eval/${encodeURIComponent(rootName)}/v1`,
					// Disable retries — a failed parse should surface immediately,
					// not loop the test through the default 2x retry budget.
					maxRetries: 0,
				});
			}

			it('non-streaming chat completion parses through the SDK reducer', async () => {
				const mockHandler = jest.fn().mockResolvedValue({
					body: { content: 'hello via SDK' },
					headers: {},
					statusCode: 200,
				}) as unknown as EvalLlmMockHandler;
				server = new LlmWireServer({
					logger: mockLogger,
					mockHandler,
					rootToSubNode: new Map([['Agent', subNode]]),
				});
				const url = await server.start();
				const client = makeClient(url, 'Agent');

				const completion = await client.chat.completions.create({
					model: 'gpt-4o',
					messages: [{ role: 'user', content: 'hi' }],
				});

				expect(completion.object).toBe('chat.completion');
				expect(completion.choices[0].message.content).toBe('hello via SDK');
				expect(completion.choices[0].finish_reason).toBe('stop');
			});

			it('streaming content yields chunks through the SDK async iterator', async () => {
				const mockHandler = jest.fn().mockResolvedValue({
					body: { content: 'streamed via SDK' },
					headers: {},
					statusCode: 200,
				}) as unknown as EvalLlmMockHandler;
				server = new LlmWireServer({
					logger: mockLogger,
					mockHandler,
					rootToSubNode: new Map([['Agent', subNode]]),
				});
				const url = await server.start();
				const client = makeClient(url, 'Agent');

				const stream = await client.chat.completions.create({
					model: 'gpt-4o',
					stream: true,
					messages: [{ role: 'user', content: 'hi' }],
				});

				let assembled = '';
				let lastFinishReason: string | null | undefined;
				for await (const chunk of stream) {
					expect(chunk.object).toBe('chat.completion.chunk');
					const delta = chunk.choices[0]?.delta;
					if (typeof delta?.content === 'string') {
						assembled += delta.content;
					}
					if (chunk.choices[0]?.finish_reason !== undefined) {
						lastFinishReason = chunk.choices[0].finish_reason;
					}
				}

				expect(assembled).toBe('streamed via SDK');
				expect(lastFinishReason).toBe('stop');
			});

			it('streaming tool_calls accumulate through the SDK reducer with the correct final shape', async () => {
				// The strictest test of the wire format. The SDK accumulates
				// `delta.tool_calls` slices into a single tool call — first chunk
				// owns `id` + `function.name`, later chunks contribute
				// `function.arguments`. A drift here (e.g. repeating `id` on
				// later chunks) throws a `BadStream` error, not a soft skip.
				const mockHandler = jest.fn().mockResolvedValue({
					body: {
						tool_calls: [
							{
								id: 'call_live',
								function: { name: 'get_weather', arguments: '{"city":"NYC"}' },
							},
						],
					},
					headers: {},
					statusCode: 200,
				}) as unknown as EvalLlmMockHandler;
				server = new LlmWireServer({
					logger: mockLogger,
					mockHandler,
					rootToSubNode: new Map([['Agent', subNode]]),
				});
				const url = await server.start();
				const client = makeClient(url, 'Agent');

				const stream = await client.chat.completions.create({
					model: 'gpt-4o',
					stream: true,
					messages: [{ role: 'user', content: 'weather' }],
					tools: [
						{
							type: 'function',
							function: { name: 'get_weather', parameters: { type: 'object' } },
						},
					],
				});

				const accumulated: Record<number, { id?: string; name?: string; args: string }> = {};
				let lastFinishReason: string | null | undefined;
				for await (const chunk of stream) {
					const toolDeltas = chunk.choices[0]?.delta?.tool_calls ?? [];
					for (const td of toolDeltas) {
						const slot = (accumulated[td.index] ??= { args: '' });
						if (td.id) slot.id = td.id;
						if (td.function?.name) slot.name = td.function.name;
						if (typeof td.function?.arguments === 'string') {
							slot.args += td.function.arguments;
						}
					}
					if (chunk.choices[0]?.finish_reason !== undefined) {
						lastFinishReason = chunk.choices[0].finish_reason;
					}
				}

				// SDK reducer reassembled the full call.
				expect(accumulated[0]).toEqual({
					id: 'call_live',
					name: 'get_weather',
					args: '{"city":"NYC"}',
				});
				expect(lastFinishReason).toBe('tool_calls');
			});
		});

		it('returns a JSON error envelope (not SSE) when the mock handler throws on a streaming request', async () => {
			const mockHandler = jest
				.fn()
				.mockRejectedValue(new Error('LLM offline')) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await fetch(`${url}/eval/Agent/v1/chat/completions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ model: 'gpt-4o', stream: true, messages: [] }),
			});
			// SDK clients on a 500 short-circuit before iterating the stream, so
			// returning a JSON error envelope here keeps both streaming and
			// non-streaming code paths happy.
			expect(response.status).toBe(500);
			const body = (await response.json()) as { error: { message: string } };
			expect(body.error.message).toContain('LLM offline');
		});
	});

	// Non-streaming tool_calls: the same envelope shape the agent-side SDK
	// expects when stream:false. SDKs use `finish_reason: 'tool_calls'` to
	// branch into tool-execution; we must set it whenever tool_calls is present.
	describe('POST /eval/:root/v1/chat/completions — tool_calls (non-streaming)', () => {
		const subNode = makeSubNode({ name: 'OpenAI Chat Model' });

		it('emits tool_calls + content:null + finish_reason: tool_calls on the message', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: {
					tool_calls: [{ id: 'call_1', function: { name: 'lookup', arguments: '{"q":"hi"}' } }],
				},
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/chat/completions', {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'lookup hi' }],
				tools: [{ type: 'function', function: { name: 'lookup', parameters: { type: 'object' } } }],
			});

			expect(response.status).toBe(200);
			const body = (await response.json()) as {
				choices: Array<{
					message: {
						role: string;
						content: string | null;
						tool_calls: Array<{
							id: string;
							type: string;
							function: { name: string; arguments: string };
						}>;
					};
					finish_reason: string;
				}>;
			};
			const choice = body.choices[0];
			expect(choice.message.role).toBe('assistant');
			expect(choice.message.content).toBeNull();
			expect(choice.message.tool_calls[0]).toMatchObject({
				id: 'call_1',
				type: 'function',
				function: { name: 'lookup', arguments: '{"q":"hi"}' },
			});
			expect(choice.finish_reason).toBe('tool_calls');
		});
	});

	// `@langchain/openai` v1.3+ auto-routes Agent v3.1+ calls to /v1/responses
	// instead of /v1/chat/completions. Verified empirically against a real
	// LangChain Agent — without this route the SDK 404s.
	describe('POST /eval/:root/v1/responses — Responses API', () => {
		const subNode = makeSubNode({ name: 'OpenAI Chat Model' });

		it('returns a `response` envelope with annotations:[] on output_text content', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { output_text: 'hello via responses' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/responses', {
				model: 'gpt-4o',
				input: [{ role: 'user', content: 'hi' }],
			});

			expect(response.status).toBe(200);
			const body = (await response.json()) as {
				object: string;
				status: string;
				output: Array<{
					type: string;
					content: Array<{ type: string; text: string; annotations: unknown[] }>;
				}>;
			};
			expect(body.object).toBe('response');
			expect(body.status).toBe('completed');
			expect(body.output[0].type).toBe('message');
			expect(body.output[0].content[0].text).toBe('hello via responses');
			// Without `annotations: []`, the LangChain extractor throws
			// "Cannot read properties of undefined (reading 'map')".
			expect(body.output[0].content[0].annotations).toEqual([]);
		});

		it('emits a function_call output item when the mock handler returns tool_calls', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: {
					tool_calls: [{ id: 'call_1', function: { name: 'lookup', arguments: '{"q":"x"}' } }],
				},
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/responses', {
				model: 'gpt-4o',
				input: [{ role: 'user', content: 'x' }],
				tools: [{ type: 'function', name: 'lookup' }],
			});

			const body = (await response.json()) as {
				output: Array<{ type: string; name?: string; call_id?: string; arguments?: string }>;
			};
			expect(body.output[0].type).toBe('function_call');
			expect(body.output[0].name).toBe('lookup');
			expect(body.output[0].call_id).toBe('call_1');
			expect(body.output[0].arguments).toBe('{"q":"x"}');
		});

		it('streams response.* SSE events when stream:true', async () => {
			const mockHandler = jest.fn().mockResolvedValue({
				body: { output_text: 'streamed reply' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['Agent', subNode]]),
			});
			const url = await server.start();

			const response = await fetch(`${url}/eval/Agent/v1/responses`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
				body: JSON.stringify({
					model: 'gpt-4o',
					stream: true,
					input: [{ role: 'user', content: 'hi' }],
				}),
			});

			expect(response.headers.get('content-type')).toMatch(/text\/event-stream/);
			const text = await response.text();

			// Responses API doesn't use `data: [DONE]` — the terminal is
			// `response.completed`. Parse the event frames and assert ordering.
			const events: string[] = [];
			for (const block of text.split('\n\n')) {
				const eventLine = block.split('\n').find((l) => l.startsWith('event: '));
				if (eventLine) events.push(eventLine.slice('event: '.length));
			}
			expect(events[0]).toBe('response.created');
			expect(events[events.length - 1]).toBe('response.completed');
			expect(events).toContain('response.output_text.delta');
		});

		it('attributes the turn via onIntercept with the parsed root', async () => {
			const intercepts: InterceptedTurn[] = [];
			const mockHandler = jest.fn().mockResolvedValue({
				body: { output_text: 'ok' },
				headers: {},
				statusCode: 200,
			}) as unknown as EvalLlmMockHandler;
			server = new LlmWireServer({
				logger: mockLogger,
				mockHandler,
				rootToSubNode: new Map([['My Agent', subNode]]),
				onIntercept: (t) => intercepts.push(t),
			});
			const url = await server.start();

			await postChatCompletion(url, '/eval/My%20Agent/v1/responses', {
				model: 'gpt-4o',
				input: [],
			});

			expect(intercepts).toHaveLength(1);
			expect(intercepts[0].rootName).toBe('My Agent');
			// Reverse translator uses the canonical OpenAI URL so mock-handler's
			// service/endpoint extraction derives `/v1/responses` correctly.
			expect(intercepts[0].url).toBe('https://api.openai.com/v1/responses');
		});

		it('returns the loud-fail error envelope when no /eval/<root>/ prefix is used', async () => {
			server = new LlmWireServer({ logger: mockLogger });
			const url = await server.start();

			const response = await postChatCompletion(url, '/v1/responses', {
				model: 'gpt-4o',
				input: [],
			});
			const body = (await response.json()) as { error: { message: string } };
			expect(response.status).toBe(500);
			expect(body.error.message).toContain('/eval/<root>/');
		});

		it('uses the stub envelope when no mock handler is attached', async () => {
			server = new LlmWireServer({ logger: mockLogger });
			const url = await server.start();

			const response = await postChatCompletion(url, '/eval/Agent/v1/responses', {
				model: 'gpt-4o',
				input: [],
			});
			const body = (await response.json()) as {
				output: Array<{ content: Array<{ text: string }> }>;
			};
			expect(body.output[0].content[0].text).toContain('eval wire server stub');
		});
	});
});
