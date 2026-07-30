import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { executeScenario } from '../harness/scenario-execution';
import type { ExecutionScenario } from '../types';

// The server stops an execution that outlives the budget the client forwarded and
// reports it in-band (`success: false`). Left as an ordinary failed execution it
// would reach the judge, which could attribute a run killed for time to the
// builder — so it has to land on the caller's timeout path instead.

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

function execResult(errors: string[]): InstanceAiEvalExecutionResult {
	return {
		executionId: 'exec-1',
		success: false,
		nodeResults: {},
		errors,
	} as InstanceAiEvalExecutionResult;
}

describe('server-side budget stop', () => {
	it('throws onto the timeout path instead of returning a judgeable failure', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult(['Execution exceeded its 895s eval budget and was stopped']),
		);

		await expect(executeScenario(client, 'wf-1', scenario, [], silentLogger)).rejects.toThrow(
			/operation was aborted due to timeout/i,
		);
	});

	it('leaves an ordinary execution failure to the judge', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult(['Sheet with ID __evalMockResource not found']),
		);

		// Carries on to verification, which the un-stubbed verifier fails — so
		// capture whatever surfaces and assert the budget path was not what fired.
		const failure = await executeScenario(client, 'wf-1', scenario, [], silentLogger).catch(
			(error: unknown) => error,
		);

		expect(String(failure)).not.toMatch(/eval budget|operation was aborted/i);
	});
});
