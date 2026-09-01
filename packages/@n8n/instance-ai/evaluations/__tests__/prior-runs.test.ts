import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { executePriorRuns } from '../harness/prior-runs';
import { EvalTestCaseSchema } from '../harness/schema';
import { MAX_EXEC_ATTEMPTS } from '../harness/transient-error';

function execResult(
	overrides: Partial<InstanceAiEvalExecutionResult> = {},
): InstanceAiEvalExecutionResult {
	return {
		executionId: 'exec-1',
		success: true,
		nodeResults: {},
		errors: [],
		hints: {},
		mockedCredentials: [],
		...overrides,
	} as InstanceAiEvalExecutionResult;
}

function logger() {
	return mock<EvalLogger>();
}

const noSleep = async () => {};
const ids = new Map([['Daily Sync', 'wf-1']]);

describe('executePriorRuns', () => {
	it('runs each declared workflow and reports what happened', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(execResult());

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync', hints: 'the HTTP node returns 500' }],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcomes).toEqual([
			{ workflow: 'Daily Sync', workflowId: 'wf-1', success: true, errors: [] },
		]);
		// `hints` reaches the mock layer the same way `dataSetup` does — that is how a
		// case stages one specific failure.
		expect(client.executeWithLlmMock).toHaveBeenCalledWith(
			'wf-1',
			'the HTTP node returns 500',
			undefined,
		);
	});

	it('does NOT fail the build when a prior run fails', async () => {
		// The staged failure is the whole point: the case says only "it broke again" and
		// the agent has to go and find out how.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, errors: ['HTTP Request: 500'] }),
		);

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcomes[0].success).toBe(false);
		expect(outcomes[0].errors).toEqual(['HTTP Request: 500']);
	});

	it('records the failure in the log, so an author can see the staged history', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, errors: ['HTTP Request: 500'] }),
		);
		const log = logger();

		await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: log,
			sleep: noSleep,
		});

		expect(log.info).toHaveBeenCalledWith(expect.stringContaining('Daily Sync'));
		expect(log.info).toHaveBeenCalledWith(expect.stringContaining('failed (HTTP Request: 500)'));
	});

	it('runs sequentially, in declared order', async () => {
		// A case can stage a sequence, and a later run may depend on state an earlier one
		// left behind.
		const order: string[] = [];
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockImplementation(async (workflowId: string) => {
			order.push(workflowId);
			return await Promise.resolve(execResult());
		});

		await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'First' }, { workflow: 'Second' }],
			workflowIdsByName: new Map([
				['First', 'wf-a'],
				['Second', 'wf-b'],
			]),
			logger: logger(),
			sleep: noSleep,
		});

		expect(order).toEqual(['wf-a', 'wf-b']);
	});

	it('retries a transient DB abort rather than recording it as the staged failure', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock
			.mockResolvedValueOnce(
				execResult({
					success: false,
					errors: ['SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'],
				}),
			)
			.mockResolvedValueOnce(execResult({ success: true }));

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(2);
		expect(outcomes[0].success).toBe(true);
	});

	it('retries a transient network throw, so a blip does not void the premise', async () => {
		// The graded turn would otherwise run against history that never landed.
		const client = mock<N8nClient>();
		client.executeWithLlmMock
			.mockRejectedValueOnce(new Error('fetch failed'))
			.mockResolvedValueOnce(execResult());

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(2);
		expect(outcomes[0].success).toBe(true);
	});

	it('records a NON-retryable error immediately instead of killing the build', async () => {
		// Throwing here would report an instance problem as a builder problem.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockRejectedValue(new Error('workflow is not runnable'));
		const log = logger();

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: log,
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(1);
		expect(outcomes[0].success).toBe(false);
		expect(outcomes[0].errors).toEqual(['workflow is not runnable']);
		expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('could not complete'));
	});

	it('gives up after the retry budget and reports the real error', async () => {
		// Not a synthetic "exhausted" string: the log has to name what went wrong.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockRejectedValue(new Error('ECONNRESET'));

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'Daily Sync' }],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(MAX_EXEC_ATTEMPTS);
		expect(outcomes[0].success).toBe(false);
		expect(outcomes[0].errors).toEqual(['ECONNRESET']);
	});

	it('throws when the seed never created the named workflow', async () => {
		// The schema cross-checks names at load, so reaching here means the premise
		// silently never happened. That is worth stopping for.
		const client = mock<N8nClient>();

		await expect(
			executePriorRuns({
				client,
				priorRuns: [{ workflow: 'Never Seeded' }],
				workflowIdsByName: ids,
				logger: logger(),
				sleep: noSleep,
			}),
		).rejects.toThrow('which the seed did not create');
		expect(client.executeWithLlmMock).not.toHaveBeenCalled();
	});

	it('does nothing when a case declares none', async () => {
		const client = mock<N8nClient>();
		const outcomes = await executePriorRuns({
			client,
			priorRuns: [],
			workflowIdsByName: ids,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcomes).toEqual([]);
		expect(client.executeWithLlmMock).not.toHaveBeenCalled();
	});
});

describe('priorRuns schema validation', () => {
	function caseWith(priorRuns: Array<{ workflow: string; hints?: string }>) {
		return {
			conversation: [{ role: 'user', text: 'it broke again, fix it' }],
			complexity: 'simple',
			tags: [],
			processExpectations: ['the agent reads the failed execution instead of asking'],
			seed: {
				mode: 'inline',
				messages: [],
				workflows: [{ id: 'seed-1', name: 'Daily Sync', nodes: [], connections: {} }],
				priorRuns,
			},
		};
	}

	it('accepts a prior run naming a workflow the seed declares', () => {
		const parsed = EvalTestCaseSchema.safeParse(caseWith([{ workflow: 'Daily Sync' }]));
		expect(parsed.success).toBe(true);
	});

	it('rejects a prior run naming a workflow the seed does not declare', () => {
		// Catching the typo at load beats a mid-build failure, which reads like an
		// infrastructure fault rather than an authoring mistake.
		const parsed = EvalTestCaseSchema.safeParse(caseWith([{ workflow: 'Nightly Sync' }]));
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(JSON.stringify(parsed.error.issues)).toContain('which this seed does not declare');
			expect(JSON.stringify(parsed.error.issues)).toContain('Daily Sync');
		}
	});
});
