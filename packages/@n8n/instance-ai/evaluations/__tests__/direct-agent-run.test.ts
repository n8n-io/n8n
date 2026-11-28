import type { CliArgs } from '../cli/args';
import type { N8nClient } from '../clients/n8n-client';
import { createDeclaredCredentials } from '../credentials/seeder';
import { EvalTestCaseSchema } from '../harness/schema';
import type { EvalLogger } from '../harness/logger';
import { createBuildOrchestrator, type Lane, type LaneState } from '../run/build-orchestrator';
import { createCasePipeline } from '../run/case-pipeline';
import { prepareDirectAgentRun } from '../run/direct-agent-run';
import { LaneAllocator } from '../run/lane-allocator';
import type { ExecutionScenario, WorkflowTestCase } from '../types';

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
		expectations: ['Answers the question'],
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

	it('runs in the personal project, and leaves it out of cleanup, when the lane has no build projects', async () => {
		const { client, mocks } = makeClient();
		const lane = { ...makeLane(client), teamBuildProjects: false };

		const build = await prepareDirectAgentRun({
			lane,
			testCase: directCase(),
			caseIdentity: { fileSlug: 'case-a', iteration: 0 },
			logger: silentLogger,
		});

		expect(mocks.ensureThread.mock.calls[0][1]).toBe('personal-project');
		expect(build.artifactRefs).toEqual([
			{ type: 'agent', id: 'run-agent-1', projectId: 'personal-project' },
		]);
		// Cleanup deletes `buildProjectId`; the personal project must survive it.
		expect(build.buildProjectId).toBeUndefined();
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

	interface RunOptions {
		testCase?: WorkflowTestCase;
		/** Start every row at once, as the drivers may. */
		concurrent?: boolean;
		prepare?: (mocks: ClientMocks, laneState: LaneState) => void;
	}

	async function runAllRows(args: Partial<CliArgs>, options: RunOptions = {}) {
		const { client, mocks } = makeClient();
		const laneState = makeLaneState(client);
		options.prepare?.(mocks, laneState);
		const testCase = options.testCase ?? directCase();
		const testCaseByFileSlug = new Map([['case-a', testCase]]);
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
		const runRow = async (s: ExecutionScenario) =>
			await pipeline.runRow({
				testCaseFile: 'case-a',
				scenarioName: s.name,
				scenarioDescription: s.description,
				dataSetup: s.dataSetup,
				successCriteria: s.successCriteria,
				_iteration: 0,
			});
		const scenarios = testCase.executionScenarios ?? [];
		const outputs = [];
		if (options.concurrent) {
			outputs.push(...(await Promise.all(scenarios.map(runRow))));
		} else {
			for (const s of scenarios) outputs.push(await runRow(s));
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

	describe('seed tables across scenarios', () => {
		const seedRows = [{ sku: 'TRIAL', price: 0 }];
		const priceList = {
			id: 'dt-price-list-0001',
			name: 'price_list',
			columns: [
				{ name: 'sku', type: 'string' },
				{ name: 'price', type: 'number' },
			],
			rows: seedRows,
		};
		const requests = {
			id: 'dt-requests-00001',
			name: 'customer_requests',
			columns: [{ name: 'note', type: 'string' }],
		};
		const overrideRows = [{ sku: 'PROMO', price: 5 }];
		const tableCase = () =>
			directCase({
				seed: {
					mode: 'inline',
					agents: [seedAgent(SUPPORT_AGENT, 'Support')],
					dataTables: [priceList, requests],
				},
				executionScenarios: [
					scenario('promo', { seedDataTables: [{ ...priceList, rows: overrideRows }] }),
					scenario('plain'),
				],
			});
		const restoreTables = (mocks: ClientMocks) =>
			mocks.restoreThread.mockResolvedValueOnce(
				restored({ agentIds: ['run-agent-1'], dataTableIds: ['dt-run-prices', 'dt-run-requests'] }),
			);

		function tablesSeenBy(laneState: LaneState) {
			return vi.mocked(laneState.tracedExecuteAgent).mock.calls.map(([call]) => ({
				scenario: call.scenario.name,
				tables: Object.fromEntries(
					(call.scenario.seedDataTables ?? []).map((table) => [table.name, table.rows]),
				),
				tableIds: call.seedContext?.tableIdsByName,
			}));
		}

		it('resets every seed table before each scenario, with the scenario rows laid over the top', async () => {
			const { laneState } = await runAllRows({}, { testCase: tableCase(), prepare: restoreTables });

			expect(tablesSeenBy(laneState)).toEqual([
				{
					scenario: 'promo',
					tables: { price_list: overrideRows, customer_requests: [] },
					tableIds: { price_list: 'dt-run-prices', customer_requests: 'dt-run-requests' },
				},
				{
					// The override of the first scenario is gone, and whatever the Agent wrote
					// to customer_requests in it is cleared.
					scenario: 'plain',
					tables: { price_list: seedRows, customer_requests: [] },
					tableIds: { price_list: 'dt-run-prices', customer_requests: 'dt-run-requests' },
				},
			]);
		});

		it('runs the scenarios one at a time, even with no scenario tables, so a reset never lands mid-run', async () => {
			let active = 0;
			let maxActive = 0;
			const noOverrides = directCase({
				seed: {
					mode: 'inline',
					agents: [seedAgent(SUPPORT_AGENT, 'Support')],
					dataTables: [priceList, requests],
				},
				executionScenarios: [scenario('first'), scenario('second')],
			});
			const { outputs } = await runAllRows(
				{},
				{
					testCase: noOverrides,
					concurrent: true,
					prepare: (mocks, laneState) => {
						restoreTables(mocks);
						vi.mocked(laneState.tracedExecuteAgent).mockImplementation(async () => {
							active++;
							maxActive = Math.max(maxActive, active);
							await new Promise((resolve) => setTimeout(resolve, 5));
							active--;
							return {
								scenario: scenario('x'),
								success: true,
								score: 1,
								reasoning: 'ok',
								agentId: 'run-agent-1',
							};
						});
					},
				},
			);

			expect(outputs.every((o) => o.passed)).toBe(true);
			expect(maxActive).toBe(1);
		});
	});
});
