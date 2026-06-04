import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { N8nClient, WorkflowResponse } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { runWorkflowTestCase } from '../harness/runner';
import type { WorkflowTestCase } from '../types';

/**
 * Focused tests for the `prebuiltWorkflowId` branch of runWorkflowTestCase.
 *
 * The branch itself is a one-line conditional in runner.ts:
 *
 *     const build = config.prebuiltWorkflowId
 *         ? await fetchPrebuiltBuild(...)
 *         : await buildWorkflow(...);
 *
 * The prebuilt path's invariants (BuildResult shape, error wrapping) are
 * covered by `fetchPrebuiltBuild` unit tests in prebuilt-workflows.test.ts.
 * These tests lock in the integration:
 *   • the orchestrator path (sendMessage / SSE) must not run
 *   • the prebuilt workflow must not be deleted on cleanup
 */

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

function makeClient(overrides: Partial<Record<keyof N8nClient, Mock>> = {}): {
	client: N8nClient;
	mocks: Record<string, Mock>;
} {
	const mocks: Record<string, Mock> = {
		getWorkflow: vi.fn(),
		sendMessage: vi.fn(),
		deleteWorkflow: vi.fn().mockResolvedValue(undefined),
		deleteDataTable: vi.fn().mockResolvedValue(undefined),
		listDataTables: vi.fn().mockResolvedValue([]),
		...overrides,
	};
	return { client: mocks as unknown as N8nClient, mocks };
}

function makeTestCase(): WorkflowTestCase {
	// Empty scenarios => runWorkflowTestCase short-circuits past the
	// scenario-execution loop, so we don't need to mock executeScenario.
	return {
		conversation: [{ role: 'user', text: 'build me something' }],
		complexity: 'simple',
		tags: ['test'],
		executionScenarios: [],
	};
}

describe('runWorkflowTestCase with prebuiltWorkflowId', () => {
	it('fetches the prebuilt workflow and skips the orchestrator build path', async () => {
		const fakeWorkflow = {
			id: 'Wprebuilt',
			name: 'Prebuilt fixture',
			nodes: [],
			connections: {},
		} as unknown as WorkflowResponse;

		const { client, mocks } = makeClient({
			getWorkflow: vi.fn().mockResolvedValue(fakeWorkflow),
		});

		const result = await runWorkflowTestCase({
			client,
			baseUrl: 'http://localhost:5678',
			testCase: makeTestCase(),
			timeoutMs: 60_000,
			seededCredentialTypes: [],
			preRunWorkflowIds: new Set(),
			claimedWorkflowIds: new Set(),
			logger: silentLogger,
			keepWorkflows: false,
			prebuiltWorkflowId: 'Wprebuilt',
		});

		expect(result.workflowBuildSuccess).toBe(true);
		expect(result.workflowId).toBe('Wprebuilt');
		expect(result.workflowJson).toEqual(fakeWorkflow);

		// Orchestrator entry point not invoked
		expect(mocks.getWorkflow).toHaveBeenCalledWith('Wprebuilt');
		expect(mocks.sendMessage).not.toHaveBeenCalled();

		// cleanupBuild iterates createdWorkflowIds; for prebuilts that's
		// empty, so the prebuilt workflow must not be deleted even when
		// keepWorkflows is false.
		expect(mocks.deleteWorkflow).not.toHaveBeenCalled();
	});

	it('reports build failure with the workflow ID when fetch fails', async () => {
		const { client, mocks } = makeClient({
			getWorkflow: vi.fn().mockRejectedValue(new Error('HTTP 404')),
		});

		const result = await runWorkflowTestCase({
			client,
			baseUrl: 'http://localhost:5678',
			testCase: makeTestCase(),
			timeoutMs: 60_000,
			seededCredentialTypes: [],
			preRunWorkflowIds: new Set(),
			claimedWorkflowIds: new Set(),
			logger: silentLogger,
			keepWorkflows: false,
			prebuiltWorkflowId: 'Wstale',
		});

		expect(result.workflowBuildSuccess).toBe(false);
		expect(result.buildError).toContain('Wstale');
		expect(result.buildError).toContain('HTTP 404');
		expect(result.workflowId).toBeUndefined();

		// Even on failure, the prebuilt must not be deleted (it's owned by the
		// caller, not the eval run).
		expect(mocks.deleteWorkflow).not.toHaveBeenCalled();
		expect(mocks.sendMessage).not.toHaveBeenCalled();
	});
});
