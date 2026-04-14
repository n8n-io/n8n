import { extractOutcomeFromEvents, buildMetrics } from '../outcome/event-parser';
import type { CapturedEvent } from '../types';

// ---------------------------------------------------------------------------
// extractOutcomeFromEvents
// ---------------------------------------------------------------------------

describe('extractOutcomeFromEvents', () => {
	it('returns empty outcome for no events', () => {
		const result = extractOutcomeFromEvents([]);
		expect(result.workflowIds).toEqual([]);
		expect(result.executionIds).toEqual([]);
		expect(result.dataTableIds).toEqual([]);
		expect(result.finalText).toBe('');
		expect(result.toolCalls).toEqual([]);
		expect(result.agentActivities).toEqual([]);
	});

	it('collects text from text-delta events', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1000, type: 'text-delta', data: { type: 'text-delta', text: 'Hello ' } },
			{ timestamp: 1001, type: 'text-delta', data: { type: 'text-delta', text: 'World' } },
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.finalText).toBe('Hello World');
	});

	it('extracts text from payload field', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'text-delta',
				data: { type: 'text-delta', payload: { text: 'nested text' } },
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.finalText).toBe('nested text');
	});

	it('tracks tool calls with duration', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						args: { name: 'Test' },
					},
				},
			},
			{
				timestamp: 1500,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'build-workflow',
						result: { workflowId: 'wf-123' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0].toolName).toBe('build-workflow');
		expect(result.toolCalls[0].durationMs).toBe(500);
		expect(result.workflowIds).toContain('wf-123');
	});

	it('extracts workflow IDs from known tool results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'submit-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-1', result: { id: 'wf-456' } },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.workflowIds).toContain('wf-456');
	});

	it('extracts execution IDs from run-workflow results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'run-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'run-workflow',
						result: { executionId: 'exec-789' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.executionIds).toContain('exec-789');
	});

	it('extracts data table IDs from create-data-table results', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'create-data-table', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: {
						toolCallId: 'tc-1',
						toolName: 'create-data-table',
						result: { dataTableId: 'dt-001' },
					},
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.dataTableIds).toContain('dt-001');
	});

	it('captures tool errors', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-err', toolName: 'build-workflow', args: {} },
				},
			},
			{
				timestamp: 1200,
				type: 'tool-error',
				data: {
					type: 'tool-error',
					payload: { toolCallId: 'tc-err', error: 'Something went wrong' },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.toolCalls).toHaveLength(1);
		expect(result.toolCalls[0].error).toBe('Something went wrong');
		expect(result.toolCalls[0].durationMs).toBe(200);
	});

	it('tracks agent activities', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'agent-spawned',
				data: {
					type: 'agent-spawned',
					agentId: 'agent-1',
					payload: { agentId: 'agent-1', role: 'builder', parentId: 'root' },
				},
			},
			{
				timestamp: 2000,
				type: 'agent-completed',
				data: {
					type: 'agent-completed',
					agentId: 'agent-1',
					payload: { agentId: 'agent-1', status: 'completed', result: 'Done' },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.agentActivities).toHaveLength(1);
		expect(result.agentActivities[0].role).toBe('builder');
		expect(result.agentActivities[0].status).toBe('completed');
	});

	it('deduplicates resource IDs', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1000,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-1', toolName: 'build-workflow', args: {} },
				},
			},
			{
				timestamp: 1100,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-1', result: { workflowId: 'wf-1' } },
				},
			},
			{
				timestamp: 1200,
				type: 'tool-call',
				data: {
					type: 'tool-call',
					payload: { toolCallId: 'tc-2', toolName: 'patch-workflow', args: {} },
				},
			},
			{
				timestamp: 1300,
				type: 'tool-result',
				data: {
					type: 'tool-result',
					payload: { toolCallId: 'tc-2', result: { workflowId: 'wf-1' } },
				},
			},
		];

		const result = extractOutcomeFromEvents(events);
		expect(result.workflowIds).toEqual(['wf-1']);
	});
});

// ---------------------------------------------------------------------------
// buildMetrics
// ---------------------------------------------------------------------------

describe('buildMetrics', () => {
	const startTime = 1000;

	it('returns zero metrics for no events', () => {
		const metrics = buildMetrics([], startTime);
		expect(metrics.totalTimeMs).toBe(0);
		expect(metrics.timeToFirstTextMs).toBe(0);
		expect(metrics.timeToRunFinishMs).toBe(0);
		expect(metrics.totalToolCalls).toBe(0);
		expect(metrics.subAgentsSpawned).toBe(0);
		expect(metrics.confirmationRequests).toBe(0);
	});

	it('computes time to first text', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1500, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 2000, type: 'text-delta', data: { type: 'text-delta', text: 'hi' } },
			{ timestamp: 2500, type: 'text-delta', data: { type: 'text-delta', text: ' there' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.timeToFirstTextMs).toBe(1000); // 2000 - 1000
	});

	it('counts tool calls', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 1200, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 1300, type: 'tool-call', data: { type: 'tool-call' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.totalToolCalls).toBe(3);
	});

	it('counts sub-agents spawned', () => {
		const events: CapturedEvent[] = [
			{
				timestamp: 1100,
				type: 'agent-spawned',
				data: { type: 'agent-spawned', agentId: 'a1', payload: { agentId: 'a1', role: 'builder' } },
			},
			{
				timestamp: 1200,
				type: 'agent-spawned',
				data: {
					type: 'agent-spawned',
					agentId: 'a2',
					payload: { agentId: 'a2', role: 'researcher' },
				},
			},
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.subAgentsSpawned).toBe(2);
	});

	it('counts confirmation requests', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'confirmation-request', data: { type: 'confirmation-request' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.confirmationRequests).toBe(1);
	});

	it('captures time to run finish', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 3000, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.timeToRunFinishMs).toBe(2000); // 3000 - 1000
	});

	it('computes total time from last event', () => {
		const events: CapturedEvent[] = [
			{ timestamp: 1100, type: 'tool-call', data: { type: 'tool-call' } },
			{ timestamp: 5000, type: 'run-finish', data: { type: 'run-finish' } },
		];

		const metrics = buildMetrics(events, startTime);
		expect(metrics.totalTimeMs).toBe(4000); // 5000 - 1000
	});
});
