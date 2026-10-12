import { describe, expect, it, vi } from 'vitest';

import { mintResumeToken } from '../../auth/resume-token';
import type { EngineLogger } from '../../logging';
import type { StepMessage, WorkQueue } from '../../queue';
import { ExecutionNotFoundError, type ExecutionStore } from '../execution-store';
import type { ExecutionStatus } from '../execution.types';
import { ResumeRejectedError, ResumeRequestService } from '../resume-request.service';
import { StepNotFoundError, type StepRecord, type StepStore } from '../step-store';

const secret = 'a'.repeat(32);
const executionId = 'exec-1';
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
	const logger = { debug: vi.fn() } as unknown as EngineLogger;

	const service = new ResumeRequestService(
		executionStore,
		stepStore,
		stepQueue,
		secret,
		logger,
		hold,
	);
	return { service, stepStore, stepQueue, loadWaitingSteps, logger };
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

		await expect(service.locate('exec-2', token)).rejects.toEqual(rejection('invalid_token'));
		expect(loadWaitingSteps).not.toHaveBeenCalled();
	});

	it('refuses two steps that accept a request at once', async () => {
		const { service } = setup({ waiting: [[accepting('s1'), accepting('s2')]] });

		await expect(service.locate(executionId, token)).rejects.toEqual(rejection('ambiguous'));
	});

	it('holds a request for a live execution until its step suspends, and logs the hold', async () => {
		const { service, loadWaitingSteps, logger } = setup({ waiting: [[], [accepting('s1')]] });

		await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
		expect(loadWaitingSteps).toHaveBeenCalledTimes(2);
		expect(logger.debug).toHaveBeenCalledWith(
			'engine: held a resume request',
			expect.objectContaining({ executionId, outcome: 'target', stepId: 's1' }),
		);
	});

	it('answers null for an execution that ended before its wait was cancelled', async () => {
		const { service } = setup({ waiting: [[accepting('s1')]], status: 'failed' });

		await expect(service.locate(executionId, token)).resolves.toBeNull();
	});

	it.each(['queued', 'waiting'] as const)(
		'holds a request for a %s execution as for a running one',
		async (status) => {
			const { service, loadWaitingSteps } = setup({ waiting: [[], [accepting('s1')]], status });

			await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
			expect(loadWaitingSteps).toHaveBeenCalledTimes(2);
		},
	);

	it('answers null once the hold runs out, and logs the hold', async () => {
		const { service, loadWaitingSteps, logger } = setup();

		await expect(service.locate(executionId, token)).resolves.toBeNull();
		expect(loadWaitingSteps).toHaveBeenCalledTimes(hold.attempts);
		expect(logger.debug).toHaveBeenCalledWith(
			'engine: held a resume request',
			expect.objectContaining({ executionId, outcome: 'no_target', status: 'running' }),
		);
	});

	it('answers null at once for an execution that ended', async () => {
		const { service, loadWaitingSteps } = setup({ status: 'completed' });

		await expect(service.locate(executionId, token)).resolves.toBeNull();
		expect(loadWaitingSteps).toHaveBeenCalledTimes(1);
	});

	it('skips a step-bound wait, which an execution-bound token cannot resume', async () => {
		const stepBound: StepRecord = {
			...accepting('bound'),
			waitDeclaration: { resumeBinding: 'step' },
		};
		const { service } = setup({ waiting: [[stepBound, accepting('s1')]] });

		await expect(service.locate(executionId, token)).resolves.toMatchObject({ stepId: 's1' });
	});

	it('answers null for a wait that only its deadline can end', async () => {
		const { service } = setup({ waiting: [[deadlineOnly]], status: 'completed' });

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
		const { service, stepStore } = setup({ step: { ...accepting('s1'), executionId: 'exec-2' } });

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

	it('refuses a step of an execution that holds two such waits', async () => {
		const { service, stepStore } = setup({ waiting: [[accepting('s1'), accepting('s2')]] });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('ambiguous'));
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
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

	it('refuses a step that does not exist', async () => {
		const { service } = setup({ step: 'missing' });

		await expect(service.resolve('s1', token, outputs)).rejects.toBeInstanceOf(ResumeRejectedError);
		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('not_found'));
	});
});
