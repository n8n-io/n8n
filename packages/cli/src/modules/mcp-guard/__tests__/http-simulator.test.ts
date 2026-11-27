import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { HttpSimulator, isGenericHttpNode, SIMULATED_HEADER } from '../http-simulator';
import type { HydrationModel } from '../hydration-llm';
import { GUARDED_CALL_TIMEOUT_MS } from '../mcp-guard-fetch';
import { createNodeRequestGuard } from '../node-request-guard';

const mockHandler = vi.fn();
const createLlmMockHandler = vi.fn((_options?: unknown) => mockHandler);

vi.mock('../../instance-ai/eval/mock-handler', () => ({
	createLlmMockHandler: (options?: unknown) => createLlmMockHandler(options),
	isMockErrorSentinel: (res: { body: unknown }) =>
		typeof res.body === 'object' && res.body !== null && '_evalMockError' in res.body,
}));

const node = { name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' } as INode;
const model: HydrationModel = { resolve: async () => ({}) as never };
const scope = { model, chatId: 'chat1', agentId: 'agent1' };
const ok = { statusCode: 200, headers: { 'content-type': 'application/json' }, body: { id: 1 } };

describe('isGenericHttpNode', () => {
	it('is true for the HTTP Request node and its tool, and false for a service node', () => {
		expect(isGenericHttpNode({ type: 'n8n-nodes-base.httpRequest' })).toBe(true);
		expect(isGenericHttpNode({ type: 'n8n-nodes-base.httpRequestTool' })).toBe(true);
		expect(isGenericHttpNode({ type: '@n8n/n8n-nodes-langchain.toolHttpRequest' })).toBe(true);
		expect(isGenericHttpNode({ type: 'n8n-nodes-base.gmail' })).toBe(false);
	});
});

describe('HttpSimulator', () => {
	const lines: string[] = [];
	let simulator: HttpSimulator;
	let fetchSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		lines.length = 0;
		const sink = (line: string) => lines.push(line);
		Container.set(Logger, { info: sink, warn: sink, error: sink } as unknown as Logger);
		mockHandler.mockReset().mockResolvedValue(ok);
		createLlmMockHandler.mockClear();
		fetchSpy = vi.spyOn(globalThis, 'fetch');
		simulator = new HttpSimulator();
	});

	afterEach(() => {
		fetchSpy.mockRestore();
		vi.useRealTimers();
	});

	it('answers with the mock and marks the answer as simulated', async () => {
		const res = await simulator.respond({ url: 'https://api.unknown.test/items' }, node, scope);

		expect(res).toMatchObject({ statusCode: 200, body: { id: 1 } });
		expect(res.headers[SIMULATED_HEADER]).toBe('true');
		expect(res.headers['content-type']).toBe('application/json');
	});

	it.each(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const)(
		'makes no network request for %s',
		async (method) => {
			await simulator.respond({ url: 'https://api.unknown.test/items/1', method }, node, scope);

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(mockHandler).toHaveBeenCalledTimes(1);
		},
	);

	it('gives the model of the chat to the mock', async () => {
		await simulator.respond({ url: 'https://api.unknown.test/items' }, node, scope);

		expect(createLlmMockHandler).toHaveBeenCalledWith({ model, redactSecrets: true });
	});

	it('makes one mock for each chat and one more for another chat', async () => {
		await simulator.respond({ url: 'https://a.test/x', method: 'POST' }, node, scope);
		await simulator.respond({ url: 'https://a.test/x' }, node, scope);
		await simulator.respond({ url: 'https://a.test/x' }, node, { ...scope, chatId: 'chat2' });

		expect(createLlmMockHandler).toHaveBeenCalledTimes(2);
	});

	it('makes one mock when two first requests of a chat come at once', async () => {
		await Promise.all([
			simulator.respond({ url: 'https://a.test/x', method: 'POST' }, node, scope),
			simulator.respond({ url: 'https://a.test/x' }, node, scope),
		]);

		expect(createLlmMockHandler).toHaveBeenCalledTimes(1);
	});

	it('answers 502 when the mock gives an error marker, and never calls the network', async () => {
		mockHandler.mockResolvedValue({
			statusCode: 200,
			headers: {},
			body: { _evalMockError: true, message: 'boom' },
		});

		const res = await simulator.respond({ url: 'https://a.test/x' }, node, scope);

		expect(res.statusCode).toBe(502);
		expect(JSON.stringify(res.body)).not.toContain('boom');
		expect(res.headers[SIMULATED_HEADER]).toBe('true');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('answers 502 when the mock throws or gives nothing', async () => {
		mockHandler.mockRejectedValueOnce(new Error('down'));
		mockHandler.mockResolvedValueOnce(undefined);

		expect((await simulator.respond({ url: 'https://a.test/x' }, node, scope)).statusCode).toBe(
			502,
		);
		expect((await simulator.respond({ url: 'https://a.test/y' }, node, scope)).statusCode).toBe(
			502,
		);
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('refuses a call that has no chat', async () => {
		const res = await simulator.respond({ url: 'https://a.test/x' }, node, {
			...scope,
			chatId: undefined,
		});

		expect(res.statusCode).toBe(403);
		expect(mockHandler).not.toHaveBeenCalled();
	});

	it('logs the method, host and path, and never the query or the credential', async () => {
		await simulator.respond(
			{
				url: 'https://api.unknown.test/items',
				method: 'POST',
				qs: { api_key: 'qs-secret' },
				headers: { authorization: 'Bearer hdr-secret' },
				body: { token: 'body-secret' },
			},
			node,
			scope,
		);

		expect(lines).toEqual(['mcp-guard http POST api.unknown.test/items -> simulated']);
	});

	it('hides a token in the path of the call from the log', async () => {
		await simulator.respond(
			{
				url: 'https://api.unknown.test/bot123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw/sendMessage',
			},
			node,
			scope,
		);

		expect(lines).toHaveLength(1);
		expect(lines[0]).toMatch(
			/^mcp-guard http GET api\.unknown\.test\/<redacted:[0-9a-f]{6}>\/sendMessage -> simulated$/,
		);
	});

	it('gives the mock the address that `baseURL` and `qs` make', async () => {
		const options = { url: '/v1/items', baseURL: 'https://api.unknown.test', qs: { page: 2 } };
		const guard = createNodeRequestGuard(scope);
		Container.set(HttpSimulator, simulator);

		await guard(options, node);

		expect(mockHandler.mock.calls[0][0]).toMatchObject({
			url: 'https://api.unknown.test/v1/items?page=2',
		});
	});
	it('answers 504 when the mock is too slow, and tells the mock to stop', async () => {
		vi.useFakeTimers();
		let seen: AbortSignal | undefined;
		mockHandler.mockImplementation(async (_options, _node, signal: AbortSignal) => {
			seen = signal;
			return await new Promise(() => {});
		});

		const pending = simulator.respond({ url: 'https://a.test/x', method: 'POST' }, node, scope);
		await vi.advanceTimersByTimeAsync(GUARDED_CALL_TIMEOUT_MS);
		const res = await pending;

		expect(res.statusCode).toBe(504);
		expect(res.headers[SIMULATED_HEADER]).toBe('true');
		expect(seen?.aborted).toBe(true);
	});

	it('does not abort a call that answers in time', async () => {
		let seen: AbortSignal | undefined;
		mockHandler.mockImplementation(async (_options, _node, signal: AbortSignal) => {
			seen = signal;
			return ok;
		});

		await simulator.respond({ url: 'https://a.test/x' }, node, scope);

		expect(seen?.aborted).toBe(false);
	});

	describe('values that a credential adds', () => {
		const withAuth = (genericAuthType: string) =>
			({
				...node,
				parameters: { authentication: 'genericCredentialType', genericAuthType },
			}) as INode;

		const send = async (httpNode: INode, options: Record<string, unknown>) => {
			Container.set(HttpSimulator, simulator);
			await createNodeRequestGuard(scope)(
				{ url: 'https://api.unknown.test/data', ...options },
				httpNode,
			);
			return mockHandler.mock.calls[0][0] as { url: string; body?: unknown };
		};

		it('hides the query values of query auth, also under a name that no rule knows', async () => {
			const seen = await send(withAuth('httpQueryAuth'), { qs: { q: 'Berlin', appid: 'SECRET' } });

			expect(seen.url).not.toContain('SECRET');
			expect(seen.url).toContain('?q=');
			expect(seen.url).toContain('&appid=');
		});

		it('hides the query and the body values of custom auth', async () => {
			const seen = await send(withAuth('httpCustomAuth'), {
				method: 'POST',
				qs: { sig: 'SECRET' },
				body: { user: 'jo', pass: 'SECRET2' },
			});

			expect(JSON.stringify(seen)).not.toContain('SECRET');
			expect(JSON.stringify(seen)).not.toContain('"jo"');
		});

		it('keeps the body for query auth, and hides all values when an expression gives the type', async () => {
			const body = { title: 'Buy milk' };

			expect((await send(withAuth('httpQueryAuth'), { method: 'POST', body })).body).toEqual(body);
			mockHandler.mockClear();
			const widest = await send(withAuth('={{ $json.type }}'), { method: 'POST', body });
			expect(JSON.stringify(widest.body)).not.toContain('Buy milk');
		});

		it('leaves the request as it is for a node with no generic credential', async () => {
			const seen = await send(node, { qs: { q: 'Berlin', appid: 'visible' } });

			expect(seen.url).toBe('https://api.unknown.test/data?q=Berlin&appid=visible');
		});
	});
});
