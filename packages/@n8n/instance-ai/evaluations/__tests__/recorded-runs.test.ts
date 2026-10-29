import type { InstanceAiEvalFailedExecutionEnvelope } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import type { N8nClient } from '../clients/n8n-client';
import type { EvalLogger } from '../harness/logger';
import { restoreRecordedRuns } from '../harness/recorded-runs';
import { EvalTestCaseSchema } from '../harness/schema';

const SEED_ID = 'dS8xQ2mV6bTn4Kp1';
const seeded = new Map([[SEED_ID, { id: 'wf-1', name: 'Daily Sync' }]]);

const envelope: InstanceAiEvalFailedExecutionEnvelope = {
	format: 'n8n-instance-ai-failed-execution',
	version: 1,
	source: {
		executionId: '42',
		workflowId: 'source-wf',
		workflowVersionId: null,
		createdAt: '2026-10-20T06:00:00.000Z',
		startedAt: '2026-10-20T06:00:00.000Z',
		stoppedAt: '2026-10-20T06:00:05.000Z',
	},
	execution: {
		mode: 'trigger',
		status: 'error',
		finished: false,
		workflowData: {},
		data: '[{}]',
	},
};

describe('restoreRecordedRuns', () => {
	it('restores each recorded run onto its seeded workflow, in order', async () => {
		const client = mock<N8nClient>();
		client.restoreExecution
			.mockResolvedValueOnce({ executionId: 'restored-1' })
			.mockResolvedValueOnce({ executionId: 'restored-2' });

		const second = { ...envelope, source: { ...envelope.source, executionId: '43' } };

		const ids = await restoreRecordedRuns({
			client,
			threadId: 'thread-1',
			recordedRuns: [
				{ workflow: SEED_ID, envelope },
				{ workflow: SEED_ID, envelope: second },
			],
			seedWorkflows: seeded,
			logger: mock<EvalLogger>(),
		});

		expect(ids).toEqual(['restored-1', 'restored-2']);
		expect(client.restoreExecution).toHaveBeenNthCalledWith(1, 'thread-1', 'wf-1', envelope);
		expect(client.restoreExecution).toHaveBeenNthCalledWith(2, 'thread-1', 'wf-1', second);
	});

	it('names the recorded run whose restore failed', async () => {
		const client = mock<N8nClient>();
		client.restoreExecution.mockRejectedValue(new Error('Workflow not found'));

		await expect(
			restoreRecordedRuns({
				client,
				threadId: 'thread-1',
				recordedRuns: [{ workflow: SEED_ID, envelope }],
				seedWorkflows: seeded,
				logger: mock<EvalLogger>(),
			}),
		).rejects.toThrow(
			'Recorded run "Daily Sync (dS8xQ2mV6bTn4Kp1)" (source execution 42): Workflow not found',
		);
	});

	it('warns when the recorded run has nodes the seed workflow does not', async () => {
		const client = mock<N8nClient>();
		client.restoreExecution.mockResolvedValue({ executionId: 'restored-1' });
		const logger = mock<EvalLogger>();
		const recorded = {
			...envelope,
			execution: {
				...envelope.execution,
				workflowData: { nodes: [{ name: 'Fetch' }, { name: 'Old node' }] },
			},
		};

		await restoreRecordedRuns({
			client,
			threadId: 'thread-1',
			recordedRuns: [{ workflow: SEED_ID, envelope: recorded }],
			seedWorkflows: seeded,
			seedNodeNames: new Map([[SEED_ID, new Set(['Fetch'])]]),
			logger,
		});

		expect(client.restoreExecution).toHaveBeenCalledTimes(1);
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Old node'));
	});

	it('throws when the seed did not create the named workflow', async () => {
		const client = mock<N8nClient>();

		await expect(
			restoreRecordedRuns({
				client,
				threadId: 'thread-1',
				recordedRuns: [{ workflow: 'nOtDeClArEd12345', envelope }],
				seedWorkflows: seeded,
				logger: mock<EvalLogger>(),
			}),
		).rejects.toThrow('which the seed did not create');
		expect(client.restoreExecution).not.toHaveBeenCalled();
	});
});

describe('recordedRuns schema validation', () => {
	function caseWith(recordedRuns: unknown[]) {
		return {
			conversation: [{ role: 'user', text: 'it broke again, fix it' }],
			complexity: 'simple',
			tags: [],
			processExpectations: ['the agent reads the failed execution instead of asking'],
			seed: {
				mode: 'inline',
				messages: [],
				workflows: [{ id: SEED_ID, name: 'Daily Sync', nodes: [], connections: {} }],
				recordedRuns,
			},
		};
	}

	it('accepts a recorded run on a declared seed workflow', () => {
		expect(EvalTestCaseSchema.safeParse(caseWith([{ workflow: SEED_ID, envelope }])).success).toBe(
			true,
		);
	});

	it('rejects a recorded run naming an id the seed does not declare', () => {
		const parsed = EvalTestCaseSchema.safeParse(
			caseWith([{ workflow: 'nOtDeClArEd12345', envelope }]),
		);
		expect(parsed.success).toBe(false);
		expect(JSON.stringify(parsed.error?.issues)).toContain('recordedRuns names workflow id');
	});

	it('rejects an envelope that is not a failed run', () => {
		const succeeded = { ...envelope, execution: { ...envelope.execution, status: 'success' } };
		expect(
			EvalTestCaseSchema.safeParse(caseWith([{ workflow: SEED_ID, envelope: succeeded }])).success,
		).toBe(false);
	});
});
