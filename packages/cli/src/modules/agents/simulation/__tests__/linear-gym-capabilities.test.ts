import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import { LinearGymBackend } from '../linear-gym-backend';
import type { OpenWorldInput, SimulatedTool } from '../tool-simulation.contracts';

mockInstance(Logger);

const GYM = 'http://127.0.0.1:41001';
const MANIFEST_URL = `${GYM}/_sim/v1/manifest?service=linear`;
const TOKEN = 'synthetic-loopback-harness';

const linear: SimulatedTool = { kind: 'mcp', toolName: 'linear', origin: 'https://mcp.linear.app' };
const simulated = { toolName: 'linear', kind: 'mcp', testability: 'simulated' };
const unavailable = (toolName = 'linear') => ({
	toolName,
	kind: 'mcp',
	testability: 'blocked',
	reason: 'simulator_unavailable',
	detail: 'The simulator did not report what it serves.',
});

function inputFor(...tools: SimulatedTool[]): OpenWorldInput {
	return {
		ownerId: 'owner',
		testChatId: 'chat',
		firstMessage: '',
		agent: { agentId: 'agent', projectId: 'project', name: 'agent', instructions: '', tools },
	};
}

/** The fields of the Linear `sim-service/v1` document of the Gym that matter here. */
function manifest(mcp: unknown = [{ url: 'https://mcp.linear.app/mcp', status: 'implemented' }]) {
	return {
		contract: 'sim-service/v1',
		service: 'linear',
		version: '1.0.0',
		interfaces: {
			api: [{ id: 'graphql', hosts: ['api.linear.app'], status: 'implemented' }],
			...(mcp === null ? {} : { mcp }),
			website: [{ id: 'linear_app', hosts: ['linear.app', 'mcp.linear.app'] }],
		},
	};
}

const json = (body: unknown, status = 200) =>
	new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

type Answer = (init: RequestInit) => Promise<Response> | Response;

