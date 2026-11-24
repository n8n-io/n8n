import { toolCallEvidenceSchema } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';

import { LinearGymBackend } from '../linear-gym-backend';
import { SimulationBackendRegistry } from '../simulation-backend-registry';
import type {
	OpenWorldInput,
	SimulatedReply,
	SimulationBackend,
	SimulationWorld,
} from '../tool-simulation.contracts';

mockInstance(Logger);

const ISSUE_UUID = '33333333-3333-4333-8333-333333333333';
const ORIGINAL = 'Renew Initech';

const input: OpenWorldInput = {
	ownerId: 'owner',
	testChatId: 'chat',
	firstMessage: '',
	agent: {
		agentId: 'agent',
		projectId: 'project',
		name: 'agent',
		instructions: '',
		tools: [{ kind: 'mcp', toolName: 'linear', origin: 'https://mcp.linear.app' }],
	},
};
const args = { id: 'FIN-412' };

async function call(
	world: SimulationWorld,
	name: string,
	toolArgs: Record<string, unknown>,
	server = 'linear',
): Promise<SimulatedReply> {
	return await world.handleRequest(
		{
			protocol: 'mcp',
			server,
			method: 'POST',
			body: {
				jsonrpc: '2.0',
				id: 3,
				method: 'tools/call',
				params: { name, arguments: toolArgs },
			},
		},
		{ toolName: server },
	);
}

function evidenceOf(reply: SimulatedReply) {
	if (reply.outcome !== 'served') throw new Error(`Expected a served reply, got ${reply.outcome}`);
	for (const value of reply.evidence ?? []) toolCallEvidenceSchema.parse(value);
	return reply.evidence;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('LinearGymBackend selection', () => {
	const backend = new LinearGymBackend();

	it('asks for a world that follows the draft connections', () => {
		expect(backend.worldDependsOnDraftConnections).toBe(true);
	});

	it('requires the configured server and an owner', async () => {
		fakeServices();
		expect(
			await backend.describeTools({
				...input.agent,
				tools: [{ kind: 'mcp', toolName: 'linear', origin: 'https://other.example' }],
			}),
		).toEqual([]);
		await expect(backend.openWorld({ ...input, ownerId: '' })).rejects.toThrow('unavailable');
	});

	it('refuses a configuration that is not on loopback', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		vi.stubEnv('GYM_BASE_URL', 'http://example.invalid');
		await expect(backend.openWorld(input)).rejects.toThrow('unavailable');
		expect(fetchSpy).not.toHaveBeenCalled();
	});

	it('is selected only by N8N_SAFE_TESTING_BACKEND=linear-gym', () => {
		const registered: SimulationBackend = {
			id: 'llm-mock',
			describeTools: async () => [],
			openWorld: async () => {
				throw new Error('not used');
			},
		};
		const registry = new SimulationBackendRegistry();
		vi.stubEnv('N8N_SAFE_TESTING_BACKEND', '');
		expect(registry.get()).toBeUndefined();
		registry.register(registered);
		expect(registry.get()).toBe(registered);
		vi.stubEnv('N8N_SAFE_TESTING_BACKEND', 'other');
		expect(registry.get()).toBe(registered);
		vi.stubEnv('N8N_SAFE_TESTING_BACKEND', 'linear-gym');
		// The registry gives a stand-in that loads the backend on first use.
		const selected = registry.get();
		expect(selected).not.toBe(registered);
		expect(selected?.id).toBe(backend.id);
		expect(selected?.worldDependsOnDraftConnections).toBe(backend.worldDependsOnDraftConnections);
		expect(registry.get()).toBe(selected);
	});
});

/**
 * An in-memory Gym and an in-memory Linear in place of `fetch`. No request leaves the process.
 * The Gym keeps one issue title for each tenant. The Linear side answers every read with the
 * original issue and counts the requests.
 */
