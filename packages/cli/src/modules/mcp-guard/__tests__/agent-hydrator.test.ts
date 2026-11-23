import { AgentHydrator, type HydrationLlm, type HydrationTool } from '../agent-hydrator';
import type { GymAdmin } from '../gym-admin';
import type { McpCaller } from '../mcp-upstream';

const text = (t: string) => ({ content: [{ type: 'text' as const, text: t }] });

function setup(llm: HydrationLlm) {
	const seeded: Array<[string, unknown]> = [];
	const state = { seedError: undefined as Error | undefined };
	const admin = {
		seed: async (tenant: string, overlay: unknown) => {
			if (state.seedError) throw state.seedError;
			seeded.push([tenant, overlay]);
		},
		event: async () => {},
	} as unknown as GymAdmin;
	const upstreamCalls: Array<[string, unknown]> = [];
	const gymCalls: Array<[string, unknown]> = [];
	const caller = (log: Array<[string, unknown]>, answer: string) =>
		({
			callTool: async (name: string, args: unknown) => {
				log.push([name, args]);
				return text(answer);
			},
		}) as unknown as McpCaller;
	const hydrator = new AgentHydrator({
		admin,
		tenant: 't1',
		upstream: caller(upstreamCalls, 'real data'),
		gym: caller(gymCalls, 'gym data'),
		readTools: new Set(['get_thing']),
		serviceInstructions: 'service rules',
		llm,
	});
	return { hydrator, state, seeded, upstreamCalls, gymCalls };
}

const byName = (tools: HydrationTool[], name: string) => tools.find((t) => t.name === name)!;

describe('AgentHydrator', () => {
	it('gives the agent the call and the real result, and tools bound to the run', async () => {
		let seen: Parameters<HydrationLlm>[0] | undefined;
		const { hydrator, seeded, upstreamCalls } = setup(async (req) => {
			seen = req;
			await byName(req.tools, 'gym_seed').run({ overlay: { world_version: 1 } });
			await byName(req.tools, 'real_read').run({ tool: 'get_thing', args: { id: 'x' } });
		});
		await hydrator.hydrate('get_thing', { id: 'x' }, text('the real result'));
		expect(seen?.prompt).toContain('the real result');
		expect(seen?.instructions).toContain('service rules');
		expect(seeded).toEqual([['t1', { world_version: 1 }]]);
		expect(upstreamCalls).toEqual([['get_thing', { id: 'x' }]]);
	});

	it('refuses a tool outside the read list, on the real service and on the gym', async () => {
		const { hydrator, upstreamCalls, gymCalls } = setup(async (req) => {
			expect(await byName(req.tools, 'real_read').run({ tool: 'save_thing', args: {} })).toMatch(
				/not a read tool/,
			);
			expect(await byName(req.tools, 'gym_read').run({ tool: 'save_thing', args: {} })).toMatch(
				/not a read tool/,
			);
		});
		await hydrator.hydrate('get_thing', {}, text('r'));
		expect(upstreamCalls).toEqual([]);
		expect(gymCalls).toEqual([]);
	});

	it('returns seed errors to the agent instead of throwing', async () => {
		const { hydrator, state } = setup(async (req) => {
			expect(await byName(req.tools, 'gym_seed').run({ overlay: {} })).toBe(
				'error: $.pages[0].id: "x" is not a UUID',
			);
		});
		state.seedError = new Error('$.pages[0].id: "x" is not a UUID');
		await hydrator.hydrate('get_thing', {}, text('r'));
	});

	it('does not fail the call when the agent fails', async () => {
		const { hydrator } = setup(async () => {
			throw new Error('model down');
		});
		await expect(hydrator.hydrate('get_thing', {}, text('r'))).resolves.toBeUndefined();
		await expect(hydrator.hydrateWrite('create', {})).resolves.toBeUndefined();
	});

	it('runs the agent once for an identical read, and again after a failure', async () => {
		let runs = 0;
		let fail = true;
		const { hydrator } = setup(async () => {
			runs++;
			if (fail) throw new Error('model down');
		});
		await hydrator.hydrate('get_thing', { id: 1 }, text('r'));
		fail = false;
		await hydrator.hydrate('get_thing', { id: 1 }, text('r'));
		await hydrator.hydrate('get_thing', { id: 1 }, text('r'));
		expect(runs).toBe(2);
	});

	it('tells the agent not to apply a write', async () => {
		let prompt = '';
		const { hydrator } = setup(async (req) => {
			prompt = req.prompt;
		});
		await hydrator.hydrateWrite('create_thing', { parent: 'p' });
		expect(prompt).toContain('Do not call the write tool');
		expect(prompt).toContain('create_thing');
	});
});
