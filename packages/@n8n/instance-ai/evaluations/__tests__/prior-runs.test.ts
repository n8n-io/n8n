import type { InstanceAiEvalExecutionResult } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import { remapSeedArtifactIds, type ConversationSeed } from '../harness/conversation-seed';
import type { EvalLogger } from '../harness/logger';
import { executePriorRuns, STAGING_TIMEOUT_MS } from '../harness/prior-runs';
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
const seeded = new Map([['dS8xQ2mV6bTn4Kp1', { id: 'wf-1', name: 'Daily Sync' }]]);

describe('executePriorRuns', () => {
	it('runs each declared workflow and reports what happened', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(execResult());

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1', hints: 'the HTTP node returns 500' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcomes).toEqual([
			{
				workflow: 'dS8xQ2mV6bTn4Kp1',
				workflowId: 'wf-1',
				ran: true,
				executionId: 'exec-1',
				success: true,
				errors: [],
			},
		]);
		// `hints` reaches the mock layer the same way `dataSetup` does — that is how a
		// case stages one specific failure.
		// Staging gets its own tight budget, not the 15-minute build budget.
		expect(client.executeWithLlmMock).toHaveBeenCalledWith(
			'wf-1',
			'the HTTP node returns 500',
			STAGING_TIMEOUT_MS,
		);
	});

	it('does NOT fail the build when a prior run fails', async () => {
		// The staged failure is the whole point: the case says only "it broke again" and
		// the agent has to go and find out how.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, errors: ['HTTP Request: 500'] }),
		);
		client.getExecution.mockResolvedValue({ id: 'exec-1' } as never);

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
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
		client.getExecution.mockResolvedValue({ id: 'exec-1' } as never);
		const log = logger();

		await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
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
			priorRuns: [{ workflow: 'fIrStSeEd1234567' }, { workflow: 'sEcOnDsEeD123456' }],
			seedWorkflows: new Map([
				['fIrStSeEd1234567', { id: 'wf-a', name: 'First' }],
				['sEcOnDsEeD123456', { id: 'wf-b', name: 'Second' }],
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
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
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
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(2);
		expect(outcomes[0].success).toBe(true);
	});

	it('does not announce a retry it will not make on the last attempt', async () => {
		// The in-band abort branch has no cap of its own, so without a guard the final
		// attempt would log "retrying" and sleep before giving up.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, errors: ['SQLITE_CONSTRAINT: FOREIGN KEY constraint failed'] }),
		);
		const log = logger();
		const delays: number[] = [];

		await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: log,
			sleep: async (ms) => {
				delays.push(ms);
				await Promise.resolve();
			},
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(MAX_EXEC_ATTEMPTS);
		expect(delays).toHaveLength(MAX_EXEC_ATTEMPTS - 1);
		const retryLogs = log.warn.mock.calls.filter(([line]) => String(line).includes('retrying'));
		expect(retryLogs).toHaveLength(MAX_EXEC_ATTEMPTS - 1);
	});

	it('records a NON-retryable error immediately instead of killing the build', async () => {
		// Throwing here would report an instance problem as a builder problem.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockRejectedValue(new Error('workflow is not runnable'));
		const log = logger();

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
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
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		expect(client.executeWithLlmMock).toHaveBeenCalledTimes(MAX_EXEC_ATTEMPTS);
		expect(outcomes[0].success).toBe(false);
		expect(outcomes[0].errors).toEqual(['ECONNRESET']);
	});

	it('does not record a server budget stop as the staged failure', async () => {
		// The stop comes back in-band. Recorded as-is, HARNESS text would become the
		// workflow's failure reason in the execution record the graded agent then reads.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({
				success: false,
				errors: ['Workflow exceeded its 120s eval budget and was stopped'],
			}),
		);

		const outcomes = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		// Thrown, then classified as a timeout — so it never reaches the staged-failure
		// return, and the case is left with no execution record rather than a fake one.
		expect(outcomes[0].ran).toBe(false);
		expect(outcomes[0].errors.join(' ')).toContain('aborted due to timeout');
	});

	it('separates "failed as staged" from "never ran"', async () => {
		// `success: false` alone cannot tell these apart, and only the second is a reason
		// to distrust the grade.
		const staged = mock<N8nClient>();
		staged.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, errors: ['HTTP Request: 500'] }),
		);
		staged.getExecution.mockResolvedValue({ id: 'exec-1' } as never);
		const [asStaged] = await executePriorRuns({
			client: staged,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});
		expect(asStaged).toMatchObject({ ran: true, executionId: 'exec-1', success: false });

		const broken = mock<N8nClient>();
		broken.executeWithLlmMock.mockRejectedValue(new Error('workflow is not runnable'));
		const [neverRan] = await executePriorRuns({
			client: broken,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});
		expect(neverRan.ran).toBe(false);
		expect(neverRan.executionId).toBeUndefined();
	});

	it('does not trust a fabricated executionId from a pre-run rejection', async () => {
		// The eval service rejects some requests BEFORE it calls the workflow runner —
		// unknown workflow, no trigger node — and returns an error result carrying a
		// freshly minted UUID no execution was ever stored under. Trusting it would report
		// a premise that does not exist as staged history.
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({
				success: false,
				executionId: '3f7c1e90-0000-4000-8000-000000000000',
				errors: ['No trigger or start node found in the workflow'],
			}),
		);
		client.getExecution.mockRejectedValue(new Error('404 not found'));

		const [outcome] = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcome.ran).toBe(false);
	});

	it('confirms the record for a genuinely staged failure', async () => {
		const client = mock<N8nClient>();
		client.executeWithLlmMock.mockResolvedValue(
			execResult({ success: false, executionId: '42', errors: ['HTTP Request: 500'] }),
		);
		client.getExecution.mockResolvedValue({
			id: '42',
			workflowId: 'wf-1',
			status: 'error',
		} as never);

		const [outcome] = await executePriorRuns({
			client,
			priorRuns: [{ workflow: 'dS8xQ2mV6bTn4Kp1' }],
			seedWorkflows: seeded,
			logger: logger(),
			sleep: noSleep,
		});

		expect(outcome).toMatchObject({ ran: true, executionId: '42', success: false });
	});

	it('throws when the seed never created the named workflow', async () => {
		// The schema cross-checks names at load, so reaching here means the premise
		// silently never happened. That is worth stopping for.
		const client = mock<N8nClient>();

		await expect(
			executePriorRuns({
				client,
				priorRuns: [{ workflow: 'nEvErSeEdEd12345' }],
				seedWorkflows: seeded,
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
			seedWorkflows: seeded,
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
				workflows: [{ id: 'dS8xQ2mV6bTn4Kp1', name: 'Daily Sync', nodes: [], connections: {} }],
				priorRuns,
			},
		};
	}

	it('accepts a prior run naming a seed workflow id', () => {
		const parsed = EvalTestCaseSchema.safeParse(caseWith([{ workflow: 'dS8xQ2mV6bTn4Kp1' }]));
		expect(parsed.success).toBe(true);
	});

	it('accepts the seed the README documents, through the REAL remap', () => {
		// Every seed goes through `remapSeedArtifactIds` at build time, and it refuses ids
		// shorter than 8 characters. A documented example that throws there is worse than
		// no example, and schema parsing alone would not catch it.
		const parsed = EvalTestCaseSchema.safeParse(caseWith([{ workflow: 'dS8xQ2mV6bTn4Kp1' }]));
		expect(parsed.success).toBe(true);
		if (parsed.success && parsed.data.seed?.mode === 'inline') {
			expect(() => remapSeedArtifactIds(parsed.data.seed as ConversationSeed)).not.toThrow();
		}
	});

	it('rejects a prior run naming an id the seed does not declare', () => {
		// Catching the typo at load beats a mid-build failure, which reads like an
		// infrastructure fault rather than an authoring mistake.
		const parsed = EvalTestCaseSchema.safeParse(caseWith([{ workflow: 'nOtDeClArEd12345' }]));
		expect(parsed.success).toBe(false);
		if (!parsed.success) {
			expect(JSON.stringify(parsed.error.issues)).toContain('which this seed does not declare');
			expect(JSON.stringify(parsed.error.issues)).toContain('dS8xQ2mV6bTn4Kp1');
		}
	});
});
