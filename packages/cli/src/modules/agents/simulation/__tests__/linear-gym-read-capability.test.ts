import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { createHash } from 'node:crypto';

import { LinearGymBackend, loopbackFixtureReadCapability } from '../linear-gym-backend';
import type { ReadCapabilityBinding, ReadCapabilityFactory } from '../read-capability';
import type {
	OpenWorldInput,
	OutboundRequest,
	SimulatedReply,
	SimulationWorld,
} from '../tool-simulation.contracts';

mockInstance(Logger);

const GYM_BASE = 'http://127.0.0.1:41001';
const UPSTREAM_URL = 'http://127.0.0.1:41002/mcp';
const HARNESS_TOKEN = 'synthetic-loopback-harness';
const args = { id: 'FIN-412' };

const digest = (value: string) => createHash('sha256').update(value).digest('hex');
/** Synthetic. It stands for the upstream credential of one user. */
const tokenOf = (ownerId: string) => `synthetic-upstream-${digest(ownerId).slice(0, 24)}`;
const scopeOf = (binding: ReadCapabilityBinding) =>
	digest(JSON.stringify([binding.ownerId, binding.projectId, binding.agentId, binding.testChatId]));
/** The scope that the loopback fixture caller must derive from a binding. Written out here. */
const fixtureScopeOf = (binding: ReadCapabilityBinding) =>
	digest(
		JSON.stringify([
			binding.ownerId,
			binding.projectId,
			binding.agentId,
			binding.testChatId,
			'linear',
		]),
	);

