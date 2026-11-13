import { ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { createResultError, createResultOk } from '@n8n/utils/result';
import type { NodeEgressFilter } from 'n8n-workflow';
import { lookup as systemLookup } from 'node:dns';
import http from 'node:http';
import type { AddressInfo, LookupFunction } from 'node:net';

import { createBedrockRuntimeClient } from '../createBedrockRuntimeClient';

const CONVERSE_RESPONSE = {
	output: { message: { role: 'assistant', content: [{ text: 'ok' }] } },
	stopReason: 'end_turn',
	usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 },
	metrics: { latencyMs: 1 },
};

const allowAllFilter: NodeEgressFilter = {
	validateUrl: async () => createResultOk(undefined),
	validateConnectionHost: () => createResultOk(undefined),
	createSecureLookup: () => systemLookup,
	validateRedirectSync: () => {},
};

describe('createBedrockRuntimeClient', () => {
	let server: http.Server;
	let port: number;
	let requestCount = 0;
	const originalEnv = { ...process.env };

	beforeAll(async () => {
		server = http.createServer((_req, res) => {
			requestCount++;
			res.writeHead(200, { 'content-type': 'application/json' });
			res.end(JSON.stringify(CONVERSE_RESPONSE));
		});
		await new Promise<void>((resolve) => {
			server.listen(0, '127.0.0.1', () => {
				port = (server.address() as AddressInfo).port;
				resolve();
			});
		});
	});

	afterAll(async () => {
		process.env = originalEnv;
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	beforeEach(() => {
		requestCount = 0;
		process.env = { ...originalEnv };
		delete process.env.HTTP_PROXY;
		delete process.env.http_proxy;
		delete process.env.HTTPS_PROXY;
		delete process.env.https_proxy;
	});

	async function converse(endpoint: string | undefined, egressFilter: NodeEgressFilter) {
		const client = await createBedrockRuntimeClient({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
			bedrockRuntimeEndpoint: endpoint,
			maxRetries: 0,
			egressFilter,
		});
		return await client.send(
			new ConverseCommand({
				modelId: 'amazon.nova-pro-v1:0',
				messages: [{ role: 'user', content: [{ text: 'hi' }] }],
			}),
		);
	}

	it('sends runtime requests to an allowed override endpoint', async () => {
		await converse(`http://127.0.0.1:${port}`, allowAllFilter);

		expect(requestCount).toBe(1);
	});

	it('rejects an override endpoint that the egress filter rejects', async () => {
		const filterError = new Error('target not allowed');
		const rejectingFilter: NodeEgressFilter = {
			...allowAllFilter,
			validateUrl: async () => createResultError(filterError),
		};

		await expect(converse(`http://127.0.0.1:${port}`, rejectingFilter)).rejects.toBe(filterError);
		expect(requestCount).toBe(0);
	});

	it('resolves an override hostname through the egress filter lookup', async () => {
		const loopbackLookup = vi.fn<LookupFunction>((_hostname, options, onResult) => {
			if (options.all === true) {
				onResult(null, [{ address: '127.0.0.1', family: 4 }]);
			} else {
				onResult(null, '127.0.0.1', 4);
			}
		});
		const routingFilter: NodeEgressFilter = {
			...allowAllFilter,
			createSecureLookup: () => loopbackLookup,
		};

		await converse(`http://bedrock-endpoint.test:${port}`, routingFilter).catch(() => undefined);

		expect(loopbackLookup).toHaveBeenCalledWith(
			'bedrock-endpoint.test',
			expect.anything(),
			expect.any(Function),
		);
	});

	it('leaves the default endpoint outside the egress filter', async () => {
		const spyFilter: NodeEgressFilter = {
			...allowAllFilter,
			validateUrl: vi.fn(allowAllFilter.validateUrl),
			createSecureLookup: vi.fn(allowAllFilter.createSecureLookup),
		};

		await createBedrockRuntimeClient({
			region: 'us-east-1',
			credentials: { accessKeyId: 'a', secretAccessKey: 'b' },
			egressFilter: spyFilter,
		});

		expect(spyFilter.validateUrl).not.toHaveBeenCalled();
		expect(spyFilter.createSecureLookup).not.toHaveBeenCalled();
	});
});
