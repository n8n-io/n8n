import { describe, expect, it, vi } from 'vitest';

import {
	mintApprovalCallback,
	mintResumeToken,
	mintStepBoundResumeToken,
} from '../../auth/resume-token';
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

const stepId = '0199a1b2-0000-7000-8000-0000000000aa';
const otherStepId = '0199a1b2-0000-7000-8000-0000000000bb';
const binding = `/webhook-waiting/${stepId}/node?approved=true`;
const stepTokens = [
	['a step-bound token', mintStepBoundResumeToken(secret, stepId, binding)],
	['an approval callback', mintApprovalCallback(secret, stepId, 'a')],
] as const;

const stepBound = (overrides: Partial<StepRecord> = {}): StepRecord => ({
	...accepting(stepId),
	waitDeclaration: { resumeBinding: 'step' },
	...overrides,
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
	step = accepting('s1') as StepRecord | StepRecord[] | 'missing',
	resumed = true,
	serviceHold = hold as ResumeHold | 'default',
} = {}) {
	const loadWaitingSteps = vi.fn();
	for (const rows of waiting) loadWaitingSteps.mockResolvedValueOnce(rows);
	loadWaitingSteps.mockResolvedValue(waiting.at(-1) ?? []);

	const loadStep = vi.fn();
	if (step === 'missing') loadStep.mockRejectedValue(new StepNotFoundError('s1'));
	else {
		for (const row of [step].flat()) loadStep.mockResolvedValueOnce(row);
		loadStep.mockResolvedValue([step].flat().at(-1));
	}

	const stepStore = {
		loadWaitingSteps,
		loadStep,
		resumeStep: vi.fn().mockResolvedValue(resumed),
		recordBallotVote: vi.fn(),
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
	return { service, stepStore, stepQueue, loadWaitingSteps, loadStep };
}

const rejection = (code: string) => expect.objectContaining({ code });

describe('ResumeRequestService.locateByToken with an execution-bound token', () => {
	it('names the one step that accepts a request', async () => {
		const { service } = setup({ waiting: [[accepting('s1'), deadlineOnly]] });

		await expect(service.locateByToken(executionId, token)).resolves.toEqual({
			executionId,
			target: { stepId: 's1', nodeId: 'node-s1' },
		});
	});

	it('refuses two steps that accept a request at once', async () => {
		const { service } = setup({ waiting: [[accepting('s1'), accepting('s2')]] });

		await expect(service.locateByToken(executionId, token)).rejects.toEqual(rejection('ambiguous'));
	});

	it.each(['queued', 'running', 'waiting'] as const)(
		'holds a request for a %s execution until its step suspends',
		async (status) => {
			const { service, loadWaitingSteps } = setup({
				waiting: [[], [accepting('s1')]],
				status,
			});

			await expect(service.locateByToken(executionId, token)).resolves.toMatchObject({
				target: { stepId: 's1' },
			});
			expect(loadWaitingSteps).toHaveBeenCalledTimes(2);
		},
	);

	it('waits between two checks', async () => {
		const { service } = setup({
			waiting: [[], [accepting('s1')]],
			serviceHold: { attempts: 2, delayMs: 50 },
		});
		const startedAt = Date.now();

		await service.locateByToken(executionId, token);

		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(45);
	});

	it('holds by default for more than one check', async () => {
		const { service } = setup({ waiting: [[], [accepting('s1')]], serviceHold: 'default' });

		await expect(service.locateByToken(executionId, token)).resolves.toMatchObject({
			target: { stepId: 's1' },
		});
	});

	it('answers null when the step-bound wait ends during the hold', async () => {
		const { service } = setup({ waiting: [[stepBound()], []] });

		await expect(service.locateByToken(executionId, token)).resolves.toEqual({
			executionId,
			target: null,
		});
	});

	it('answers null once the hold runs out', async () => {
		const { service, loadWaitingSteps } = setup();

		await expect(service.locateByToken(executionId, token)).resolves.toEqual({
			executionId,
			target: null,
		});
		expect(loadWaitingSteps).toHaveBeenCalledTimes(hold.attempts);
	});

	it('answers null at once for an execution that ended, even with a wait not cancelled yet', async () => {
		const { service, loadWaitingSteps } = setup({
			waiting: [[accepting('s1')]],
			status: 'completed',
		});

		await expect(service.locateByToken(executionId, token)).resolves.toEqual({
			executionId,
			target: null,
		});
		expect(loadWaitingSteps).toHaveBeenCalledTimes(1);
	});

	// A failed or cancelled execution is written before its waits are cancelled.
	it.each(['failed', 'cancelled'] as const)(
		'answers null for a %s execution that still holds two waits',
		async (status) => {
			const { service } = setup({ waiting: [[accepting('s1'), accepting('s2')]], status });

			await expect(service.locateByToken(executionId, token)).resolves.toEqual({
				executionId,
				target: null,
			});
		},
	);

	it('skips a step-bound wait, which an execution-bound token cannot resume', async () => {
		const stepBound: StepRecord = {
			...accepting('bound'),
			waitDeclaration: { resumeBinding: 'step' },
		};
		const { service } = setup({ waiting: [[stepBound, accepting('s1')]] });

		await expect(service.locateByToken(executionId, token)).resolves.toMatchObject({
			target: { stepId: 's1' },
		});
	});

	it('refuses an execution whose waits are only step bound once the hold runs out', async () => {
		const { service, loadWaitingSteps } = setup({ waiting: [[stepBound(), deadlineOnly]] });

		await expect(service.locateByToken(executionId, token)).rejects.toEqual(
			rejection('step_bound_only'),
		);
		expect(loadWaitingSteps).toHaveBeenCalledTimes(hold.attempts);
	});

	it('answers null for a wait that only its deadline can end', async () => {
		const { service } = setup({ waiting: [[deadlineOnly]] });

		await expect(service.locateByToken(executionId, token)).resolves.toEqual({
			executionId,
			target: null,
		});
	});

	it('refuses an execution that does not exist', async () => {
		const { service } = setup({ status: 'missing' });

		await expect(service.locateByToken(executionId, token)).rejects.toEqual(rejection('not_found'));
	});

	it.each(stepTokens)('rejects %s', async (_, stepToken) => {
		const { service } = setup({ waiting: [[stepBound()]] });

		await expect(service.locateByToken(executionId, stepToken)).rejects.toEqual(
			rejection('invalid_token'),
		);
	});
});

describe('ResumeRequestService.locateByToken', () => {
	const located = { executionId, target: { stepId, nodeId: `node-${stepId}` } };

	it.each(stepTokens)('locates the step-bound wait that %s names', async (_, stepToken) => {
		const { service } = setup({ step: stepBound() });

		await expect(service.locateByToken(stepId, stepToken, binding)).resolves.toEqual(located);
	});

	it('locates an approval callback without a path and query', async () => {
		const { service } = setup({ step: stepBound() });

		await expect(
			service.locateByToken(stepId, mintApprovalCallback(secret, stepId, 'd')),
		).resolves.toEqual(located);
	});

	it.each([
		['a changed parameter', `/webhook-waiting/${stepId}/node?approved=false`],
		['an added parameter', `${binding}&extra=1`],
		['a removed parameter', `/webhook-waiting/${stepId}/node`],
		['another path', `/webhook-waiting/${otherStepId}/node?approved=true`],
		['no path and query', undefined],
	])('rejects a step-bound token with %s', async (_, pathAndQuery) => {
		const { service, loadStep } = setup({ step: stepBound() });
		const [, stepToken] = stepTokens[0];

		const result = service.locateByToken(stepId, stepToken, pathAndQuery);

		await expect(result).rejects.toEqual(rejection('invalid_token'));
		expect(loadStep).not.toHaveBeenCalled();
	});

	it.each<[string, string, string]>([
		['an execution-bound token', otherExecutionId, token],
		...stepTokens.map(([name, stepToken]): [string, string, string] => [
			name,
			otherStepId,
			stepToken,
		]),
		['a bad token', executionId, 'not-a-token'],
	])('rejects %s that does not name the id', async (_, id, anyToken) => {
		const { service, loadStep, loadWaitingSteps } = setup({ step: stepBound() });

		await expect(service.locateByToken(id, anyToken, binding)).rejects.toEqual(
			rejection('invalid_token'),
		);
		expect(loadStep).not.toHaveBeenCalled();
		expect(loadWaitingSteps).not.toHaveBeenCalled();
	});

	it.each(['queued', 'running'] as const)(
		'holds a request for a %s step until it waits',
		async (status) => {
			const { service, loadStep } = setup({ step: [stepBound({ status }), stepBound()] });
			const [, stepToken] = stepTokens[1];

			await expect(service.locateByToken(stepId, stepToken)).resolves.toEqual(located);
			expect(loadStep).toHaveBeenCalledTimes(2);
		},
	);

	it('waits between two checks of a step', async () => {
		const { service } = setup({
			step: [stepBound({ status: 'running' }), stepBound()],
			serviceHold: { attempts: 2, delayMs: 50 },
		});
		const [, stepToken] = stepTokens[1];
		const startedAt = Date.now();

		await service.locateByToken(stepId, stepToken);

		expect(Date.now() - startedAt).toBeGreaterThanOrEqual(45);
	});

	it('finds a step that starts to wait at the last check', async () => {
		const { service } = setup({
			step: [stepBound({ status: 'running' }), stepBound({ status: 'running' }), stepBound()],
		});
		const [, stepToken] = stepTokens[1];

		await expect(service.locateByToken(stepId, stepToken)).resolves.toEqual(located);
	});

	it('holds a step-bound token at an execution-bound wait, then answers null', async () => {
		const { service, loadStep } = setup({ step: accepting(stepId) });
		const [, stepToken] = stepTokens[1];

		await expect(service.locateByToken(stepId, stepToken)).resolves.toEqual({
			executionId,
			target: null,
		});
		expect(loadStep).toHaveBeenCalledTimes(hold.attempts);
	});

	it.each([
		['a step that settled', { step: stepBound({ status: 'completed' }) }],
		['an execution that ended', { step: stepBound(), status: 'cancelled' as const }],
	])('answers null at once for %s', async (_, state) => {
		const { service, loadStep } = setup(state);
		const [, stepToken] = stepTokens[1];

		await expect(service.locateByToken(stepId, stepToken)).resolves.toEqual({
			executionId,
			target: null,
		});
		expect(loadStep).toHaveBeenCalledTimes(1);
	});

	it('refuses a step that does not exist', async () => {
		const { service } = setup({ step: 'missing' });
		const [, stepToken] = stepTokens[1];

		await expect(service.locateByToken(stepId, stepToken)).rejects.toEqual(rejection('not_found'));
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

	it.each(stepTokens)('ends a step-bound wait with %s', async (_, stepToken) => {
		const { service, stepStore } = setup({ step: stepBound() });

		await service.resolve(stepId, stepToken, outputs);

		expect(stepStore.resumeStep).toHaveBeenCalledWith(stepId, { kind: 'request', outputs });
	});

	it.each(stepTokens)('refuses %s for another step', async (_, stepToken) => {
		const { service, stepStore } = setup({ step: stepBound({ id: otherStepId }) });

		await expect(service.resolve(otherStepId, stepToken, outputs)).rejects.toEqual(
			rejection('invalid_token'),
		);
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it.each(stepTokens)('refuses %s at an execution-bound wait', async (_, stepToken) => {
		const { service, stepStore } = setup({ step: accepting(stepId) });

		await expect(service.resolve(stepId, stepToken, outputs)).rejects.toEqual(
			rejection('not_waiting'),
		);
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
	});

	it('refuses a token that does not verify', async () => {
		const { service, stepStore } = setup();

		await expect(service.resolve('s1', 'not-a-token', outputs)).rejects.toEqual(
			rejection('invalid_token'),
		);
		expect(stepStore.loadStep).not.toHaveBeenCalled();
	});

	// A token for another step must not learn whether this step waits.
	it('refuses a token for another step with 401 even when that step does not wait', async () => {
		const { service } = setup({ step: stepBound({ id: otherStepId, status: 'completed' }) });
		const [, stepToken] = stepTokens[1];

		await expect(service.resolve(otherStepId, stepToken, outputs)).rejects.toEqual(
			rejection('invalid_token'),
		);
	});

	it('refuses a step that does not exist as it refuses a bad token', async () => {
		const { service } = setup({ step: 'missing' });

		await expect(service.resolve('s1', token, outputs)).rejects.toEqual(rejection('invalid_token'));
	});
});

describe('ResumeRequestService.castBallotVote', () => {
	const ballotDeclaration = {
		voters: [{ approver: 'A' }, { approver: 'B' }, { approver: 'C' }],
		required: 2,
		allowDecline: true,
	};
	const ballotStep = (overrides: Partial<StepRecord> = {}): StepRecord =>
		stepBound({
			waitDeclaration: { ballot: ballotDeclaration, resumeBinding: 'step' },
			...overrides,
		});
	const voteLink = (query: string) => `/webhook-waiting/${stepId}/node?${query}`;
	const voteToken = (pathAndQuery: string) =>
		mintStepBoundResumeToken(secret, stepId, pathAndQuery);

	function setupVote(
		options: Parameters<typeof setup>[0] & {
			afterVote?: StepRecord;
			recorded?: boolean;
		} = {},
	) {
		const context = setup({ step: ballotStep(), ...options });
		vi.mocked(context.stepStore.recordBallotVote).mockResolvedValue({
			recorded: options.recorded ?? true,
			step: options.afterVote ?? ballotStep(),
		});
		return context;
	}

	async function cast(service: ResumeRequestService, query: string) {
		const pathAndQuery = voteLink(query);
		return await service.castBallotVote(stepId, voteToken(pathAndQuery), pathAndQuery);
	}

	it('records a vote that does not decide the ballot', async () => {
		const { service, stepStore, stepQueue } = setupVote({
			afterVote: ballotStep({ ballotVotes: { '1': { decision: 'a', votedAt: 'now' } } }),
		});

		await expect(cast(service, 'vote=a&voter=1')).resolves.toEqual({ result: 'recorded' });
		expect(stepStore.recordBallotVote).toHaveBeenCalledWith(stepId, 1, 'a', expect.any(Date));
		expect(stepStore.resumeStep).not.toHaveBeenCalled();
		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

	it('resumes and announces the step when the vote decides the ballot', async () => {
		const { service, stepStore, stepQueue } = setupVote({
			afterVote: ballotStep({
				ballotVotes: {
					'0': { decision: 'a', votedAt: 'then' },
					'1': { decision: 'a', votedAt: 'now' },
				},
			}),
		});

		await expect(cast(service, 'vote=a&voter=1')).resolves.toEqual({
			result: 'recorded',
			outcome: 'approved',
		});
		expect(stepStore.resumeStep).toHaveBeenCalledWith(stepId, {
			kind: 'ballot',
			outcome: 'approved',
			decidedAt: expect.any(String),
		});
		expect(stepQueue.publish).toHaveBeenCalledWith({
			type: 'step:ready',
			executionId,
			stepId,
		});
	});

	it('declines as soon as approval can no longer be reached', async () => {
		const { service, stepStore } = setupVote({
			afterVote: ballotStep({
				ballotVotes: {
					'0': { decision: 'd', votedAt: 'then' },
					'2': { decision: 'd', votedAt: 'now' },
				},
			}),
		});

		await expect(cast(service, 'vote=d&voter=2')).resolves.toMatchObject({ outcome: 'declined' });
		expect(stepStore.resumeStep).toHaveBeenCalledWith(
			stepId,
			expect.objectContaining({ outcome: 'declined' }),
		);
	});

	it('does not announce a step that another vote resumed first', async () => {
		const { service, stepQueue } = setupVote({
			resumed: false,
			afterVote: ballotStep({
				ballotVotes: {
					'0': { decision: 'a', votedAt: 'then' },
					'1': { decision: 'a', votedAt: 'now' },
				},
			}),
		});

		await expect(cast(service, 'vote=a&voter=1')).resolves.toMatchObject({ outcome: 'approved' });
		expect(stepQueue.publish).not.toHaveBeenCalled();
	});

	it('keeps the first vote of a voter', async () => {
		const { service } = setupVote({ recorded: false });

		await expect(cast(service, 'vote=d&voter=0')).resolves.toEqual({ result: 'duplicate' });
	});

	it.each([
		[{ kind: 'ballot', outcome: 'approved', decidedAt: 'then' }, 'approved'],
		[{ kind: 'ballot', outcome: 'declined', decidedAt: 'then' }, 'declined'],
		[{ kind: 'deadline' }, 'timedOut'],
	] as const)('reports a ballot that ended with %o as %s', async (resumeCause, outcome) => {
		const { service, stepStore } = setupVote({
			step: ballotStep({ status: 'completed', resumeCause }),
		});

		await expect(cast(service, 'vote=a&voter=0')).resolves.toEqual({ result: 'closed', outcome });
		expect(stepStore.recordBallotVote).not.toHaveBeenCalled();
	});

	it('reports a ballot of an ended execution as inactive', async () => {
		const { service, stepStore } = setupVote({
			status: 'cancelled',
			step: ballotStep({ status: 'cancelled' }),
		});

		await expect(cast(service, 'vote=a&voter=0')).resolves.toEqual({
			result: 'closed',
			outcome: 'inactive',
		});
		expect(stepStore.recordBallotVote).not.toHaveBeenCalled();
	});

	it('holds a vote that arrives before the step suspends', async () => {
		const { service, loadStep } = setupVote({
			step: [ballotStep({ status: 'running', waitDeclaration: null }), ballotStep()],
		});

		await expect(cast(service, 'vote=a&voter=0')).resolves.toEqual({ result: 'recorded' });
		expect(loadStep).toHaveBeenCalledTimes(2);
	});

	it.each([
		['a voter the ballot does not have', 'vote=a&voter=3'],
		['an unknown vote', 'vote=x&voter=0'],
		['no voter', 'vote=a'],
	])('refuses %s', async (_, query) => {
		const { service } = setupVote();

		await expect(cast(service, query)).rejects.toEqual(rejection('invalid_token'));
	});

	it('refuses a decline when the ballot allows none', async () => {
		const { service } = setupVote({
			step: ballotStep({
				waitDeclaration: {
					ballot: { ...ballotDeclaration, allowDecline: false },
					resumeBinding: 'step',
				},
			}),
		});

		await expect(cast(service, 'vote=d&voter=0')).rejects.toEqual(rejection('invalid_token'));
	});

	it('refuses a query that the token does not bind', async () => {
		const { service } = setupVote();
		const token = voteToken(voteLink('vote=d&voter=0'));

		await expect(service.castBallotVote(stepId, token, voteLink('vote=a&voter=0'))).rejects.toEqual(
			rejection('invalid_token'),
		);
	});

	it('refuses an approval callback', async () => {
		const { service } = setupVote();

		await expect(
			service.castBallotVote(
				stepId,
				mintApprovalCallback(secret, stepId, 'a'),
				voteLink('vote=a&voter=0'),
			),
		).rejects.toEqual(rejection('invalid_token'));
	});

	it('refuses a step without a ballot', async () => {
		const { service } = setupVote({ step: stepBound() });

		await expect(cast(service, 'vote=a&voter=0')).rejects.toEqual(rejection('not_waiting'));
	});

	it('is not a target of a plain resume request', async () => {
		const { service } = setup({ step: ballotStep() });
		const pathAndQuery = voteLink('vote=a&voter=0');

		await expect(
			service.locateByToken(stepId, voteToken(pathAndQuery), pathAndQuery),
		).resolves.toMatchObject({ target: null });
	});
});
