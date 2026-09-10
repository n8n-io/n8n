import type {
	InstanceAiEvalAgentExecutionResult,
	InstanceAiEvalExecutionResult,
} from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import { executeAgentScenario } from '../harness/agent-execution';
import type { EvalLogger } from '../harness/logger';
import { executeScenario } from '../harness/scenario-execution';
import type { ExecutionScenario } from '../types';

// A stopped run arrives in-band, so it must land on the timeout path rather than
// reach the judge as an ordinary failure.

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

function agentResult(errors: string[]): InstanceAiEvalAgentExecutionResult {
	return {
		runId: 'run-1',
		success: false,
		errors,
		finalText: '',
		toolCalls: [],
		modelTurns: [],
	} as unknown as InstanceAiEvalAgentExecutionResult;
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

		// Verification fails un-stubbed, so just assert the budget path did not fire.
		const failure = await executeScenario(client, 'wf-1', scenario, [], silentLogger).catch(
			(error: unknown) => error,
		);

		expect(String(failure)).not.toMatch(/eval budget|operation was aborted/i);
	});

	// The agent path stops a run for time on its OWN abort signal, so it reports in its
	// own words. This fixture used to carry the workflow path's exact string — which
	// `EvalAgentExecutionService` never produces — so it passed while a real timed-out
	// agent run still fell through to the judge as a builder failure.
	it('throws onto the timeout path for a stopped agent run', async () => {
		const client = mock<N8nClient>();
		client.getPersonalProjectId.mockResolvedValue('proj-1');
		client.executeAgentWithLlmMock.mockResolvedValue(
			agentResult(['Agent run exceeded its 600s eval budget and was stopped']),
		);

		await expect(
			executeAgentScenario(client, 'agent-1', scenario, 'context', silentLogger),
		).rejects.toThrow(/operation was aborted due to timeout/i);
	});

	it('leaves an ordinary agent failure to the judge', async () => {
		const client = mock<N8nClient>();
		client.getPersonalProjectId.mockResolvedValue('proj-1');
		client.executeAgentWithLlmMock.mockResolvedValue(agentResult(['Tool call returned a 500']));

		const failure = await executeAgentScenario(
			client,
			'agent-1',
			scenario,
			'context',
			silentLogger,
		).catch((error: unknown) => error);

		expect(String(failure)).not.toMatch(/eval budget|operation was aborted/i);
	});
});
