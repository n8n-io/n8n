import { vi } from 'vitest';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { buildWorkflow } from '../harness/runner';
import type { ExecutionScenario } from '../types';

// The chat loop is network/SSE machinery irrelevant to this test: stub it so a
// single-turn build reaches the post-build seed step without real I/O.
// (vi.mock is hoisted above the imports, so the runner picks up these stubs.)
vi.mock('../harness/chat-loop', () => ({
	SSE_SETTLE_DELAY_MS: 0,
	startSseConnection: vi.fn().mockResolvedValue(undefined),
	waitForAllActivity: vi.fn().mockResolvedValue(undefined),
	runMultiTurnConversation: vi.fn().mockResolvedValue(undefined),
	recordUserTurn: vi.fn(),
}));

// Force a "workflow built" outcome so the build succeeds and the harness moves
// on to seeding the scenario data tables.
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

describe('buildWorkflow scenario-seed failure cleanup', () => {
	it('hands the built workflow and data tables to cleanup when scenario seeding fails', async () => {
		const client = {
			getPersonalProjectId: vi.fn().mockResolvedValue('project-1'),
			ensureThread: vi.fn().mockResolvedValue(undefined),
			setThreadCredentialAllowlist: vi.fn().mockResolvedValue(undefined),
			sendMessage: vi.fn().mockResolvedValue(undefined),
			getThreadMessages: vi.fn().mockResolvedValue({ messages: [] }),
			// The seed step fails after the workflow has already been built.
			restoreThread: vi.fn().mockRejectedValue(new Error('seed insert failed')),
		} as unknown as N8nClient;

		const build = await buildWorkflow({
			client,
			conversation: [{ role: 'user', text: 'build a workflow' }],
			executionScenarios: [scenarioWithSeedTable()],
			skipWorkflowChecks: true,
			preRunWorkflowIds: new Set(),
			claimedWorkflowIds: new Set(),
			logger: silentLogger,
		});

		expect(build.success).toBe(false);
		// The freshly-built workflow and data tables must still be returned so the
		// caller's cleanup deletes them instead of leaking them into the project.
		expect(build.createdWorkflowIds).toContain('built-wf-1');
		expect(build.createdDataTableIds).toContain('built-dt-1');
	});
});
