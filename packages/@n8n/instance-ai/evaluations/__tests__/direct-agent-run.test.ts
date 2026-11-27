import type { CliArgs } from '../cli/args';
import type { N8nClient } from '../clients/n8n-client';
import { createDeclaredCredentials } from '../credentials/seeder';
import { EvalTestCaseSchema } from '../harness/schema';
import type { EvalLogger } from '../harness/logger';
import { createBuildOrchestrator, type Lane, type LaneState } from '../run/build-orchestrator';
import { createCasePipeline } from '../run/case-pipeline';
import { prepareDirectAgentRun } from '../run/direct-agent-run';
import { LaneAllocator } from '../run/lane-allocator';
import type { WorkflowTestCase } from '../types';

// AGENT-1665: a direct Agent run restores the seeded Agent, binds its model
// credential through the restore (TRUST-608), and runs the scenarios against it.
// No assistant turn: the chat endpoint is never called.

vi.mock('../credentials/seeder', async (importOriginal) => ({
	...(await importOriginal<typeof import('../credentials/seeder')>()),
	createDeclaredCredentials: vi.fn(),
}));

vi.mock('../harness/agent-execution', async (importOriginal) => ({
	...(await importOriginal<typeof import('../harness/agent-execution')>()),
	fetchAgentScenarioContext: vi.fn().mockResolvedValue({ rendered: 'AGENT CONTEXT' }),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const SUPPORT_AGENT = 'seed-agent-0001';
const BILLING_AGENT = 'seed-agent-0002';

function seedAgent(id: string, name: string) {
	return { id, config: { name, model: 'anthropic/claude-sonnet-5-5', instructions: 'Help.' } };
}

function scenario(name: string, extra: Record<string, unknown> = {}) {
	return {
		name,
		description: 'd',
		dataSetup: `The user asks about ${name}.`,
		successCriteria: 'The agent answers.',
		...extra,
	};
}

function directCase(overrides: Record<string, unknown> = {}): WorkflowTestCase {
	return EvalTestCaseSchema.parse({
		complexity: 'simple',
		tags: ['agent-runtime'],
		credentials: [{ type: 'anthropicApi' }, { type: 'openAiApi', valid: false }],
		seed: {
			mode: 'inline',
			agents: [seedAgent(SUPPORT_AGENT, 'Support'), seedAgent(BILLING_AGENT, 'Billing')],
		},
		agentRun: { mode: 'direct' },
		executionScenarios: [scenario('refund'), scenario('invoice')],
		...overrides,
	});
}

interface ClientMocks {
	createTeamProject: ReturnType<typeof vi.fn>;
	ensureThread: ReturnType<typeof vi.fn>;
	setThreadCredentialAllowlist: ReturnType<typeof vi.fn>;
	restoreThread: ReturnType<typeof vi.fn>;
	sendMessage: ReturnType<typeof vi.fn>;
	getPersonalProjectId: ReturnType<typeof vi.fn>;
}

function restored(ids: Partial<Record<'agentIds' | 'dataTableIds' | 'workflowIds', string[]>>) {
	return {
		restored: 0,
		workflowIds: ids.workflowIds ?? [],
		dataTableIds: ids.dataTableIds ?? [],
		agentIds: ids.agentIds ?? [],
		folderIds: [],
	};
}

function makeClient(): { client: N8nClient; mocks: ClientMocks } {
	const mocks: ClientMocks = {
		createTeamProject: vi.fn().mockResolvedValue({ id: 'build-project' }),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		restoreThread: vi
			.fn()
			.mockResolvedValue(restored({ agentIds: ['run-agent-1', 'run-agent-2'] })),
		sendMessage: vi.fn(),
		getPersonalProjectId: vi.fn().mockResolvedValue('personal-project'),
	};
	return { client: mocks as unknown as N8nClient, mocks };
}

function makeLane(client: N8nClient): Lane {
	return {
		client,
		baseUrl: 'http://lane1.test',
		preRunWorkflowIds: new Set(),
		preRunDataTableIds: new Set(),
		preRunFolderIds: new Set(),
		claimedWorkflowIds: new Set(),
		createdCredentialIds: new Set(),
		workflowIdsToDelete: new Set(),
		teamBuildProjects: true,
	};
}

beforeEach(() => {
	vi.mocked(createDeclaredCredentials).mockResolvedValue([
		{ id: 'cred-anthropic', name: '[eval] Anthropic', type: 'anthropicApi' },
		{ id: 'cred-openai', name: '[eval] OpenAI', type: 'openAiApi' },
	]);
});

afterEach(() => {
	vi.clearAllMocks();
});

describe('prepareDirectAgentRun', () => {
	async function prepare(testCase = directCase()) {
		const { client, mocks } = makeClient();
		const lane = makeLane(client);
		const build = await prepareDirectAgentRun({
			lane,
			testCase,
			caseIdentity: { fileSlug: 'case-a', iteration: 0 },
			logger: silentLogger,
		});
		return { build, mocks, lane };
	}

	it('restores the seeded Agents into a fresh build project and targets the first one', async () => {
		const { build, mocks } = await prepare();

		expect(build.success).toBe(true);
		expect(build.artifactRefs).toEqual([
			{ type: 'agent', id: 'run-agent-1', projectId: 'build-project' },
		]);
		expect(build.createdAgentIds).toEqual(['run-agent-1', 'run-agent-2']);
		expect(build.buildProjectId).toBe('build-project');
		expect(build.transcript).toEqual([]);
		const [threadId, projectId] = mocks.ensureThread.mock.calls[0];
		expect(projectId).toBe('build-project');
		expect(build.seedThreadId).toBe(threadId);
		expect(build.threadId).toBeUndefined();
	});

	it('restores the Agents without any seeded messages', async () => {
		const { mocks } = await prepare();

		const [, messages, , , agents] = mocks.restoreThread.mock.calls[0];
		expect(messages).toEqual([]);
		expect(agents.map((agent: { config: { name: string } }) => agent.config.name)).toEqual([
			'Support',
			'Billing',
		]);
	});

	it('targets the Agent agentRun.agent names', async () => {
		const { build } = await prepare(
			directCase({ agentRun: { mode: 'direct', agent: BILLING_AGENT } }),
		);

		expect(build.artifactRefs).toEqual([
			{ type: 'agent', id: 'run-agent-2', projectId: 'build-project' },
		]);
	});

	it('creates the declared credentials in the build project and pins them before the restore binds models', async () => {
		const { mocks, lane } = await prepare();

		expect(vi.mocked(createDeclaredCredentials)).toHaveBeenCalledWith(
			lane.client,
			[{ type: 'anthropicApi' }, { type: 'openAiApi', valid: false }],
			expect.objectContaining({ projectId: 'build-project' }),
		);
		const [threadId, allowed, bypass] = mocks.setThreadCredentialAllowlist.mock.calls[0];
		expect(threadId).toBe(mocks.ensureThread.mock.calls[0][0]);
		expect(allowed).toEqual(['cred-anthropic', 'cred-openai']);
		// A credential the case marks broken keeps its real connection test.
		expect(bypass).toEqual(['cred-anthropic']);
		expect(mocks.setThreadCredentialAllowlist.mock.invocationCallOrder[0]).toBeLessThan(
			mocks.restoreThread.mock.invocationCallOrder[0],
		);
	});

	it('registers the created credentials for cleanup', async () => {
		vi.mocked(createDeclaredCredentials).mockImplementation(async (_client, _declared, options) => {
			options?.onCreated?.('cred-anthropic');
			return [{ id: 'cred-anthropic', name: 'a', type: 'anthropicApi' }];
		});

		const { lane } = await prepare();

		expect([...lane.createdCredentialIds]).toEqual(['cred-anthropic']);
	});

	it('creates the scenario seed tables empty and maps them by name', async () => {
		const { client, mocks } = makeClient();
		mocks.restoreThread
			.mockResolvedValueOnce(restored({ agentIds: ['run-agent-1', 'run-agent-2'] }))
			.mockResolvedValueOnce(restored({ dataTableIds: ['dt-orders'] }));
		const table = {
			id: 'dt-seed-0001',
			name: 'orders',
			columns: [{ name: 'id', type: 'string' }],
			rows: [{ id: 'a' }],
		};

		const build = await prepareDirectAgentRun({
			lane: makeLane(client),
			testCase: directCase({
				executionScenarios: [scenario('refund', { seedDataTables: [table] })],
			}),
			caseIdentity: { fileSlug: 'case-a', iteration: 0 },
			logger: silentLogger,
		});

		expect(build.seededScenarioTableIdsByName).toEqual({ orders: 'dt-orders' });
		expect(build.createdDataTableIds).toContain('dt-orders');
		const [, , , tables] = mocks.restoreThread.mock.calls[1];
		expect(tables[0].rows).toBeUndefined();
	});

	describe('a seeded Agent with a Data Table tool', () => {
		const SEED_TABLE_ID = 'dt-price-list-0001';
		const priceList = {
			id: SEED_TABLE_ID,
			name: 'Price list',
			columns: [{ name: 'sku', type: 'string' }],
		};
		const supportAgent = seedAgent(SUPPORT_AGENT, 'Support');
		const agentWithTableTool = {
			...supportAgent,
			config: {
				...supportAgent.config,
				tools: [
					{
						type: 'node',
						name: 'read_prices',
						node: {
							nodeType: 'n8n-nodes-base.dataTable',
							nodeTypeVersion: 1,
							nodeParameters: {
								dataTableId: { __rl: true, mode: 'list', value: SEED_TABLE_ID },
							},
						},
					},
				],
			},
		};
		const tableCase = (executionScenarios: unknown[] = [scenario('refund')]) =>
			directCase({
				seed: { mode: 'inline', agents: [agentWithTableTool], dataTables: [priceList] },
				executionScenarios,
			});

		async function prepareWith(testCase: WorkflowTestCase) {
			const { client, mocks } = makeClient();
			mocks.restoreThread.mockResolvedValueOnce(
				restored({ agentIds: ['run-agent-1'], dataTableIds: ['dt-restored-77'] }),
			);
			const build = await prepareDirectAgentRun({
				lane: makeLane(client),
				testCase,
				caseIdentity: { fileSlug: 'case-a', iteration: 0 },
				logger: silentLogger,
			});
			return { build, mocks };
		}

		it('restores the table with the Agent, so the restore remaps the tool to the new table id', async () => {
			const { mocks } = await prepareWith(tableCase());

			// One restore call: the server builds its seed-id → new-id table map from
			// `dataTables` and rewrites the Agent config with it in the same request.
			expect(mocks.restoreThread).toHaveBeenCalledTimes(1);
			const [, , , tables, agents] = mocks.restoreThread.mock.calls[0];
			expect(tables.map((table: { id: string }) => table.id)).toEqual([SEED_TABLE_ID]);
			expect(JSON.stringify(agents[0].config.tools)).toContain(SEED_TABLE_ID);
		});

		it('keeps the authored table name, so a tool that names the table still finds it', async () => {
			// The build project is fresh, so no other run can own a table of that name.
			const { mocks } = await prepareWith(tableCase());

			const [, , , tables] = mocks.restoreThread.mock.calls[0];
			expect(tables.map((table: { name: string }) => table.name)).toEqual(['Price list']);
		});

		it('sends the seed table rows to the restore, which inserts them', async () => {
			const rows = [{ sku: 'A-1' }, { sku: 'B-2' }];
			const { mocks } = await prepareWith(
				directCase({
					seed: {
						mode: 'inline',
						agents: [agentWithTableTool],
						dataTables: [{ ...priceList, rows }],
					},
				}),
			);

			const [, , , tables] = mocks.restoreThread.mock.calls[0];
			expect(tables[0].rows).toEqual(rows);
		});

		it('fills the restored table from a scenario seed table of the same name', async () => {
			const { build, mocks } = await prepareWith(
				tableCase([
					scenario('refund', {
						seedDataTables: [{ ...priceList, rows: [{ sku: 'A-1' }] }],
					}),
				]),
			);

			// The scenario rows go into the table the Agent's tool points at, not a new one.
			expect(mocks.restoreThread).toHaveBeenCalledTimes(1);
			expect(build.seededScenarioTableIdsByName).toEqual({ 'Price list': 'dt-restored-77' });
		});
	});

	it('reports a failed restore as a seeding failure and keeps what cleanup needs', async () => {
		const { client, mocks } = makeClient();
		mocks.restoreThread.mockRejectedValue(new Error('agents module is off'));

		const build = await prepareDirectAgentRun({
			lane: makeLane(client),
			testCase: directCase(),
			caseIdentity: { fileSlug: 'case-a', iteration: 0 },
			logger: silentLogger,
		});

		expect(build.success).toBe(false);
		expect(build.seedingFailed).toBe(true);
		expect(build.error).toContain('agents module is off');
		expect(build.buildProjectId).toBe('build-project');
		expect(build.seedThreadId).toBe(mocks.ensureThread.mock.calls[0][0]);
	});

	it('never calls the assistant', async () => {
		const { mocks } = await prepare();

		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});
});

describe('a direct-mode case end to end', () => {
	function makeLaneState(client: N8nClient): LaneState {
		return {
			runner: makeLane(client),
			laneNum: 1,
			activeBuilds: 0,
			inflightKeys: new Set(),
			tracedBuild: vi.fn(),
			tracedExecute: vi.fn(),
			tracedExecuteAgent: vi.fn().mockResolvedValue({
				scenario: scenario('x'),
				success: true,
				score: 1,
				reasoning: 'answered',
				agentId: 'run-agent-1',
			}),
		};
	}

	async function runAllRows(args: Partial<CliArgs>) {
		const { client, mocks } = makeClient();
		const laneState = makeLaneState(client);
		const testCaseByFileSlug = new Map([['case-a', directCase()]]);
		const shared = {
			buildExpectationsByKey: new Map(),
			agentContextByKey: new Map(),
			runDebugByThreadId: new Map(),
		};
		const fullArgs = { timeoutMs: 900_000, keepWorkflows: true, buildViaMcp: false, ...args };
		const orchestrator = createBuildOrchestrator({
			args: fullArgs as CliArgs,
			logger: silentLogger,
			laneStates: [laneState],
			allocator: new LaneAllocator([laneState], 4, { probe: vi.fn().mockResolvedValue(true) }),
			testCaseByFileSlug,
			cleanupBuiltWorkflows: false,
			mcpBuildSpend: [],
			transcriptByThreadId: new Map(),
			threadMemoryByThreadId: new Map(),
			...shared,
		});
		const pipeline = createCasePipeline({
			args: fullArgs as CliArgs,
			logger: silentLogger,
			testCaseByFileSlug,
			orchestrator,
			harnessUsageByKey: new Map(),
			...shared,
		});
		const outputs = [];
		for (const name of ['refund', 'invoice']) {
			const s = scenario(name);
			outputs.push(
				await pipeline.runRow({
					testCaseFile: 'case-a',
					scenarioName: name,
					scenarioDescription: s.description,
					dataSetup: s.dataSetup,
					successCriteria: s.successCriteria,
					_iteration: 0,
				}),
			);
		}
		return { outputs, laneState, mocks };
	}

	it('runs every scenario against the seeded Agent and never calls the assistant', async () => {
		const { outputs, laneState, mocks } = await runAllRows({});

		expect(outputs.map((o) => [o.passed, o.agentId])).toEqual([
			[true, 'run-agent-1'],
			[true, 'run-agent-1'],
		]);
		const executed = vi.mocked(laneState.tracedExecuteAgent).mock.calls.map(([call]) => ({
			agentId: call.agentId,
			scenario: call.scenario.name,
			projectId: call.projectId,
		}));
		expect(executed).toEqual([
			{ agentId: 'run-agent-1', scenario: 'refund', projectId: 'build-project' },
			{ agentId: 'run-agent-1', scenario: 'invoice', projectId: 'build-project' },
		]);
		// One restore for the case, shared by its scenario rows.
		expect(mocks.restoreThread).toHaveBeenCalledTimes(1);
		expect(laneState.tracedBuild).not.toHaveBeenCalled();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});

	it('skips the MCP builder too', async () => {
		const { outputs, laneState } = await runAllRows({ buildViaMcp: true });

		expect(outputs.every((o) => o.passed)).toBe(true);
		expect(laneState.tracedExecuteAgent).toHaveBeenCalledTimes(2);
	});
});
