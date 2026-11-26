import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	type AgentSimulationGym,
	AgentSimulationGymProvider,
	type AgentSimulationGymTenant,
	type GymRequest,
	type GymResponse,
} from '../gym/agent-simulation-gym';
import { GymSimulationBackend } from '../gym/gym-simulation-backend';
import type { OutboundRequest, SimulatedAgent } from '../tool-simulation.contracts';

const VENDORS_BY_NODE: Record<string, string> = { 'n8n-nodes-base.slackTool': 'slack' };
const VENDORS_BY_HOST: Record<string, string> = { 'slack.com': 'slack' };

/** A tenant that keeps Slack messages, so a later read sees an earlier write. */
function fakeTenant(id: string): AgentSimulationGymTenant & { closed: boolean } {
	const messages: string[] = [];
	return {
		id,
		closed: false,
		async handle(vendor: string, request: GymRequest): Promise<GymResponse | undefined> {
			if (vendor !== 'slack') return undefined;
			const path = new URL(request.url).pathname;
			if (path === '/api/chat.postMessage') {
				messages.push((request.body as { text: string }).text);
				return { statusCode: 200, headers: { 'set-cookie': ['a=1', 'b=2'] }, body: { ok: true } };
			}
			if (path === '/api/conversations.history') {
				return { statusCode: 200, headers: {}, body: { messages } };
			}
			if (path === '/api/full') return { statusCode: 507, headers: {}, body: {} };
			if (path === '/api/broken') throw new Error('engine crashed');
			return { statusCode: 501, headers: {}, body: {} };
		},
		async close() {
			this.closed = true;
		},
	};
}

function setup({ bound = true } = {}) {
	const tenants: ReturnType<typeof fakeTenant>[] = [];
	const gym: AgentSimulationGym = {
		vendorForNodeType: vi.fn(async (nodeType: string) => VENDORS_BY_NODE[nodeType]),
		vendorForHost: vi.fn(async (host: string) => VENDORS_BY_HOST[host]),
		openTenant: vi.fn(async (id: string) => {
			const tenant = fakeTenant(id);
			tenants.push(tenant);
			return tenant;
		}),
	};
	const provider = new AgentSimulationGymProvider();
	if (bound) provider.bind(gym);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	return { backend: new GymSimulationBackend(provider, logger), gym, tenants };
}

const agent: SimulatedAgent = {
	agentId: 'agent-1',
	projectId: 'project-1',
	name: 'Support bot',
	instructions: '',
	tools: [
		{ toolName: 'Send Slack', kind: 'node', nodeType: 'n8n-nodes-base.slackTool' },
		{ toolName: 'Send Email', kind: 'node', nodeType: 'n8n-nodes-base.emailSendTool' },
		{ toolName: 'Call API', kind: 'node', nodeType: 'n8n-nodes-base.httpRequestTool' },
		{ toolName: 'Create ticket', kind: 'workflow' },
		{ toolName: 'linear', kind: 'mcp', origin: 'https://mcp.linear.app' },
		{ toolName: 'web_search', kind: 'web_search' },
	],
};

const openInput = { ownerId: 'user-1', testChatId: 'chat-1', agent, firstMessage: 'hi' };
const call = { toolName: 'Send Slack' };

const post = (text: string): OutboundRequest => ({
	protocol: 'http',
	method: 'POST',
	url: 'https://slack.com/api/chat.postMessage',
	body: { text },
});
const get = (path: string, host = 'slack.com'): OutboundRequest => ({
	protocol: 'http',
	method: 'GET',
	url: `https://${host}${path}`,
});