// Two owners, the same agent and the same chat ID.
function inputOf(ownerId: string): OpenWorldInput {
	return {
		ownerId,
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
}
const bindingOf = (ownerId: string): ReadCapabilityBinding => ({
	ownerId,
	projectId: 'project',
	agentId: 'agent',
	testChatId: 'chat',
});

interface Sent {
	target: 'gym' | 'upstream';
	/** Method, path and query. */
	request: string;
	headers: Record<string, string>;
	/** Headers and body as one text, for a search of a credential in any position. */
	text: string;
}

/**
 * An in-memory Gym and an in-memory Linear in place of `fetch`. No request leaves the process.
 * The fake records the destination and the headers of each request. The Linear side answers
 * with a title that names the owner of the token (or of the scope) of the request.
 */
function fakeServices(owners: string[]) {
	vi.stubEnv('GYM_BASE_URL', GYM_BASE);
	vi.stubEnv('LINEAR_UPSTREAM_URL', UPSTREAM_URL);
	vi.stubEnv('GYM_HARNESS_TOKEN', HARNESS_TOKEN);

	const sent: Sent[] = [];
	const titles = new Map<string, string | undefined>();
	const gymTokens = new Set([HARNESS_TOKEN]);
	const issue = (title: string) => ({
		id: 'FIN-412',
		uuid: '33333333-3333-4333-8333-333333333333',
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
		const headers = Object.fromEntries(new Headers(init.headers));
		const target = new URL(url);
		const request = `${init.method ?? 'GET'} ${target.pathname}${target.search}`;
		// The backend asks the Gym what it serves before it opens a world.
		if (url === `${GYM_BASE}/_sim/v1/manifest?service=linear`) {
			sent.push({ target: 'gym', request, headers, text: JSON.stringify(headers) });
			return reply({
				contract: 'sim-service/v1',
				service: 'linear',
				interfaces: { mcp: [{ url: 'https://mcp.linear.app/mcp', status: 'implemented' }] },
			});
		}
		const text = JSON.stringify(headers) + String(init.body);
		const body = JSON.parse(String(init.body));
		if (url === UPSTREAM_URL) {
			sent.push({ target: 'upstream', request, headers, text });
			const owner = owners.find(
				(o) =>
					headers.authorization === `Bearer ${tokenOf(o)}` ||
					headers['x-fixture-scope'] === scopeOf(bindingOf(o)) ||
					headers['x-fixture-scope'] === fixtureScopeOf(bindingOf(o)),
			);
			return toolResult(issue(`Issue of ${owner}`));
		}
		const { origin, pathname } = new URL(url);
		if (origin !== GYM_BASE) throw new Error(`Unexpected request to ${url}`);
		sent.push({ target: 'gym', request, headers, text });
		const tenant = /^\/_sim\/v1\/tenants\/([^/]+)(\/seed)?$/.exec(pathname);
		if (tenant) {
			if (headers.authorization !== `Bearer ${HARNESS_TOKEN}`) throw new Error('Not the harness');
			titles.set(tenant[1], tenant[2] ? body.native.linear.issues[0].title : undefined);
			gymTokens.add(`gym-key-${tenant[1]}`);
			return reply({ n8n_credentials: { linearApi: { apiKey: `gym-key-${tenant[1]}` } } });
		}
		if (pathname !== '/mcp') throw new Error(`Unexpected Gym path ${pathname}`);
		const worldId = (headers.authorization ?? '').replace('Bearer gym-key-', '');
		if (!titles.has(worldId)) throw new Error('Not a Gym credential');
		if (titles.get(worldId) === undefined) return toolResult({ error: 'Issue not found' }, true);
		if (body.params.name === 'save_issue') titles.set(worldId, body.params.arguments.title);
		return toolResult(issue(titles.get(worldId) ?? ''));
	});

	return {
		sent,
		gymTokens,
		upstream: () => sent.filter((request) => request.target === 'upstream'),
		gym: () => sent.filter((request) => request.target === 'gym'),
	};
}

/**
 * A read capability with one synthetic token for each owner. It records each binding that the
 * backend asks for, and each tool name that reaches a caller.
 */
function recordingCapability() {
	const bindings: ReadCapabilityBinding[] = [];
	const allowlists: string[][] = [];
	const reached: Array<{ ownerId: string; toolName: string }> = [];
	const factory: ReadCapabilityFactory = async (binding, readTools) => {
		bindings.push(binding);
		allowlists.push([...readTools]);
		// A factory cannot widen the allowlist of the backend.
		(readTools as Set<string>).add('save_issue');
		const token = tokenOf(binding.ownerId);
		return {
			read: async (toolName, toolArgs) => {
				reached.push({ ownerId: binding.ownerId, toolName });
				const response = await fetch(UPSTREAM_URL, {
					method: 'POST',
					headers: { authorization: `Bearer ${token}`, 'x-fixture-scope': scopeOf(binding) },
					body: JSON.stringify({ params: { name: toolName, arguments: toolArgs } }),
				});
				return (await response.json()).result;
			},
		};
	};
	return { factory, bindings, allowlists, reached };
}

async function send(world: SimulationWorld, request: Partial<OutboundRequest> & { body: unknown }) {
	return await world.handleRequest(
		{ protocol: 'mcp', server: 'linear', method: 'POST', ...request } as OutboundRequest,
		{ toolName: 'linear' },
	);
}
async function call(world: SimulationWorld, name: string, toolArgs: Record<string, unknown>) {
	return await send(world, {
		body: { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name, arguments: toolArgs } },
	});
}
function titleOf(reply: SimulatedReply): string {
	if (reply.outcome !== 'served') throw new Error(`Expected a served reply, got ${reply.outcome}`);
	const { result } = reply.body as { result: { content: Array<{ text: string }> } };
	return JSON.parse(result.content[0].text).title;
}

afterEach(() => {
	vi.unstubAllEnvs();
	vi.unstubAllGlobals();
});

