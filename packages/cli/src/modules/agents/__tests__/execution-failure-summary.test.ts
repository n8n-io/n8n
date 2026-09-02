import type { TimelineEvent } from '../execution-recorder';
import { computeExecutionFailureSummary } from '../utils/execution-failure-summary';

function failedCall(
	kind: 'tool' | 'node' | 'workflow',
	overrides: Partial<Extract<TimelineEvent, { type: 'tool-call' }>> = {},
): Extract<TimelineEvent, { type: 'tool-call' }> {
	return {
		type: 'tool-call',
		kind,
		name: 'fallback_name',
		toolCallId: 'call-1',
		input: {},
		output: { error: 'request failed' },
		startTime: 10,
		endTime: 20,
		success: false,
		...overrides,
	};
}

describe('computeExecutionFailureSummary', () => {
	it.each([
		['tool', {}, 'fallback_name', 'request failed'],
		['node', { nodeDisplayName: 'Lookup customer' }, 'Lookup customer', 'request failed'],
		['workflow', { workflowName: 'Enrich account' }, 'Enrich account', 'request failed'],
		[
			'tool',
			{
				name: 'delegate_subagent',
				success: true,
				output: { status: 'failed', error: 'child failed' },
			},
			'delegate_subagent',
			'child failed',
		],
	] as const)(
		'projects a completed failed %s call',
		(kind, overrides, expectedName, expectedMessage) => {
			const summary = computeExecutionFailureSummary({
				timeline: [failedCall(kind, overrides)],
				status: 'success',
				error: null,
				stoppedAt: 30,
			});

			expect(summary).toEqual({
				count: 1,
				latest: {
					kind,
					name: expectedName,
					message: expectedMessage,
					occurredAt: 20,
				},
			});
		},
	);

	it('counts workflow and execution failure scopes once and keeps the latest truncated message', () => {
		const summary = computeExecutionFailureSummary({
			timeline: [
				failedCall('workflow', {
					success: true,
					output: { status: 'error', error: 'workflow failed' },
				}),
			],
			status: 'error',
			error: 'x'.repeat(500),
			stoppedAt: 30,
		});

		expect(summary).toEqual({
			count: 2,
			latest: {
				kind: 'execution',
				name: null,
				message: 'x'.repeat(400),
				occurredAt: 30,
			},
		});
	});

	it.each([
		{
			name: 'open call',
			timeline: [failedCall('tool', { endTime: 0 })],
			status: 'success' as const,
		},
		{
			name: 'declined call',
			timeline: [failedCall('node', { output: { declined: true, error: 'not approved' } })],
			status: 'success' as const,
		},
		{ name: 'cancelled execution', timeline: [], status: 'cancelled' as const },
		{ name: 'clean success', timeline: [], status: 'success' as const },
	])('does not project a $name', ({ timeline, status }) => {
		expect(
			computeExecutionFailureSummary({
				timeline,
				status,
				error: null,
				stoppedAt: 30,
			}),
		).toBeNull();
	});

	it('projects interrupted executions as failures', () => {
		expect(
			computeExecutionFailureSummary({
				timeline: [],
				status: 'interrupted',
				error: 'Agent execution was interrupted.',
				stoppedAt: 30,
			}),
		).toEqual({
			count: 1,
			latest: {
				kind: 'execution',
				name: null,
				message: 'Agent execution was interrupted.',
				occurredAt: 30,
			},
		});
	});
});
