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
	const start = Date.parse('2026-10-23T12:00:00Z');
	const thread = mock<ThreadDetail['thread']>({ id: 'session-1', totalDuration: 1500 });
	const update: AgentUsageUpdate = {
		sessionId: 'session-1',
		executionId: 'live-1',
		startedAt: start,
		complete: false,
	};
	it('adds running time to earlier completed executions', () => {
		expect(
			getAgentSessionDuration({ thread, executions: [] }, { 'live-1': update }, start + 2000),
		).toEqual({ duration: 3500, running: true });
	});
	it('uses the server start time after loading a running session', () => {
		const execution = mock<AgentExecution>({
			id: 'live-1',
			status: 'running',
			startedAt: new Date(start).toISOString(),
		});
		expect(
			getAgentSessionDuration(
				{ thread, executions: [execution] },
				{ 'live-1': { ...update, startedAt: start + 500 } },
				start + 2000,
			),
		).toEqual({ duration: 3500, running: true });
	});
	it('freezes the last duration until the saved result arrives', () => {
		const completed = { ...update, complete: true, stoppedAt: start + 2000 };
		expect(
			getAgentSessionDuration({ thread, executions: [] }, { 'live-1': completed }, start + 5000),
		).toEqual({ duration: 3500, running: false });
		expect(
			getAgentSessionDuration(
				{ thread, executions: [mock<AgentExecution>({ id: 'live-1', status: 'success' })] },
				{ 'live-1': completed },
				start + 5000,
			),
		).toEqual({ duration: 1500, running: false });
	});
	it('excludes idle time and other sessions', () => {
		expect(
			getAgentSessionDuration(
				{ thread, executions: [] },
				{ 'live-1': { ...update, sessionId: 'other' } },
				start + 2000,
			),
		).toEqual({ duration: 1500, running: false });
	});
	it('does not show a negative duration when clocks differ', () => {
		expect(
			getAgentSessionDuration({ thread, executions: [] }, { 'live-1': update }, start - 2000),
		).toEqual({ duration: 1500, running: true });
	});
});