describe('LinearGymBackend read capability', () => {
	const A = 'owner-a';
	const B = 'owner-b';

	/** Each upstream request has the scope and the token of the same owner, and nothing else. */
	function expectOwnPairs(requests: Sent[], counts: Record<string, number>) {
		const seen: Record<string, number> = {};
		for (const { headers } of requests) {
			const owner = [A, B].find((o) => headers.authorization === `Bearer ${tokenOf(o)}`);
			if (!owner) throw new Error('An upstream request has no known token');
			expect(headers['x-fixture-scope']).toBe(scopeOf(bindingOf(owner)));
			seen[owner] = (seen[owner] ?? 0) + 1;
		}
		expect(seen).toEqual(counts);
	}

	it('asks for one caller when it opens a world, bound to that world and the read allowlist', async () => {
		const services = fakeServices([A, B]);
		const capability = recordingCapability();
		const backend = new LinearGymBackend(capability.factory);

		await backend.openWorld(inputOf(A));
		await backend.openWorld(inputOf(B));

		expect(capability.bindings).toEqual([bindingOf(A), bindingOf(B)]);
		expect(capability.bindings.every((binding) => Object.isFrozen(binding))).toBe(true);
		expect(capability.allowlists).toEqual([['get_issue'], ['get_issue']]);
		expect(capability.reached).toEqual([]);
		expect(services.upstream()).toEqual([]);
	});

	it('keeps the scope and the token of each owner apart in overlapping reads and edits', async () => {
		const services = fakeServices([A, B]);
		const capability = recordingCapability();
		const backend = new LinearGymBackend(capability.factory);
		const [worldA, worldB] = await Promise.all([
			backend.openWorld(inputOf(A)),
			backend.openWorld(inputOf(B)),
		]);
		expect(worldA.worldId).not.toEqual(worldB.worldId);

		// The first lookup copies the issue into each world with the token of its owner.
		const first = await Promise.all([
			call(worldA, 'get_issue', args),
			call(worldB, 'get_issue', args),
		]);
		expect(first.map(titleOf)).toEqual([`Issue of ${A}`, `Issue of ${B}`]);

		const mixed = await Promise.all([
			call(worldA, 'get_issue', args),
			call(worldB, 'save_issue', { ...args, title: 'Edit of B' }),
			call(worldB, 'get_issue', args),
			call(worldA, 'save_issue', { ...args, title: 'Edit of A' }),
			call(worldA, 'get_issue', args),
			call(worldB, 'get_issue', args),
		]);
		expect(mixed.map((reply) => reply.outcome)).toEqual(Array(6).fill('served'));
		expect(titleOf(await call(worldA, 'get_issue', args))).toBe('Edit of A');
		expect(titleOf(await call(worldB, 'get_issue', args))).toBe('Edit of B');

		// One read for each lookup, none for an edit of a copied issue.
		expectOwnPairs(services.upstream(), { [A]: 4, [B]: 4 });
		expect(capability.bindings).toHaveLength(2);
	});

	it('sends no upstream token to the Gym and no Gym token upstream', async () => {
		const services = fakeServices([A, B]);
		const backend = new LinearGymBackend(recordingCapability().factory);
		const worldA = await backend.openWorld(inputOf(A));
		const worldB = await backend.openWorld(inputOf(B));
		// A write to a new world reads its target first, then seeds and writes the Gym.
		await call(worldA, 'save_issue', { ...args, title: 'Write first' });
		await Promise.all([
			call(worldB, 'get_issue', args),
			call(worldA, 'get_issue', args),
			call(worldB, 'save_issue', { ...args, title: 'Edit of B' }),
		]);

		expect(services.upstream().length).toBeGreaterThan(0);
		expect(services.gym().length).toBeGreaterThan(0);
		// The harness token and one key for each world.
		expect(services.gymTokens.size).toBe(3);
		for (const request of services.gym()) {
			for (const owner of [A, B]) expect(request.text).not.toContain(tokenOf(owner));
			expect(request.text).not.toContain('synthetic-upstream-');
			expect(request.headers).not.toHaveProperty('x-fixture-scope');
			expect([...services.gymTokens].map((token) => `Bearer ${token}`)).toContain(
				request.headers.authorization,
			);
		}
		for (const request of services.upstream()) {
			for (const token of services.gymTokens) expect(request.text).not.toContain(token);
			expect(request.text).not.toContain(worldA.worldId);
			expect(request.text).not.toContain(worldB.worldId);
		}
	});

	it('keeps the caller of a world after another world opens', async () => {
		const services = fakeServices([A, B]);
		const capability = recordingCapability();
		const backend = new LinearGymBackend(capability.factory);

		const worldA = await backend.openWorld(inputOf(A));
		expect(titleOf(await call(worldA, 'get_issue', args))).toBe(`Issue of ${A}`);
		const worldB = await backend.openWorld(inputOf(B));
		expect(titleOf(await call(worldB, 'get_issue', args))).toBe(`Issue of ${B}`);
		// A second world for the same owner, agent and chat also gets its own caller.
		const worldA2 = await backend.openWorld(inputOf(A));
		const before = services.upstream().length;

		expect(titleOf(await call(worldA, 'get_issue', args))).toBe(`Issue of ${A}`);
		expect(titleOf(await call(worldB, 'get_issue', args))).toBe(`Issue of ${B}`);
		expect(titleOf(await call(worldA2, 'get_issue', args))).toBe(`Issue of ${A}`);

		expectOwnPairs(services.upstream().slice(before), { [A]: 2, [B]: 1 });
		expect(capability.reached.map(({ ownerId }) => ownerId)).toEqual([A, B, A, B, A]);
		expect(capability.bindings).toHaveLength(3);
	});

	it('never passes a write tool or an unlisted read tool to the caller', async () => {
		const services = fakeServices([A]);
		const capability = recordingCapability();
		const world = await new LinearGymBackend(capability.factory).openWorld(inputOf(A));

		// The write-first edit reads its target. Only the read reaches the caller.
		expect(titleOf(await call(world, 'save_issue', { ...args, title: 'Write first' }))).toBe(
			'Write first',
		);
		expect(titleOf(await call(world, 'save_issue', { ...args, title: 'Second edit' }))).toBe(
			'Second edit',
		);
		for (const name of ['list_issues', 'get_team', 'delete_issue', 'create_issue']) {
			expect(await call(world, name, args)).toEqual({ outcome: 'unsupported' });
		}

		expect(capability.reached).toEqual([{ ownerId: A, toolName: 'get_issue' }]);
		expect(services.upstream()).toHaveLength(1);
		expect(services.upstream()[0].text).not.toContain('save_issue');
	});

	it('does not give a request in the world of one owner the caller of another owner', async () => {
		const services = fakeServices([A, B]);
		const capability = recordingCapability();
		const backend = new LinearGymBackend(capability.factory);
		// The world of A opens last, so a shared slot would hold the caller of A.
		const worldB = await backend.openWorld(inputOf(B));
		await backend.openWorld(inputOf(A));
		const foreign = {
			authorization: `Bearer ${tokenOf(A)}`,
			'x-fixture-scope': scopeOf(bindingOf(A)),
		};
		const rpc = (toolArgs: unknown, extra: Record<string, unknown> = {}) => ({
			jsonrpc: '2.0',
			id: 3,
			method: 'tools/call',
			params: { name: 'get_issue', arguments: toolArgs, ...extra },
			...extra,
		});

		// A URL, a header, a token or an identity in the arguments is not a known argument.
		for (const extra of [
			{ ownerId: A },
			{ url: 'http://127.0.0.1:41003/mcp' },
			{ headers: foreign },
			{ token: tokenOf(A) },
			{ testChatId: 'chat', projectId: 'project', agentId: 'agent' },
		]) {
			expect(await send(worldB, { body: rpc({ ...args, ...extra }) })).toEqual({
				outcome: 'unsupported',
			});
		}
		expect(services.upstream()).toEqual([]);

		// Outside the arguments the backend ignores them. The read uses the caller of the world.
		const replies = [
			await send(worldB, { headers: foreign, body: rpc(args) }),
			await send(worldB, {
				body: rpc(args, { ownerId: A, _meta: { ownerId: A, ...foreign }, headers: foreign }),
			}),
		];

		expect(replies.map(titleOf)).toEqual([`Issue of ${B}`, `Issue of ${B}`]);
		expectOwnPairs(services.upstream(), { [B]: 2 });
		expect(capability.reached.every(({ ownerId }) => ownerId === B)).toBe(true);
		// A request never makes the backend ask the factory for a caller.
		expect(capability.bindings).toEqual([bindingOf(B), bindingOf(A)]);
	});
});

