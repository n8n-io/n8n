import { mock } from 'vitest-mock-extended';
import type { AgentExecution, ThreadDetail } from '../composables/useAgentThreadsApi';
import type { AgentUsageUpdate } from '../types';
import {
	formatAgentUsage,
	getAgentSessionUsage,
	getAgentSessionDuration,
} from '../utils/agent-usage';

describe('formatAgentUsage', () => {
	it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'hides unavailable tokens (%s)',
		(tokens) => {
			expect(formatAgentUsage(tokens, 1)).toBeNull();
		},
	);

	it.each([null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'shows tokens without an unavailable price (%s)',
		(cost) => {
			expect(formatAgentUsage(125, cost)).toBe('125t');
		},
	);

	it('shows a known price', () => {
		expect(formatAgentUsage(125, 0.125)).toBe('125t ($0.1250)');
	});

	it('shows a positive cost below the displayed precision', () => {
		expect(formatAgentUsage(1, 0.000001)).toBe('1t (<$0.0001)');
	});
});

describe('getAgentSessionUsage', () => {
	const thread = mock<ThreadDetail['thread']>({
		id: 'session-1',
		totalPromptTokens: 100,
		totalCompletionTokens: 25,
		totalCost: 0.125,
	});
	const live: AgentUsageUpdate = {
		sessionId: 'session-1',
		executionId: 'execution-1',
		complete: false,
		usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost: 0.05 },
	};

	it('adds the current execution to the saved session totals', () => {
		const detail = {
			thread,
			executions: [mock<AgentExecution>({ id: live.executionId, status: 'running' })],
		};
		expect(getAgentSessionUsage(detail, { [live.executionId]: live })).toEqual({
			totalTokens: 155,
			cost: 0.175,
		});
	});

	it('uses the saved totals after the execution completes', () => {
		const detail = {
			thread,
			executions: [
				mock<AgentExecution>({
					id: live.executionId,
					status: 'success',
					totalTokens: 30,
					cost: 0.05,
				}),
			],
		};
		expect(getAgentSessionUsage(detail, { [live.executionId]: live })).toEqual({
			totalTokens: 125,
			cost: 0.125,
		});
	});

	it('ignores updates from another session', () => {
		expect(
			getAgentSessionUsage(
				{ thread, executions: [] },
				{ other: { ...live, sessionId: 'session-2' } },
			),
		).toEqual({ totalTokens: 125, cost: 0.125 });
	});

	it('keeps a completed live snapshot until the saved result arrives', () => {
		expect(
			getAgentSessionUsage(
				{ thread, executions: [] },
				{ [live.executionId]: { ...live, complete: true } },
			),
		).toEqual({ totalTokens: 155, cost: 0.175 });
	});

	it('hides a partial price when a saved execution has no price', () => {
		const detail = { thread, executions: [mock<AgentExecution>({ totalTokens: 10, cost: null })] };
		expect(getAgentSessionUsage(detail).cost).toBeNull();
	});

	it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY])(
		'hides a partial price when the live execution has an unavailable price (%s)',
		(cost) => {
			const unpriced = {
				...live,
				usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30, cost },
			};
			expect(
				getAgentSessionUsage({ thread, executions: [] }, { [live.executionId]: unpriced }),
			).toEqual({ totalTokens: 155, cost: null });
		},
	);
});

describe('getAgentSessionDuration', () => {
	const thread = mock<ThreadDetail['thread']>({ id: 'session-1', totalDuration: 1500 });
	const update: AgentUsageUpdate = {
		sessionId: 'session-1',
		executionId: 'live-1',
		duration: 2000,
		complete: false,
	};
	it('adds server duration to earlier completed executions', () => {
		expect(getAgentSessionDuration({ thread, executions: [] }, { 'live-1': update })).toBe(3500);
	});
	it('keeps the confirmed duration when a running execution has no new snapshot', () => {
		const execution = mock<AgentExecution>({ id: 'live-1', status: 'running', duration: 500 });
		expect(getAgentSessionDuration({ thread, executions: [execution] }, {})).toBe(2000);
		expect(getAgentSessionDuration({ thread, executions: [execution] }, { 'live-1': update })).toBe(
			3500,
		);
	});
	it('keeps final duration until the saved result arrives without double counting', () => {
		const completed = { ...update, complete: true, duration: 2300 };
		expect(getAgentSessionDuration({ thread, executions: [] }, { 'live-1': completed })).toBe(3800);
		expect(
			getAgentSessionDuration(
				{
					thread: { ...thread, totalDuration: 3800 },
					executions: [mock<AgentExecution>({ id: 'live-1', status: 'success', duration: 2300 })],
				},
				{ 'live-1': completed },
			),
		).toBe(3800);
	});
	it('uses saved execution durations before the thread aggregate catches up', () => {
		expect(
			getAgentSessionDuration(
				{
					thread,
					executions: [
						mock<AgentExecution>({ id: 'earlier', status: 'success', duration: 1500 }),
						mock<AgentExecution>({ id: 'live-1', status: 'success', duration: 2300 }),
					],
				},
				{ 'live-1': { ...update, complete: true, duration: 2300 } },
			),
		).toBe(3800);
	});
	it('excludes approval waiting time when a suspended execution resumes', () => {
		const executions = [
			mock<AgentExecution>({
				id: 'live-1',
				status: 'success',
				hitlStatus: 'suspended',
				duration: 2000,
			}),
			mock<AgentExecution>({ id: 'resumed', status: 'running', duration: 0 }),
		];
		expect(
			getAgentSessionDuration(
				{ thread: { ...thread, totalDuration: 2000 }, executions },
				{
					'live-1': update,
					resumed: { ...update, executionId: 'resumed', duration: 500 },
				},
			),
		).toBe(2500);
	});
	it('excludes other sessions and invalid durations', () => {
		expect(
			getAgentSessionDuration(
				{ thread, executions: [] },
				{
					other: { ...update, sessionId: 'other' },
					invalid: { ...update, executionId: 'invalid', duration: Number.NaN },
					negative: { ...update, executionId: 'negative', duration: -2000 },
				},
			),
		).toBe(1500);
	});
});