function fakeServices() {
	const gymBase = 'http://127.0.0.1:41001';
	const upstreamUrl = 'http://127.0.0.1:41002/mcp';
	vi.stubEnv('GYM_BASE_URL', gymBase);
	vi.stubEnv('LINEAR_UPSTREAM_URL', upstreamUrl);
	vi.stubEnv('GYM_HARNESS_TOKEN', 'synthetic-loopback-harness');

	const titles = new Map<string, string | undefined>();
	const upstreamTools: string[] = [];
	const gymTools: string[] = [];
	let upstreamDown = false;
	const issue = (title: string) => ({
		id: 'FIN-412',
		uuid: ISSUE_UUID,
		title,
		team: 'Finance',
		teamId: '11111111-1111-4111-8111-111111111111',
	});
	const reply = (body: unknown) =>
		new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } });
	const toolResult = (value: unknown, isError = false) =>
		reply({
			jsonrpc: '2.0',
			id: 1,
			result: {
				content: [{ type: 'text', text: JSON.stringify(value) }],
				...(isError ? { isError } : {}),
			},
		});

	vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
		if (url === `${gymBase}/_sim/v1/manifest?service=linear`)
			return reply({
				contract: 'sim-service/v1',
				service: 'linear',
				interfaces: { mcp: [{ url: 'https://mcp.linear.app/mcp', status: 'implemented' }] },
			});
		const body = JSON.parse(String(init.body));
		const headers = new Headers(init.headers);
		if (url === upstreamUrl) {
			upstreamTools.push(body.params.name);
			if (upstreamDown) throw new Error('No prerequisite');
			return toolResult(issue(ORIGINAL));
		}
		const { origin, pathname } = new URL(url);
		if (origin !== gymBase) throw new Error(`Unexpected request to ${origin}`);
		const tenant = /^\/_sim\/v1\/tenants\/([^/]+)(\/seed)?$/.exec(pathname);
		if (tenant) {
			if (tenant[2]) titles.set(tenant[1], body.native.linear.issues[0].title);
			else titles.set(tenant[1], undefined);
			return reply({ n8n_credentials: { linearApi: { apiKey: tenant[1] } } });
		}
		if (pathname !== '/mcp') throw new Error(`Unexpected Gym path ${pathname}`);
		const worldId = (headers.get('authorization') ?? '').replace('Bearer ', '');
		const { name, arguments: toolArgs } = body.params;
		gymTools.push(name);
		const title = titles.get(worldId);
		if (title === undefined) return toolResult({ error: 'Issue not found' }, true);
		if (name === 'save_issue') titles.set(worldId, toolArgs.title);
		return toolResult(issue(titles.get(worldId) ?? ''));
	});

	return {
		upstreamTools,
		gymTools,
		failUpstream: () => {
			upstreamDown = true;
		},
	};
}

describe('LinearGymBackend route evidence', () => {
	const backend = new LinearGymBackend();

	it('sends no upstream request when it opens a world', async () => {
		const services = fakeServices();
		await backend.openWorld(input);
		expect(services.upstreamTools).toEqual([]);
		expect(services.gymTools).toEqual([]);
	});

	it('reports no evidence for protocol requests', async () => {
		fakeServices();
		const world = await backend.openWorld(input);
		const reply = await world.handleRequest(
			{
				protocol: 'mcp',
				server: 'linear',
				method: 'POST',
				body: { jsonrpc: '2.0', id: 2, method: 'tools/list' },
			},
			{ toolName: 'linear' },
		);
		expect(reply).toMatchObject({
			outcome: 'served',
			body: { result: { tools: [{ name: 'get_issue' }, { name: 'save_issue' }] } },
		});
		expect(reply).not.toHaveProperty('evidence');
	});

	it('reports a real read and a world read for the first lookup', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);

		const reply = await call(world, 'get_issue', args);

		expect(evidenceOf(reply)).toEqual(['real_read', 'world_read']);
		expect(JSON.stringify(reply)).toContain(ORIGINAL);
		expect(services.upstreamTools).toEqual(['get_issue']);
	});

	it('reports only a world write for an edit of a hydrated issue', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		await call(world, 'get_issue', args);
		services.upstreamTools.length = 0;

		const reply = await call(world, 'save_issue', { ...args, title: 'Fixture edit' });

		expect(evidenceOf(reply)).toEqual(['world_write']);
		expect(services.upstreamTools).toEqual([]);
	});

	it('reports the prerequisite read of a write as a real read plus a world write', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);

		const reply = await call(world, 'save_issue', { ...args, title: 'Write first' });

		expect(evidenceOf(reply)).toEqual(['real_read', 'world_write']);
		expect(services.upstreamTools).toEqual(['get_issue']);
		expect(JSON.stringify(await call(world, 'get_issue', args))).toContain('Write first');
	});

	it('keeps the evidence of overlapping requests apart', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		await call(world, 'get_issue', args);
		services.upstreamTools.length = 0;

		const [read, write] = await Promise.all([
			call(world, 'get_issue', args),
			call(world, 'save_issue', { ...args, title: 'Fixture edit' }),
		]);

		expect(evidenceOf(read)).toEqual(['real_read', 'world_read']);
		expect(evidenceOf(write)).toEqual(['world_write']);
		expect(services.upstreamTools).toEqual(['get_issue']);
	});

	it('serves nothing and sends no write when the prerequisite read fails', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		services.failUpstream();

		expect(await call(world, 'save_issue', { ...args, title: 'Not applied' })).toEqual({
			outcome: 'unavailable',
		});
		expect(services.upstreamTools).toEqual(['get_issue']);
		expect(services.gymTools).not.toContain('save_issue');
	});

	it('does not serve an unknown tool, argument or server', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		for (const reply of [
			await call(world, 'delete_issue', args),
			await call(world, 'save_issue', { ...args, team: 'other' }),
			await call(world, 'get_issue', args, 'other'),
		]) {
			expect(reply).toEqual({ outcome: 'unsupported' });
		}
		expect(services.upstreamTools).toEqual([]);
		expect(services.gymTools).toEqual([]);
	});

	it('reads upstream again for a lookup after a Gym-only edit (current behaviour)', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		await call(world, 'get_issue', args);
		await call(world, 'save_issue', { ...args, title: 'Fixture edit' });
		services.upstreamTools.length = 0;

		const reply = await call(world, 'get_issue', args);

		expect(JSON.stringify(reply)).toContain('Fixture edit');
		expect(evidenceOf(reply)).toEqual(['real_read', 'world_read']);
		expect(services.upstreamTools).toEqual(['get_issue']);
	});

	// The guard reads the real service before every read. It does not seed an issue that the Gym holds.
	// The Gym keeps the edit and answers.
	it('serves a lookup by ID after a Gym-only edit from the Gym, after one upstream read', async () => {
		const services = fakeServices();
		const world = await backend.openWorld(input);
		await call(world, 'get_issue', args);
		await call(world, 'save_issue', { ...args, title: 'Fixture edit' });
		services.upstreamTools.length = 0;

		const reply = await call(world, 'get_issue', args);

		expect(JSON.stringify(reply)).toContain('Fixture edit');
		expect(services.upstreamTools).toEqual(['get_issue']);
		expect(evidenceOf(reply)).toEqual(['real_read', 'world_read']);
	});
});

