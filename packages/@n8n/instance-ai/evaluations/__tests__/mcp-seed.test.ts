import type { N8nClient } from '../clients/n8n-client';
import { reconstructSeedFromThread } from '../harness/langsmith-seed';
import type { EvalLogger } from '../harness/logger';
import { executePriorRuns } from '../harness/prior-runs';
import type { CaseSeed } from '../harness/schema';
import { prepareMcpBuildSeed } from '../run/mcp-seed';
import type { ConversationTurn, ExecutionScenario } from '../types';

vi.mock('../harness/prior-runs', () => ({ executePriorRuns: vi.fn() }));
vi.mock('../harness/langsmith-seed', () => ({ reconstructSeedFromThread: vi.fn() }));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

type InlineSeed = Extract<CaseSeed, { mode: 'inline' }>;

const inlineSeed = (overrides: Partial<InlineSeed> = {}): InlineSeed => ({
	mode: 'inline',
	messages: [],
	workflows: [],
	dataTables: [],
	agents: [],
	folders: [],
	projects: [],
	...overrides,
});

const seedWorkflow = (id: string, name: string) => ({
	id,
	name,
	nodes: [],
	connections: {},
});

const message = (id: string, role: 'user' | 'assistant', text: string, minute: number) => ({
	id,
	role,
	type: 'llm',
	createdAt: `2026-06-29T09:${String(minute).padStart(2, '0')}:00.000Z`,
	content: [{ type: 'text', text }],
});

const user = (text: string): ConversationTurn => ({ role: 'user', text });

function makeClients() {
	const restoreThread = vi.fn(
		async (
			_threadId: string,
			_messages: unknown[],
			workflows: Array<{ id: string }>,
			dataTables: unknown[] = [],
			agents: Array<{ id: string }> = [],
		) => ({
			restored: 0,
			// The server pins the remapped ids, so it hands them back unchanged.
			workflowIds: workflows.map((workflow) => workflow.id),
			dataTableIds: dataTables.map((_, index) => `dt-${String(index)}`),
			agentIds: agents.map((agent) => agent.id),
			folderIds: [],
		}),
	);
	const owner = {
		ensureThread: vi.fn(async () => {}),
		restoreThread,
		setWorkflowsAvailableInMcp: vi.fn(async () => {}),
		setAgentsAvailableInMcp: vi.fn(async () => {}),
		createTeamProject: vi.fn(async (name: string) => ({ id: `project-${name}`, name })),
		addProjectViewer: vi.fn(async () => {}),
	};
	const member = { getPersonalProjectId: vi.fn(async () => 'member-project') };
	return { owner, member };
}

async function prepare(
	clients: ReturnType<typeof makeClients>,
	opts: {
		seed?: CaseSeed;
		conversation?: ConversationTurn[];
		executionScenarios?: ExecutionScenario[];
	},
) {
	return await prepareMcpBuildSeed({
		ownerClient: clients.owner as unknown as N8nClient,
		memberClient: clients.member as unknown as N8nClient,
		memberUserId: 'member-user',
		conversation: opts.conversation ?? [user('Fix it')],
		seed: opts.seed,
		executionScenarios: opts.executionScenarios,
		logger: silentLogger,
	});
}

