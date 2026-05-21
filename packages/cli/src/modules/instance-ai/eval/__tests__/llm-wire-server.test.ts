import { LlmWireServer } from '../llm-wire-server';

async function postChatCompletion(url: string, body: unknown): Promise<Response> {
	return await fetch(`${url}/v1/chat/completions`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
}

describe('LlmWireServer', () => {
	let server: LlmWireServer;

	beforeEach(() => {
		server = new LlmWireServer();
	});

	afterEach(async () => {
		await server.stop();
	});

	describe('lifecycle', () => {
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

	describe('POST /v1/chat/completions', () => {
		it('returns a 200 with a chat.completion envelope', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, {
				model: 'gpt-4o-mini',
				messages: [{ role: 'user', content: 'hello' }],
			});
			const body = (await response.json()) as Record<string, unknown>;

			expect(response.status).toBe(200);
			expect(body.object).toBe('chat.completion');
			expect(body.model).toBe('gpt-4o-mini');
			expect(typeof body.id).toBe('string');
			expect(Array.isArray(body.choices)).toBe(true);
		});

		it('echoes the request model in the response', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, {
				model: 'gpt-5',
				messages: [],
			});
			const body = (await response.json()) as Record<string, unknown>;

			expect(body.model).toBe('gpt-5');
		});

		it('falls back to a default model when the body omits one', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, { messages: [] });
			const body = (await response.json()) as Record<string, unknown>;

			expect(body.model).toBe('gpt-4o-mini');
		});

		it('includes a single assistant choice with finish_reason="stop"', async () => {
			const url = await server.start();

			const response = await postChatCompletion(url, {
				model: 'gpt-4o',
				messages: [{ role: 'user', content: 'ping' }],
			});
			const body = (await response.json()) as {
				choices: Array<{
					index: number;
					message: { role: string; content: string };
					finish_reason: string;
				}>;
			};

			expect(body.choices).toHaveLength(1);
			expect(body.choices[0]).toEqual(
				expect.objectContaining({
					index: 0,
					message: expect.objectContaining({ role: 'assistant' }),
					finish_reason: 'stop',
				}),
			);
		});
	});
});
