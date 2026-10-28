import { describe, expect, it, vi } from 'vitest';

import { mintResumeToken } from '../../auth/resume-token';
import type { StepMessage, WorkQueue } from '../../queue';
import { ExecutionNotFoundError, type ExecutionStore } from '../execution-store';
import type { ExecutionStatus } from '../execution.types';
import { ResumeRequestService, type ResumeHold } from '../resume-request.service';
import { StepNotFoundError, type StepRecord, type StepStore } from '../step-store';

const secret = 'a'.repeat(32);
const executionId = '0199a1b2-0000-7000-8000-000000000001';
const otherExecutionId = '0199a1b2-0000-7000-8000-000000000002';
const token = mintResumeToken(secret, executionId);
const hold = { attempts: 3, delayMs: 1 };

const accepting = (id: string): StepRecord => ({
	id,
	executionId,
	nodeId: `node-${id}`,
	iteration: 0,
	status: 'waiting',
	outputs: null,
	waitDeclaration: { resumeBinding: 'execution' },
	resumeCause: null,
});

const deadlineOnly: StepRecord = {
	...accepting('deadline'),
	waitDeclaration: {
		resumeAt: '2099-01-01T00:00:00.000Z',
		outputsAtDeadline: [],
	},
};

function setup({
	waiting = [] as StepRecord[][],
	status = 'running' as ExecutionStatus | 'missing',
	step = accepting('s1') as StepRecord | 'missing',
	resumed = true,
	serviceHold = hold as ResumeHold | 'default',
} = {}) {
	const loadWaitingSteps = vi.fn();
	for (const rows of waiting) loadWaitingSteps.mockResolvedValueOnce(rows);
	loadWaitingSteps.mockResolvedValue(waiting.at(-1) ?? []);

	const stepStore = {
		loadWaitingSteps,
		loadStep: vi.fn(async () => {
			if (step === 'missing') throw new StepNotFoundError('s1');
			return step;
		}),
		resumeStep: vi.fn().mockResolvedValue(resumed),
	} as unknown as StepStore;
	const executionStore = {
		loadExecution: vi.fn(async () => {
			if (status === 'missing') throw new ExecutionNotFoundError(executionId);
			return { status };
		}),
	} as unknown as ExecutionStore;
	const stepQueue = { publish: vi.fn() } as unknown as WorkQueue<StepMessage>;

	const service = new ResumeRequestService(
		executionStore,
		stepStore,
		stepQueue,
		secret,
		...(serviceHold === 'default' ? [] : [serviceHold]),
	);
	return { service, stepStore, stepQueue, loadWaitingSteps };
}

const rejection = (code: string) => expect.objectContaining({ code });

