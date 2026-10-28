import { DOMAIN_TOOL_IDS } from '../../../src/tools/tool-ids';
import type { CapturedEvent } from '../../types';
import { computeLatencyMetrics } from '../metrics';

const SENT_AT = 1_000;

function event(
	timestamp: number,
	type: string,
	payload: Record<string, unknown> = {},
): CapturedEvent {
	return { timestamp, type, data: { type, runId: 'run-1', agentId: 'agent-1', payload } };
}

function toolCall(timestamp: number, toolCallId: string, toolName: string): CapturedEvent {
	return event(timestamp, 'tool-call', { toolCallId, toolName, args: {} });
}

function toolResult(timestamp: number, toolCallId: string, result: unknown = {}): CapturedEvent {
	return event(timestamp, 'tool-result', { toolCallId, result });
}

const buildSuccess = { success: true, workflowId: 'wf-1' };

describe('computeLatencyMetrics', () => {
	it('measures the first workspace tool, the first saved workflow and the turn', () => {
		const metrics = computeLatencyMetrics(
			[
				event(1_100, 'run-start'),
				toolCall(5_000, 'tc-1', 'workspace_write_file'),
				toolResult(13_000, 'tc-1'),
				toolCall(13_500, 'tc-2', 'workspace_execute_command'),
				toolResult(14_000, 'tc-2'),
				toolCall(14_500, 'tc-3', DOMAIN_TOOL_IDS.BUILD_WORKFLOW),
				toolResult(16_000, 'tc-3', buildSuccess),
				event(20_000, 'run-finish', { status: 'completed' }),
			],
			SENT_AT,
		);

		expect(metrics).toEqual({
			firstWorkspaceToolMs: 8_000,
			timeToFirstWorkflowMs: 15_000,
			turnMs: 19_000,
			missing: [],
		});
	});

	it('records a missing workspace tool instead of dropping the run', () => {
		const metrics = computeLatencyMetrics(
			[event(20_000, 'run-finish', { status: 'completed' })],
			SENT_AT,
		);

		expect(metrics.firstWorkspaceToolMs).toBeNull();
		expect(metrics.timeToFirstWorkflowMs).toBeNull();
		expect(metrics.missing).toEqual(['no workspace tool call', 'no saved workflow']);
	});

	it('times the first successful save, not an earlier failed one', () => {
		const metrics = computeLatencyMetrics(
			[
				toolCall(5_000, 'tc-1', DOMAIN_TOOL_IDS.BUILD_WORKFLOW),
				toolResult(6_000, 'tc-1', { success: false, errors: ['bad'] }),
				toolCall(8_000, 'tc-2', DOMAIN_TOOL_IDS.BUILD_WORKFLOW),
				toolResult(9_000, 'tc-2', buildSuccess),
			],
			SENT_AT,
		);

		expect(metrics.timeToFirstWorkflowMs).toBe(8_000);
	});

	it('counts a failed workspace tool, since setup blocks it as well', () => {
		const metrics = computeLatencyMetrics(
			[
				toolCall(2_000, 'tc-1', 'workspace_read_file'),
				event(9_000, 'tool-error', { toolCallId: 'tc-1', error: 'not found' }),
			],
			SENT_AT,
		);

		expect(metrics.firstWorkspaceToolMs).toBe(7_000);
	});

	it('measures the first workspace tool to start, not the first to finish', () => {
		const metrics = computeLatencyMetrics(
			[
				toolCall(5_000, 'tc-1', 'workspace_write_file'),
				toolCall(6_000, 'tc-2', 'workspace_read_file'),
				toolResult(7_000, 'tc-2'),
				toolResult(13_000, 'tc-1'),
			],
			SENT_AT,
		);

		expect(metrics.firstWorkspaceToolMs).toBe(8_000);
	});

	it('times a save whose result carries the tool call id outside the payload', () => {
		const metrics = computeLatencyMetrics(
			[
				toolCall(5_000, 'tc-1', DOMAIN_TOOL_IDS.BUILD_WORKFLOW),
				{
					timestamp: 9_000,
					type: 'tool-result',
					data: { type: 'tool-result', toolCallId: 'tc-1', result: buildSuccess },
				},
			],
			SENT_AT,
		);

		expect(metrics.timeToFirstWorkflowMs).toBe(8_000);
	});

	it('ends the turn at the first confirmation request', () => {
		const metrics = computeLatencyMetrics(
			[
				event(12_000, 'confirmation-request', { requestId: 'req-1' }),
				event(30_000, 'run-finish', { status: 'completed' }),
			],
			SENT_AT,
		);

		expect(metrics.turnMs).toBe(11_000);
	});

	it('records a missing stop event', () => {
		const metrics = computeLatencyMetrics([event(2_000, 'run-start')], SENT_AT);

		expect(metrics.turnMs).toBeNull();
		expect(metrics.missing).toContain('no run-finish or confirmation-request');
	});
});