// Runs only under the Gym launcher (`deploy/e2e/linear-spike.mjs`), which sets these variables.
it.skipIf(!process.env.GYM_BASE_URL)(
	'updates only the issue of its own world in a real Gym',
	async () => {
		const backend = new LinearGymBackend();
		// The answer of the Gym about what it serves is now in the cache.
		expect(await backend.describeTools(input.agent)).toHaveLength(1);
		const observe = vi.spyOn(globalThis, 'fetch');
		const first = await backend.openWorld(input);
		expect(observe.mock.calls.map(([url]) => url)).toEqual([
			`${process.env.GYM_BASE_URL}/_sim/v1/tenants/${first.worldId}`,
		]);
		expect(
			JSON.parse(String(observe.mock.calls[0][1]?.body)).world.native.linear,
		).not.toHaveProperty('issues');
		observe.mockRestore();

		const before = await call(first, 'get_issue', args);
		expect(evidenceOf(before)).toEqual(['real_read', 'world_read']);
		expect(JSON.stringify(before)).toContain(ISSUE_UUID);
		expect(
			evidenceOf(await call(first, 'save_issue', { ...args, title: 'Updated locally' })),
		).toEqual(['world_write']);
		expect(JSON.stringify(await call(first, 'get_issue', args))).toContain('Updated locally');

		for (const overrides of [{ testChatId: 'fresh' }, { ownerId: 'other' }, {}]) {
			const next = await backend.openWorld({ ...input, ...overrides });
			expect(next.worldId).not.toEqual(first.worldId);
			const result = await call(next, 'get_issue', args);
			expect(result.outcome).toBe('served');
			expect(JSON.stringify(result)).not.toContain('Updated locally');
			expect(JSON.stringify(result)).toContain(ISSUE_UUID);
		}

		const writeFirst = await backend.openWorld({ ...input, testChatId: 'write-first' });
		expect(
			evidenceOf(await call(writeFirst, 'save_issue', { ...args, title: 'Write first' })),
		).toEqual(['real_read', 'world_write']);
		expect(JSON.stringify(await call(writeFirst, 'get_issue', args))).toContain('Write first');

		const fetchSpy = vi.spyOn(globalThis, 'fetch');
		try {
			for (const failure of ['TimeoutError', 'Unavailable']) {
				fetchSpy.mockRejectedValueOnce(new Error(failure));
				expect(await call(first, 'save_issue', { ...args, title: 'Not applied' })).toEqual({
					outcome: 'unavailable',
				});
			}
			expect(fetchSpy.mock.calls.map(([url]) => url)).toEqual(
				Array(2).fill(`${process.env.GYM_BASE_URL}/mcp`),
			);
		} finally {
			fetchSpy.mockRestore();
		}
	},
);