describe('loopbackFixtureReadCapability', () => {
	const A = 'owner-a';
	const B = 'owner-b';

	it('sends the scope that it derives from the binding of each owner, and no credential', async () => {
		const services = fakeServices([A, B]);
		const backend = new LinearGymBackend();
		const worldA = await backend.openWorld(inputOf(A));
		const worldB = await backend.openWorld(inputOf(B));

		// The fake Linear names the owner of the scope. Each world gets the issue of its owner.
		const first = await Promise.all([
			call(worldA, 'get_issue', args),
			call(worldB, 'get_issue', args),
		]);
		expect(first.map(titleOf)).toEqual([`Issue of ${A}`, `Issue of ${B}`]);
		await Promise.all([call(worldB, 'get_issue', args), call(worldA, 'get_issue', args)]);
		// Requests that do not overlap have a known order.
		await call(worldA, 'get_issue', args);
		await call(worldB, 'get_issue', args);

		const requests = services.upstream();
		expect(requests).toHaveLength(6);
		for (const request of requests) {
			expect(Object.keys(request.headers).sort()).toEqual([
				'accept',
				'content-type',
				'x-fixture-scope',
			]);
			for (const token of services.gymTokens) expect(request.text).not.toContain(token);
		}
		// The complete scope of each request is the digest of the binding of one owner. A value
		// that only differs for each world (a random value, the world ID) is not accepted.
		const expected = { [fixtureScopeOf(bindingOf(A))]: A, [fixtureScopeOf(bindingOf(B))]: B };
		const owners = requests.map((request) => expected[request.headers['x-fixture-scope']]);
		expect(owners.slice(0, 4).sort()).toEqual([A, A, B, B]);
		expect(owners.slice(4)).toEqual([A, B]);
		for (const world of [worldA, worldB])
			for (const request of requests) expect(request.text).not.toContain(world.worldId);
	});

	it('derives the same scope for a second world of the same binding', async () => {
		const services = fakeServices([A]);
		const backend = new LinearGymBackend();
		const first = await backend.openWorld(inputOf(A));
		const second = await backend.openWorld(inputOf(A));
		expect(second.worldId).not.toBe(first.worldId);

		expect(titleOf(await call(first, 'get_issue', args))).toBe(`Issue of ${A}`);
		expect(titleOf(await call(second, 'get_issue', args))).toBe(`Issue of ${A}`);

		expect(services.upstream().map((request) => request.headers['x-fixture-scope'])).toEqual([
			fixtureScopeOf(bindingOf(A)),
			fixtureScopeOf(bindingOf(A)),
		]);
	});

	it.each<[string, Partial<ReadCapabilityBinding>]>([
		['owner', { ownerId: 'owner-c' }],
		['project', { projectId: 'project-2' }],
		['agent', { agentId: 'agent-2' }],
		['test chat', { testChatId: 'chat-2' }],
	])('derives another scope when the %s of the binding changes', async (_, change) => {
		const services = fakeServices([A]);
		const binding = { ...bindingOf(A), ...change };
		const caller = await loopbackFixtureReadCapability(binding, new Set(['get_issue']));
		await caller.read('get_issue', args);

		const [request] = services.upstream();
		expect(request.headers['x-fixture-scope']).toBe(fixtureScopeOf(binding));
		expect(request.headers['x-fixture-scope']).not.toBe(fixtureScopeOf(bindingOf(A)));
	});

	it('refuses a tool outside its allowlist and a destination that is not on loopback', async () => {
		const services = fakeServices([]);
		const caller = await loopbackFixtureReadCapability(bindingOf(A), new Set(['get_issue']));
		await expect(caller.read('save_issue', { ...args, title: 'x' })).rejects.toThrow('unavailable');
		expect(services.sent).toEqual([]);

		vi.stubEnv('LINEAR_UPSTREAM_URL', 'https://mcp.linear.app/mcp');
		await expect(
			loopbackFixtureReadCapability(bindingOf(A), new Set(['get_issue'])),
		).rejects.toThrow('unavailable');
	});

	it('refuses a destination on the origin of the Gym', async () => {
		fakeServices([]);
		vi.stubEnv('LINEAR_UPSTREAM_URL', `${GYM_BASE}/mcp`);
		await expect(
			loopbackFixtureReadCapability(bindingOf(A), new Set(['get_issue'])),
		).rejects.toThrow('unavailable');
	});
});

