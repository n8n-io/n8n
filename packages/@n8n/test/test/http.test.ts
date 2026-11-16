import { createServer, type Server } from 'node:http';
import { createRequire } from 'node:module';
import type { AddressInfo } from 'node:net';
import { resolve } from 'node:path';
import nock from 'nock';

import { executeWorkflow, loadWorkflow, mockNode } from '../src';
import definition from './fixtures/get-customer.json';

const crm = 'https://crm.example.com';
const input = { baseUrl: crm, customerId: 42, apiKey: 'test-key' };

afterEach(() => nock.cleanAll());

function continueOnFail() {
	return loadWorkflow({
		...definition,
		nodes: definition.nodes.map((node) =>
			node.name === 'Get customer' ? { ...node, onError: 'continueRegularOutput' } : node,
		),
	});
}

test('replies with the nock mock and records the request', async () => {
	nock(crm).get('/customers/42').reply(200, { id: 42, name: 'Ada' });

	const result = await executeWorkflow(loadWorkflow(definition), { input });

	expect(result.output).toEqual([{ id: 42, name: 'Ada' }]);
	const [request] = result.node('Get customer').requests;
	expect(request).toMatchObject({ method: 'GET', url: `${crm}/customers/42`, body: '' });
	expect(request.headers['x-api-key']).toBe('test-key');
});

test('rejects a request that matches no nock mock', async () => {
	await expect(executeWorkflow(loadWorkflow(definition), { input })).rejects.toMatchObject({
		code: 'HTTP_NOT_MOCKED',
		workflow: 'Get customer',
		node: 'Get customer',
		message: expect.stringContaining(`GET ${crm}/customers/42`),
	});
});

test('rejects a request that matches no nock mock when the node continues on error', async () => {
	await expect(executeWorkflow(continueOnFail(), { input })).rejects.toMatchObject({
		code: 'HTTP_NOT_MOCKED',
		node: 'Get customer',
	});
});

describe('with a local server', () => {
	let server: Server;
	let baseUrl: string;
	let received = 0;

	beforeAll(async () => {
		server = createServer((_request, response) => {
			received++;
			response.setHeader('content-type', 'application/json');
			response.end(JSON.stringify({ id: 42, source: 'local' }));
		});
		await new Promise<void>((resolve) => server.listen(0, 'localhost', resolve));
		baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
	});

	afterAll(async () => await new Promise((resolve) => server.close(resolve)));

	test('permits a real request to a host in allowHttp', async () => {
		const result = await executeWorkflow(loadWorkflow(definition), {
			input: { ...input, baseUrl },
			allowHttp: ['localhost'],
		});

		expect(result.output).toEqual([{ id: 42, source: 'local' }]);
		expect(result.node('Get customer').requests).toMatchObject([
			{ method: 'GET', url: `${baseUrl}/customers/42` },
		]);
	});

	test('restores the nock state after a rejected execution', async () => {
		nock(crm).get('/unused').reply(200);

		await expect(executeWorkflow(loadWorkflow(definition), { input })).rejects.toThrow();

		expect(nock.pendingMocks()).toEqual([`GET ${crm}:443/unused`]);
		const response = await fetch(`${baseUrl}/after`);
		expect(await response.json()).toEqual({ id: 42, source: 'local' });
	});

	test('blocks a direct undici request to a host that allowHttp does not list', async () => {
		const undici = createRequire(resolve(__dirname, '../../ai-utilities/package.json'))(
			'undici',
		) as { request(url: string): Promise<unknown> };
		const workflow = loadWorkflow(definition);
		mockNode(workflow.node('Get customer'), async () => {
			await undici.request(`${baseUrl}/direct`);
			return [{}];
		});
		received = 0;

		await expect(executeWorkflow(workflow, { input })).rejects.toMatchObject({
			code: 'HTTP_NOT_MOCKED',
			node: 'Get customer',
			message: expect.stringContaining(`GET ${baseUrl}/direct`),
		});
		expect(received).toBe(0);
	});
});

test('blocks a host that allowHttp does not list', async () => {
	await expect(
		executeWorkflow(loadWorkflow(definition), { input, allowHttp: ['localhost'] }),
	).rejects.toMatchObject({ code: 'HTTP_NOT_MOCKED' });
});

test('records each request of a sequence of replies', async () => {
	nock(crm).get('/customers/42').reply(202, { done: false }).get('/customers/42').reply(200, {
		done: true,
	});

	const result = await executeWorkflow(loadWorkflow(definition), { input: [input, input] });

	expect(result.output).toEqual([{ done: false }, { done: true }]);
	expect(result.node('Get customer').requests).toHaveLength(2);
});