describe('GymSimulationBackend', () => {
	it('marks a tool simulated only when the Gym serves it', async () => {
		const { backend } = setup();

		const capabilities = await backend.describeTools(agent);

		expect(capabilities).toEqual([
			{ toolName: 'Send Slack', kind: 'node', testability: 'simulated' },
			{
				toolName: 'Send Email',
				kind: 'node',
				testability: 'blocked',
				reason: 'unsupported_by_simulator',
				detail: 'The test world does not have n8n-nodes-base.emailSendTool yet.',
			},
			{ toolName: 'Call API', kind: 'node', testability: 'simulated' },
			{ toolName: 'Create ticket', kind: 'workflow', testability: 'simulated' },
			{
				toolName: 'linear',
				kind: 'mcp',
				testability: 'blocked',
				reason: 'unsupported_by_simulator',
				detail: 'The test world does not have MCP servers yet.',
			},
			{
				toolName: 'web_search',
				kind: 'web_search',
				testability: 'blocked',
				reason: 'unsupported_by_simulator',
				detail: 'The test world does not have web search yet.',
			},
		]);
	});

	it('serves a later read from an earlier write in the same world', async () => {
		const { backend } = setup();
		const world = await backend.openWorld(openInput);

		const written = await world.handleRequest(post('Deploy done'), call);
		const read = await world.handleRequest(get('/api/conversations.history'), call);

		expect(written).toEqual({
			outcome: 'served',
			source: 'world_state',
			evidence: ['world_write'],
			status: 200,
			headers: { 'set-cookie': ['a=1', 'b=2'] },
			body: { ok: true },
		});
		expect(read).toMatchObject({
			outcome: 'served',
			evidence: ['world_read'],
			body: { messages: ['Deploy done'] },
		});
	});

	it('keeps each set-cookie value apart instead of joining them into one cookie', async () => {
		const { backend } = setup();
		const world = await backend.openWorld(openInput);

		const reply = await world.handleRequest(post('with cookies'), call);

		expect(reply).toMatchObject({ headers: { 'set-cookie': ['a=1', 'b=2'] } });
	});

	it('gives each world its own tenant, so a new test chat starts empty', async () => {
		const { backend, tenants } = setup();
		const first = await backend.openWorld(openInput);
		await first.handleRequest(post('only in the first chat'), call);

		const second = await backend.openWorld({ ...openInput, testChatId: 'chat-2' });
		const read = await second.handleRequest(get('/api/conversations.history'), call);

		expect(read).toMatchObject({ body: { messages: [] } });
		expect(tenants).toHaveLength(2);
		expect(tenants[0].id).toMatch(/^agent-test-chat-1-/);
		expect(first.worldId).not.toBe(second.worldId);
	});

	it('opens a new tenant when the same test chat opens a world again', async () => {
		const { backend } = setup();

		const before = await backend.openWorld(openInput);
		const after = await backend.openWorld(openInput);

		expect(after.worldId).not.toBe(before.worldId);
	});

	it.each([
		['a host the Gym does not have', get('/v1/charges', 'api.stripe.com'), 'unsupported'],
		['a route the Gym answers with 501', get('/api/unknown.method'), 'unsupported'],
		['a full tenant', get('/api/full'), 'unavailable'],
		['a failing engine', get('/api/broken'), 'unavailable'],
		['an MCP request', { protocol: 'mcp', server: 'linear', method: 'POST' }, 'unsupported'],
		['a web search', { protocol: 'web_search', args: { query: 'n8n' } }, 'unsupported'],
		[
			'a URL that does not parse',
			{ protocol: 'http', method: 'GET', url: 'not a url' },
			'unsupported',
		],
	] as [string, OutboundRequest, string][])(
		'blocks %s and never falls back',
		async (_name, request, outcome) => {
			const { backend } = setup();
			const world = await backend.openWorld(openInput);

			const reply = await world.handleRequest(request, call);

			expect(reply.outcome).toBe(outcome);
		},
	);

	it('closes the tenant of a world once', async () => {
		const { backend, tenants } = setup();
		const world = await backend.openWorld(openInput);

		await backend.closeWorld(world.worldId);
		await backend.closeWorld(world.worldId);

		expect(tenants[0].closed).toBe(true);
	});

	it('fails to open a world when the Gym cannot open a tenant', async () => {
		const { backend, gym } = setup();
		vi.mocked(gym.openTenant).mockRejectedValue(new Error('no free tenant slot'));

		await expect(backend.openWorld(openInput)).rejects.toThrow('no free tenant slot');
	});

	describe('when the test run stops', () => {
		it('stops waiting for a pending reply and passes the signal to the tenant', async () => {
			const { backend, tenants } = setup();
			const world = await backend.openWorld(openInput);
			const handle = vi.spyOn(tenants[0], 'handle').mockReturnValue(new Promise(() => {}));
			const controller = new AbortController();

			const reply = world.handleRequest(post('never answered'), {
				...call,
				signal: controller.signal,
			});
			await vi.waitFor(() => expect(handle).toHaveBeenCalled());
			controller.abort();

			await expect(reply).rejects.toThrow('The test run was stopped.');
			expect(handle).toHaveBeenCalledWith('slack', expect.anything(), {
				signal: controller.signal,
			});
		});

		it('does not ask the Gym when the run already stopped', async () => {
			const { backend, gym, tenants } = setup();
			const world = await backend.openWorld(openInput);
			const handle = vi.spyOn(tenants[0], 'handle');
			const controller = new AbortController();
			controller.abort();

			await expect(
				world.handleRequest(post('too late'), { ...call, signal: controller.signal }),
			).rejects.toThrow('The test run was stopped.');
			expect(gym.vendorForHost).not.toHaveBeenCalled();
			expect(handle).not.toHaveBeenCalled();
		});
	});

	describe('before a module binds the Gym', () => {
		it('reports every tool as blocked because the simulator is unavailable', async () => {
			const { backend } = setup({ bound: false });

			const capabilities = await backend.describeTools(agent);

			expect(capabilities).toHaveLength(agent.tools.length);
			for (const capability of capabilities) {
				expect(capability).toMatchObject({
					testability: 'blocked',
					reason: 'simulator_unavailable',
				});
			}
		});

		it('fails to open a world, so the test run blocks every simulated call', async () => {
			const { backend } = setup({ bound: false });

			await expect(backend.openWorld(openInput)).rejects.toThrow(
				'No module provides the test world.',
			);
		});
	});
});