describe('prepareMcpBuildSeed', () => {
	beforeEach(() => {
		vi.mocked(executePriorRuns).mockReset();
		vi.mocked(reconstructSeedFromThread).mockReset();
	});

	it('does nothing for a case with no seed and no scenario tables', async () => {
		const clients = makeClients();

		expect(await prepare(clients, {})).toBeUndefined();
		expect(clients.owner.ensureThread).not.toHaveBeenCalled();
	});

	it('restores the seed into the build user project and opens it to MCP', async () => {
		const clients = makeClients();
		const seed = inlineSeed({
			workflows: [seedWorkflow('wf-seed-0001', 'Order sync')],
			dataTables: [{ id: 'dt-seed-0001', name: 'orders', columns: [] }],
		});

		const prepared = await prepare(clients, { seed });

		expect(clients.owner.ensureThread).toHaveBeenCalledWith(prepared?.threadId, 'member-project');
		const [, messages, workflows, dataTables] = clients.owner.restoreThread.mock.calls[0];
		// The history reaches `claude` as text; the thread only carries the artifacts.
		expect(messages).toEqual([]);
		expect(workflows).toHaveLength(1);
		expect(dataTables).toHaveLength(1);
		expect(prepared?.workflowIds).toEqual([workflows[0].id]);
		// MCP tools ignore a workflow that is not exposed to MCP.
		expect(clients.owner.setWorkflowsAvailableInMcp).toHaveBeenCalledWith([workflows[0].id]);
	});

	it('names the attached workflow in the opening message and puts it first', async () => {
		const clients = makeClients();
		const seed = inlineSeed({
			workflows: [
				seedWorkflow('wf-other-0001', 'Helper'),
				seedWorkflow('wf-seed-0001', 'Order sync'),
			],
		});

		const prepared = await prepare(clients, {
			seed,
			conversation: [
				{ role: 'user', text: 'It broke again', attach: { workflow: 'wf-seed-0001' } },
			],
		});

		const restored = clients.owner.restoreThread.mock.calls[0][2][1] as {
			id: string;
			name: string;
		};
		expect(prepared?.workflowIds[0]).toBe(restored.id);
		expect(prepared?.openingNote).toBe(`[attached workflow: ${restored.name}]`);
		expect(prepared?.openingPrefix).toContain(restored.id);
	});

	it('refuses to run an attachment the restore did not produce', async () => {
		const clients = makeClients();

		await expect(
			prepare(clients, {
				seed: inlineSeed({ workflows: [seedWorkflow('wf-seed-0001', 'Order sync')] }),
				conversation: [{ role: 'user', text: 'Fix it', attach: { workflow: 'wf-missing-0001' } }],
			}),
		).rejects.toThrow(/wf-missing-0001/);
	});

	it('opens a seeded Agent to MCP and lists it as an artifact of the build', async () => {
		const clients = makeClients();
		const seed = inlineSeed({
			agents: [
				{
					id: 'agent-seed-0001',
					config: {
						name: 'Clinic Assistant',
						model: 'anthropic/claude-sonnet-4-5',
						instructions: 'Answer patient questions.',
					},
				},
			],
		});

		const prepared = await prepare(clients, {
			seed,
			conversation: [{ role: 'user', text: 'Add a tool', attach: { agent: 'agent-seed-0001' } }],
		});

		const [restoredAgent] = clients.owner.restoreThread.mock.calls[0][4] as Array<{ id: string }>;
		expect(clients.owner.setAgentsAvailableInMcp).toHaveBeenCalledWith([restoredAgent.id]);
		expect(prepared?.agentRefs).toEqual([
			{ type: 'agent', id: restoredAgent.id, projectId: 'member-project' },
		]);
		expect(prepared?.openingNote).toBe('[attached agent: Clinic Assistant]');
	});

	it('hands the earlier conversation to claude as text and to the judge as seeded turns', async () => {
		const clients = makeClients();
		const seed = inlineSeed({
			messages: [
				message('m1', 'user', 'Build an order sync', 0),
				message('m2', 'assistant', 'Built it.', 1),
			],
		});

		const prepared = await prepare(clients, { seed });

		expect(prepared?.openingPrefix).toContain('User: Build an order sync');
		expect(prepared?.openingPrefix).toContain('Assistant: Built it.');
		expect(prepared?.transcriptPrefix).toEqual([
			{
				userMessage: 'Build an order sync',
				steps: [{ kind: 'agent-text', text: 'Built it.' }],
				seeded: true,
			},
		]);
	});

	it('runs the prior runs on the restored workflows and reports one that never ran', async () => {
		const clients = makeClients();
		vi.mocked(executePriorRuns).mockResolvedValue([
			{ workflow: 'wf-seed-0001', workflowId: 'x', ran: false, success: false, errors: ['boom'] },
		]);

		const prepared = await prepare(clients, {
			seed: inlineSeed({
				workflows: [seedWorkflow('wf-seed-0001', 'Order sync')],
				priorRuns: [{ workflow: 'wf-seed-0001' }],
			}),
		});

		const { client, seedWorkflows } = vi.mocked(executePriorRuns).mock.calls[0][0];
		expect(client).toBe(clients.owner);
		expect(seedWorkflows.get('wf-seed-0001')?.id).toBe(prepared?.workflowIds[0]);
		expect(prepared?.priorRunFailed).toBe('wf-seed-0001: boom');
	});

	it('reuses a seed table a scenario also declares, and creates the rest empty', async () => {
		const clients = makeClients();
		const executionScenarios = [
			{
				name: 'happy-path',
				description: 'd',
				dataSetup: 's',
				successCriteria: 'c',
				seedDataTables: [
					{ id: 'orders', name: 'orders', columns: [{ name: 'id', type: 'string' }], rows: [] },
					{
						id: 'customers',
						name: 'customers',
						columns: [{ name: 'id', type: 'string' }],
						rows: [],
					},
				],
			},
		] as ExecutionScenario[];

		const prepared = await prepare(clients, {
			seed: inlineSeed({ dataTables: [{ id: 'dt-seed-0001', name: 'orders', columns: [] }] }),
			executionScenarios,
		});

		const scenarioCall = clients.owner.restoreThread.mock.calls[1];
		expect((scenarioCall[3] as Array<{ name: string }>).map((table) => table.name)).toEqual([
			expect.stringMatching(/^customers/),
		]);
		expect(Object.keys(prepared?.scenarioTableIdsByName ?? {}).sort()).toEqual([
			'customers',
			'orders',
		]);
		expect(prepared?.openingSuffix).toContain('customers');
	});

	it('creates the seeded projects and lets the build user see them', async () => {
		const clients = makeClients();

		const prepared = await prepare(clients, {
			seed: inlineSeed({ projects: [{ name: 'Finance' }] }),
		});

		expect(clients.owner.addProjectViewer).toHaveBeenCalledWith('project-Finance', 'member-user');
		expect(prepared?.projectIds).toEqual(['project-Finance']);
	});

	it('sends the live turn of a replay seed first', async () => {
		const clients = makeClients();
		vi.mocked(reconstructSeedFromThread).mockResolvedValue({
			seed: { ...inlineSeed(), messages: [message('m1', 'user', 'Earlier ask', 0)] },
			liveTurn: 'Now add Slack',
			runCount: 2,
			sourceProject: 'instance-ai',
		} as unknown as Awaited<ReturnType<typeof reconstructSeedFromThread>>);

		const prepared = await prepare(clients, {
			seed: { mode: 'replay', threadId: 'thread-1' },
			conversation: [user('[Agree to the plan]')],
		});

		expect(prepared?.conversation).toEqual([user('Now add Slack'), user('[Agree to the plan]')]);
		expect(prepared?.openingPrefix).toContain('User: Earlier ask');
	});
});
