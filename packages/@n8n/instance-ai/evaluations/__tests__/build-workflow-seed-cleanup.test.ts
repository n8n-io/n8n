import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { buildWorkflow } from '../harness/runner';
import { buildAgentOutcome } from '../outcome/workflow-discovery';
import type { ExecutionScenario } from '../types';

// The chat loop is network/SSE machinery irrelevant to this test: stub it so a
// single-turn build reaches the pre-build seed + outcome steps without real I/O.
// (vi.mock is hoisted above the imports, so the runner picks up these stubs.)
vi.mock('../harness/chat-loop', () => ({
	SSE_SETTLE_DELAY_MS: 0,
	startSseConnection: vi.fn().mockResolvedValue(undefined),
	waitForAllActivity: vi.fn().mockResolvedValue(undefined),
	runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
	recordUserTurn: vi.fn(),
}));

// Force a "workflow built" outcome by default so the build succeeds; individual
// tests override it to simulate a build-step failure after pre-seeding.
vi.mock('../outcome/workflow-discovery', () => ({
	buildAgentOutcome: vi.fn().mockResolvedValue({
		workflowsCreated: [{ id: 'built-wf-1', name: 'Built', nodeCount: 3, active: false }],
		executionsRun: [],
		dataTablesCreated: ['built-dt-1'],
		finalText: 'done',
		workflowJsons: [{ id: 'built-wf-1', name: 'Built', nodes: [], connections: {} }],
	}),
	extractWorkflowIdsFromMessages: vi.fn().mockReturnValue([]),
}));

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function scenarioWithSeedTable(): ExecutionScenario {
	return {
		name: 'scenario',
		description: 'd',
		dataSetup: 'setup',
		successCriteria: 'ok',
		seedDataTables: [
			{
				id: 'job-applications-1234',
				name: 'Job Applications',
				columns: [{ name: 'id', type: 'string' as const }],
				rows: [{ id: 'row_001' }],
			},
		],
	};
}

function makeClient(overrides: Partial<Record<keyof N8nClient, unknown>> = {}): N8nClient {
	return {
		getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
		ensureThread: vi.fn().mockResolvedValue(undefined),
		setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
		sendMessage: vi.fn().mockResolvedValue(undefined),
		getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
		// Pre-build scenario-table creation returns the real id under the name.
		restoreThread: vi
			.fn()
			.mockResolvedValue({ restored: 0, workflowIds: [], dataTableIds: ['scenario-dt-1'] }),
		...overrides,
	} as unknown as N8nClient;
}

const baseConfig = {
	conversation: [{ role: 'user' as const, text: 'build a workflow' }],
	executionScenarios: [scenarioWithSeedTable()],
	skipWorkflowChecks: true,
	preRunWorkflowIds: new Set<string>(),
	claimedWorkflowIds: new Set<string>(),
	logger: silentLogger,
};

// TRUST-311 follow-up: scenario data tables are created (empty) BEFORE the build
// turn. These pin the failure/cleanup contract of that pre-build seeding:
// - a create failure fails the build as a harness problem (framework_issue),
//   and there is nothing built to leak;
// - if a LATER build step fails, the already-created tables are still handed to
//   cleanup (folded into restoredDataTableIds) rather than leaking.
describe('buildWorkflow scenario-seed data table lifecycle', () => {
	it('fails the build and flags seedingFailed when pre-build table creation fails', async () => {
		const client = makeClient({
			restoreThread: vi.fn().mockRejectedValue(new Error('seed insert failed')),
		});

		const build = await buildWorkflow({ client, ...baseConfig });

		expect(build.success).toBe(false);
		// A pre-seed failure is a harness problem, not an agent build failure — flag
		// it so the CLI attributes framework_issue, not build_failure.
		expect(build.seedingFailed).toBe(true);
		// The build never ran, so there is nothing built to leak.
		expect(build.createdWorkflowIds).toEqual([]);
		expect(build.createdDataTableIds).toEqual([]);
	});

	it('hands the pre-created scenario tables to cleanup when a later build step fails', async () => {
		vi.mocked(buildAgentOutcome).mockRejectedValueOnce(new Error('workflow discovery failed'));
		const client = makeClient(); // pre-seed succeeds → scenario-dt-1 created

		const build = await buildWorkflow({ client, ...baseConfig });

		expect(build.success).toBe(false);
		// The pre-created table must still be returned so the caller's cleanup
		// deletes it instead of leaking it into the shared project.
		expect(build.createdDataTableIds).toContain('scenario-dt-1');
	});

	it('returns the built workflow, both tables, and the name→id map on success', async () => {
		const client = makeClient();

		const build = await buildWorkflow({ client, ...baseConfig });

		expect(build.success).toBe(true);
		expect(build.createdWorkflowIds).toContain('built-wf-1');
		expect(build.createdDataTableIds).toEqual(
			expect.arrayContaining(['built-dt-1', 'scenario-dt-1']),
		);
		// The name→real-id map lets each scenario reseed rows into the bound table.
		expect(build.seededScenarioTableIdsByName).toEqual({ 'Job Applications': 'scenario-dt-1' });
	});
});
