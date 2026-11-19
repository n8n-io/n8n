vi.mock('../sim/sim-runner', async (importOriginal) => ({
	...(await importOriginal<typeof import('../sim/sim-runner')>()),
	runScenarioInSim: vi.fn(),
}));

import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { executeScenario } from '../harness/scenario-execution';
import { runScenarioInSim, type SimScenarioReport } from '../sim/sim-runner';
import type { ExecutionScenario } from '../types';

const silentLogger: EvalLogger = {
	info: () => {},
	verbose: () => {},
	success: () => {},
	warn: () => {},
	error: () => {},
	isVerbose: false,
};

const scenario: ExecutionScenario = {
	name: 'happy-path',
	description: 'runs end to end',
	dataSetup: 'one order arrives',
	successCriteria: 'the order is forwarded',
};

const ran = (errors: string[]) => ({
	kind: 'ran' as const,
	evalResult: {
		executionId: 'exec-1',
		success: false,
		nodeResults: {},
		errors,
	} as unknown as InstanceAiEvalExecutionResult,
	report: {} as SimScenarioReport,
});

describe('sim execution', () => {
	it('runs again when a transient DB abort stops the run, as in mock mode', async () => {
		vi.mocked(runScenarioInSim)
			.mockResolvedValueOnce(ran(['Workflow wf-1 not found or not accessible']))
			.mockResolvedValue(ran(['Slack returned 404']));
		const client = mock<N8nClient>();

		// Verification is not stubbed; only the number of runs matters here.
		await executeScenario(
			client,
			'wf-1',
			scenario,
			[{ id: 'wf-1', name: 'wf', nodes: [], connections: {}, active: false, versionId: 'v1' }],
			silentLogger,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			{
				options: { adminUrl: 'http://sim', adminToken: 't', worldCacheDir: '/tmp' },
				caseInfo: { fileSlug: 'case', userRequest: 'forward orders' },
			},
		).catch(() => {});

		expect(runScenarioInSim).toHaveBeenCalledTimes(2);
	});
});