describe('LinearGymBackend world open order', () => {
	const A = 'owner-a';
	const tenantRequests = (services: ReturnType<typeof fakeServices>) =>
		services.sent.filter(({ request }) => request.includes('/_sim/v1/tenants/'));

	it('creates no Gym tenant when the factory gives no caller', async () => {
		const services = fakeServices([A]);
		const factory = vi.fn<ReadCapabilityFactory>(async () => {
			throw new Error('No credential for this owner');
		});
		const backend = new LinearGymBackend(factory);

		await expect(backend.openWorld(inputOf(A))).rejects.toThrow('unavailable');

		expect(factory).toHaveBeenCalledTimes(1);
		// The only request is the capability read. No tenant, no seed, no tool call.
		expect(services.sent.map(({ request }) => request)).toEqual([
			'GET /_sim/v1/manifest?service=linear',
		]);
	});

	it('asks the factory before it creates the Gym tenant', async () => {
		const services = fakeServices([A]);
		const capability = recordingCapability();
		let tenantsAtFactory = -1;
		const backend = new LinearGymBackend(async (binding, readTools) => {
			tenantsAtFactory = tenantRequests(services).length;
			return await capability.factory(binding, readTools);
		});

		const world = await backend.openWorld(inputOf(A));

		expect(tenantsAtFactory).toBe(0);
		expect(tenantRequests(services).map(({ request }) => request)).toEqual([
			`PUT /_sim/v1/tenants/${world.worldId}`,
		]);
	});

	it.each([
		['is not set', ''],
		['is not on loopback', 'https://mcp.linear.app/mcp'],
		['is on the origin of the Gym', `${GYM_BASE}/mcp`],
	])('opens a world with a custom factory when LINEAR_UPSTREAM_URL %s', async (_, upstreamUrl) => {
		const services = fakeServices([A]);
		vi.stubEnv('LINEAR_UPSTREAM_URL', upstreamUrl);
		const reached: string[] = [];
		const backend = new LinearGymBackend(async (binding) => ({
			read: async (toolName) => {
				reached.push(toolName);
				return {
					content: [
						{
							type: 'text',
							text: JSON.stringify({
								id: 'FIN-412',
								uuid: '33333333-3333-4333-8333-333333333333',
								title: `Issue of ${binding.ownerId}`,
								team: 'Finance',
								teamId: '11111111-1111-4111-8111-111111111111',
							}),
						},
					],
				};
			},
		}));

		const world = await backend.openWorld(inputOf(A));

		expect(titleOf(await call(world, 'get_issue', args))).toBe(`Issue of ${A}`);
		expect(reached).toEqual(['get_issue']);
		expect(services.upstream()).toEqual([]);
	});

	it.each([
		['is not set', ''],
		['is not on loopback', 'https://mcp.linear.app/mcp'],
		['is on the origin of the Gym', `${GYM_BASE}/mcp`],
	])(
		'creates no Gym tenant with the loopback factory when LINEAR_UPSTREAM_URL %s',
		async (_, upstreamUrl) => {
			const services = fakeServices([A]);
			vi.stubEnv('LINEAR_UPSTREAM_URL', upstreamUrl);

			await expect(new LinearGymBackend().openWorld(inputOf(A))).rejects.toThrow('unavailable');

			expect(tenantRequests(services)).toEqual([]);
			expect(services.upstream()).toEqual([]);
		},
	);
});