describe('ResumeRequestService.locate', () => {
	it('names the one step that accepts a request', async () => {
		const { service } = setup({ waiting: [[accepting('s1'), deadlineOnly]] });

		await expect(service.locate(executionId, token)).resolves.toEqual({
			stepId: 's1',
			nodeId: 'node-s1',
		});
	});

	it('rejects a token for another execution before it reads a step', async () => {
		const { service, loadWaitingSteps } = setup({ waiting: [[accepting('s1')]] });

		await expect(service.locate(otherExecutionId, token)).rejects.toEqual(
			rejection('invalid_token'),
		);
		expect(loadWaitingSteps).not.toHaveBeenCalled();
	});

	it('refuses two steps that accept a request at once', async () => {
		const { service } = setup({ waiting: [[accepting('s1'), accepting('s2')]] });

		await expect(service.locate(executionId, token)).rejects.toEqual(rejection('ambiguous'));
	});

	it.each(['queued', 'running', 'waiting'] as const)(
		'holds a request for a %s execution until its step suspends',
		async (status) => {
			const { service, loadWaitingSteps } = setup({
				waiting: [[], [accepting('s1')]],
				status,
			});

			await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
			expect(loadWaitingSteps).toHaveBeenCalledTimes(2);
		},
	);

	it('waits between two checks', async () => {
		const { service } = setup({
			waiting: [[], [accepting('s1')]],
			serviceHold: { attempts: 2, delayMs: 50 },
		});
		const startedAt = Date.now();

		await service.locate(executionId, token);

		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(45);
	});

	it('holds by default for more than one check', async () => {
		const { service } = setup({ waiting: [[], [accepting('s1')]], serviceHold: 'default' });

		await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
	});

	it('answers null once the hold runs out', async () => {
		const { service, loadWaitingSteps } = setup();

		await expect(service.locate(executionId, token)).resolves.toBeNull();
		expect(loadWaitingSteps).toHaveBeenCalledTimes(hold.attempts);
	});

	it('answers null at once for an execution that ended, even with a wait not cancelled yet', async () => {
		const { service, loadWaitingSteps } = setup({
			waiting: [[accepting('s1')]],
			status: 'completed',
		});

		await expect(service.locate(executionId, token)).resolves.toBeNull();
		expect(loadWaitingSteps).toHaveBeenCalledTimes(1);
	});

	// A failed or cancelled execution is written before its waits are cancelled.
	it.each(['failed', 'cancelled'] as const)(
		'answers null for a %s execution that still holds two waits',
		async (status) => {
			const { service } = setup({ waiting: [[accepting('s1'), accepting('s2')]], status });

			await expect(service.locate(executionId, token)).resolves.toBeNull();
		},
	);

	it('skips a step-bound wait, which an execution-bound token cannot resume', async () => {
		const stepBound: StepRecord = {
			...accepting('bound'),
			waitDeclaration: { resumeBinding: 'step' },
		};
		const { service } = setup({ waiting: [[stepBound, accepting('s1')]] });

		await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
	});

	it('answers null for a wait that only its deadline can end', async () => {
		const { service } = setup({ waiting: [[deadlineOnly]] });

		await expect(service.locate(executionId, token)).resolves.toBeNull();
	});

	it('refuses an execution that does not exist', async () => {
		const { service } = setup({ status: 'missing' });

		await expect(service.locate(executionId, token)).rejects.toEqual(rejection('not_found'));
	});
});

describe('ResumeRequestService.resolve', () => {
	const outputs = [[{ json: { approved: true } }]];

	it('ends the wait with the outputs, then announces the step', async () => {
		const { service, stepStore, stepQueue } = setup();

		await service.resolve('s1', token, outputs);

		expect(stepStore.resumeStep).toHaveBeenCalledWith('s1', { kind: 'request', outputs });
		expect(stepQueue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId,
			stepId: 's1',
		});
		expect(vi.mocked(stepStore.resumeStep).mock.invocationCallOrder[0]).toBeLessThan(
			vi.mocked(stepQueue.publish).mock.invocationCallOrder[0],
		);
	});

	it('checks the token against the execution of the step', async () => {
		const { service, stepStore } = setup({
			step: { ...accepting('s1'), executionId: otherExecutionId },
		});

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('invalid_token'));
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it('refuses a step that waits only for its deadline', async () => {
		const { service, stepStore } = setup({ step: deadlineOnly });

		await expect(service.resolve('deadline', token, outputs)).rejects.toEqual(
			rejection('not_waiting'),
		);
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it('resumes the named step of an execution that holds a second such wait', async () => {
		const { service, stepStore } = setup({ waiting: [[accepting('s1'), accepting('s2')]] });

		await service.resolve('s1', token, outputs);

		expect(stepStore.resumeStep).toHaveBeenCalledWith('s1', { kind: 'request', outputs });
	});

	it('refuses a step of an execution that ended', async () => {
		const { service, stepStore } = setup({ status: 'completed' });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('not_waiting'));
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it('refuses a step-bound wait', async () => {
		const { service, stepStore } = setup({
			step: { ...accepting('s1'), waitDeclaration: { resumeBinding: 'step' } },
		});

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('not_waiting'));
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it('refuses a step that no longer waits', async () => {
		const { service } = setup({ step: { ...accepting('s1'), status: 'queued' } });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('not_waiting'));
	});

	it('refuses the loser of a race and announces nothing', async () => {
		const { service, stepQueue } = setup({ resumed: false });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('not_waiting'));
		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

	it('refuses a step that does not exist as it refuses a bad token', async () => {
		const { service } = setup({ step: 'missing' });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('invalid_token'));
	});
});