/** A Gym in place of `fetch`. It answers the manifest request and creates tenants. */
function fakeGym(answer: Answer = () => json(manifest())) {
	vi.stubEnv('GYM_BASE_URL', GYM);
	vi.stubEnv('LINEAR_UPSTREAM_URL', 'http://127.0.0.1:41002/mcp');
	vi.stubEnv('GYM_HARNESS_TOKEN', TOKEN);
	const requests: string[] = [];
	const state = { answer };
	vi.stubGlobal('fetch', async (url: string, init: RequestInit = {}) => {
		requests.push(`${init.method ?? 'GET'} ${url}`);
		if (url === MANIFEST_URL) {
			expect(init.body).toBeUndefined();
			expect(new Headers(init.headers).get('authorization')).toBe(`Bearer ${TOKEN}`);
			expect(init.redirect).toBe('error');
			return await state.answer(init);
		}
		if (/^http:\/\/127\.0\.0\.1:41001\/_sim\/v1\/tenants\/[^/]+$/.test(url))
			return json({ n8n_credentials: { linearApi: { apiKey: 'key' } } });
		throw new Error(`Unexpected request to ${url}`);
	});
	return { requests, state };
}

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('LinearGymBackend capability discovery', () => {
	it('marks the MCP server as simulated when the Gym serves its host', async () => {
		const { requests } = fakeGym();
		const backend = new LinearGymBackend();
		expect(await backend.describeTools(inputFor(linear).agent)).toEqual([simulated]);
		expect(requests).toEqual([`GET ${MANIFEST_URL}`]);
	});

	it('serves the matching server under the name that the draft gives it', async () => {
		fakeGym();
		const backend = new LinearGymBackend();
		const input = inputFor({ ...linear, toolName: 'tracker' });
		expect(await backend.describeTools(input.agent)).toEqual([
			{ ...simulated, toolName: 'tracker' },
		]);
		const world = await backend.openWorld(input);
		const list = async (server: string) =>
			await world.handleRequest(
				{
					protocol: 'mcp',
					server,
					method: 'POST',
					body: { jsonrpc: '2.0', id: 1, method: 'tools/list' },
				},
				{ toolName: server },
			);
		expect((await list('tracker')).outcome).toBe('served');
		expect((await list('linear')).outcome).toBe('unsupported');
	});

	it.each<[string, unknown, SimulatedTool[]]>([
		['another host', manifest(), [{ ...linear, origin: 'https://mcp.other.example' }]],
		['another port', manifest(), [{ ...linear, origin: 'https://mcp.linear.app:8443' }]],
		[
			'a host that only an API interface has',
			manifest(),
			[{ ...linear, origin: 'https://api.linear.app' }],
		],
		[
			'a host that only a website interface has',
			manifest([]),
			[{ ...linear, origin: 'https://mcp.linear.app' }],
		],
		['a document without MCP interfaces', manifest(null), [linear]],
		[
			'an MCP interface that is not implemented',
			manifest([{ url: 'https://mcp.linear.app/mcp', status: 'planned' }]),
			[linear],
		],
		['an origin that is not a URL', manifest(), [{ ...linear, origin: 'mcp.linear.app' }]],
		['two servers on the served host', manifest(), [linear, { ...linear, toolName: 'second' }]],
	])('leaves out %s and opens no world', async (_, document, tools) => {
		const { requests } = fakeGym(() => json(document));
		const backend = new LinearGymBackend();
		const input = inputFor(...tools);
		expect(await backend.describeTools(input.agent)).toEqual([]);
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
		expect(requests).toEqual([`GET ${MANIFEST_URL}`]);
	});

	it('does not ask the Gym for an agent without MCP servers', async () => {
		const { requests } = fakeGym();
		const backend = new LinearGymBackend();
		const input = inputFor({ kind: 'node', toolName: 'linear', nodeType: 'n8n-nodes-base.linear' });
		expect(await backend.describeTools(input.agent)).toEqual([]);
		expect(requests).toEqual([]);
	});

	it.each<[string, Answer]>([
		[
			'is down',
			() => {
				throw new TypeError('fetch failed');
			},
		],
		['answers 404, as it does for an unknown service', () => json({ status: 404 }, 404)],
		['answers 500', () => json(manifest(), 500)],
		['answers text that is not JSON', () => new Response('<html>')],
		['answers a list', () => json([manifest()])],
		['answers another contract', () => json({ ...manifest(), contract: 'sim-service/v2' })],
		['answers for another service', () => json({ ...manifest(), service: 'notion' })],
		[
			'answers a service summary without interfaces',
			() => json({ slug: 'linear', hosts: ['mcp.linear.app'], readiness: 'ready' }),
		],
		['answers an MCP interface without a URL', () => json(manifest([{ status: 'implemented' }]))],
		[
			'answers an MCP interface without a status',
			() => json(manifest([{ url: 'https://mcp.linear.app/mcp' }])),
		],
		[
			'answers an MCP URL that is not a URL',
			() => json(manifest([{ url: 'mcp.linear.app', status: 'implemented' }])),
		],
	])('blocks the server as unavailable when the Gym %s', async (_, answer) => {
		const { requests } = fakeGym(answer);
		const backend = new LinearGymBackend();
		const input = inputFor(linear, { kind: 'node', toolName: 'http' });
		expect(await backend.describeTools(input.agent)).toEqual([unavailable()]);
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
		// A failure is not kept, and no other request replaces the answer of the Gym.
		expect(requests).toEqual([`GET ${MANIFEST_URL}`, `GET ${MANIFEST_URL}`]);
	});

	it('blocks the server as unavailable when the Gym is slow', async () => {
		const { requests } = fakeGym(
			async ({ signal }) =>
				await new Promise<Response>((_, reject) => {
					signal?.addEventListener('abort', () => reject(signal.reason));
				}),
		);
		const backend = new LinearGymBackend();
		const start = Date.now();
		expect(await backend.describeTools(inputFor(linear).agent)).toEqual([unavailable()]);
		expect(Date.now() - start).toBeLessThan(2500);
		expect(requests).toEqual([`GET ${MANIFEST_URL}`]);
	});

	it.each([
		['a Gym origin that is not on loopback', { GYM_BASE_URL: 'http://gym.example:8080' }],
		['a Gym origin with a path', { GYM_BASE_URL: `${GYM}/mcp` }],
		['no Gym origin', { GYM_BASE_URL: '' }],
		['another token', { GYM_HARNESS_TOKEN: 'other' }],
	])('sends no request with %s', async (_, env) => {
		const { requests } = fakeGym();
		for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
		const backend = new LinearGymBackend();
		const input = inputFor(linear);
		expect(await backend.describeTools(input.agent)).toEqual([unavailable()]);
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
		expect(requests).toEqual([]);
	});

	it('asks the Gym one time for calls that overlap or follow within the cache time', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const { requests, state } = fakeGym();
		const backend = new LinearGymBackend();
		const input = inputFor(linear);
		await Promise.all([backend.describeTools(input.agent), backend.describeTools(input.agent)]);
		await backend.openWorld(input);
		vi.advanceTimersByTime(29_000);
		// The other host is answered from the same cached document.
		expect(
			await backend.describeTools(inputFor({ ...linear, origin: 'https://x.example' }).agent),
		).toEqual([]);
		expect(requests.filter((request) => request === `GET ${MANIFEST_URL}`)).toHaveLength(1);

		// After the cache time, the Gym no longer serves the MCP interface.
		state.answer = () => json(manifest([]));
		vi.advanceTimersByTime(2_000);
		expect(await backend.describeTools(input.agent)).toEqual([]);
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
		expect(requests.filter((request) => request === `GET ${MANIFEST_URL}`)).toHaveLength(2);
	});

	it('asks again after a failure and does not serve from an old answer', async () => {
		vi.useFakeTimers({ toFake: ['Date'] });
		const { requests, state } = fakeGym();
		const backend = new LinearGymBackend();
		const { agent } = inputFor(linear);
		expect(await backend.describeTools(agent)).toEqual([simulated]);

		vi.advanceTimersByTime(31_000);
		state.answer = () => json({}, 503);
		expect(await backend.describeTools(agent)).toEqual([unavailable()]);

		state.answer = () => json(manifest());
		expect(await backend.describeTools(agent)).toEqual([simulated]);
		expect(requests).toHaveLength(3);
	});
});

