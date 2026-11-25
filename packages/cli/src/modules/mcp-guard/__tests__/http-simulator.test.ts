import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import type { INode } from 'n8n-workflow';

import { HttpSimulator, isGenericHttpNode, SIMULATED_HEADER } from '../http-simulator';
import type { HydrationModel } from '../hydration-llm';

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

	afterEach(() => fetchSpy.mockRestore());

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

	it('keeps one mock for each chat, so a later read can see an earlier write', async () => {
		await simulator.respond({ url: 'https://a.test/x', method: 'POST' }, node, scope);
		await simulator.respond({ url: 'https://a.test/x' }, node, scope);
		await simulator.respond({ url: 'https://a.test/x' }, node, { ...scope, chatId: 'chat2' });

		expect(createLlmMockHandler).toHaveBeenCalledTimes(2);
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
});