// Runs only under the Gym launcher (`deploy/e2e/linear-spike.mjs`), which sets these variables.
describe.skipIf(!process.env.GYM_BASE_URL)('capability discovery against a real Gym', () => {
	it('gets a sim-service/v1 document with an implemented MCP interface', async () => {
		const response = await fetch(`${process.env.GYM_BASE_URL}/_sim/v1/manifest?service=linear`);
		const document = await response.json();
		expect(document).toMatchObject({ contract: 'sim-service/v1', service: 'linear' });
		expect(document.interfaces.mcp).toEqual([
			expect.objectContaining({ url: 'https://mcp.linear.app/mcp', status: 'implemented' }),
		]);
	});

	it('describes only the MCP server that the Gym serves', async () => {
		const backend = new LinearGymBackend();
		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		try {
			expect(await backend.describeTools(inputFor(linear).agent)).toEqual([simulated]);
			for (const origin of ['https://api.linear.app', 'https://mcp.notion.com'])
				expect(await backend.describeTools(inputFor({ ...linear, origin }).agent)).toEqual([]);
			expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual([
				`${process.env.GYM_BASE_URL}/_sim/v1/manifest?service=linear`,
			]);
		} finally {
			fetchSpy.mockRestore();
		}
	});

	it('blocks the server when no Gym listens on the configured port', async () => {
		// Port 1 on loopback refuses the connection.
		vi.stubEnv('GYM_BASE_URL', 'http://127.0.0.1:1');
		expect(await new LinearGymBackend().describeTools(inputFor(linear).agent)).toEqual([
			unavailable(),
		]);
	});
});
