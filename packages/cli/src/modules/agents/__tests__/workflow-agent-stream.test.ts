import { SKILL_LOAD_TOOL_NAME, type StreamChunk } from '@n8n/agents';
import type { IWorkflowExecuteAdditionalData } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	createWorkflowAgentStreamObserver,
	WorkflowAgentStreamAdapter,
	type WorkflowAgentStreamObserver,
} from '../workflow-agent-stream';

function observerMock() {
	return vi.fn<WorkflowAgentStreamObserver>().mockResolvedValue(undefined);
}

async function observeChunks(adapter: WorkflowAgentStreamAdapter, chunks: StreamChunk[]) {
	for (const chunk of chunks) await adapter.observe(chunk);
}

describe('WorkflowAgentStreamAdapter', () => {
	it('maps text segments and drops empty deltas', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		await observeChunks(adapter, [
			{ type: 'text-start', id: 'text-1' },
			{ type: 'text-delta', id: 'text-1', delta: '' },
			{ type: 'text-delta', id: 'text-1', delta: 'Hello' },
			{ type: 'text-end', id: 'text-1' },
		]);

		expect(observer.mock.calls.map(([event]) => event)).toEqual([
			{ type: 'response-begin' },
			{ type: 'response-delta', delta: 'Hello' },
			{ type: 'response-end' },
		]);
	});

	it('synthesizes a begin and closes an open segment before a new text id', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		await observeChunks(adapter, [
			{ type: 'text-delta', id: 'text-1', delta: 'Before' },
			{ type: 'text-delta', id: 'text-2', delta: 'After' },
			{ type: 'finish', finishReason: 'stop' },
		]);

		expect(observer.mock.calls.map(([event]) => event)).toEqual([
			{ type: 'response-begin' },
			{ type: 'response-delta', delta: 'Before' },
			{ type: 'response-end' },
			{ type: 'response-begin' },
			{ type: 'response-delta', delta: 'After' },
			{ type: 'response-end' },
		]);
	});

	it('abandons an open segment on failure without emitting a response error', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		adapter.fail();
		await adapter.observe({ type: 'text-start', id: 'text-1' });
		adapter.fail();
		adapter.fail();
		await adapter.observe({ type: 'finish', finishReason: 'error' });

		expect(observer.mock.calls.map(([event]) => event)).toEqual([{ type: 'response-begin' }]);
	});

	it('drops reasoning, tool-input, sub-agent, step, message, warning, and suspension events', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);
		const ignoredChunks = [
			{ type: 'reasoning-start', id: 'reason-1' },
			{ type: 'reasoning-delta', id: 'reason-1', delta: 'private thought' },
			{ type: 'reasoning-end', id: 'reason-1' },
			{ type: 'tool-input-start', toolCallId: 'tc-1', toolName: 'lookup' },
			{ type: 'tool-input-delta', toolCallId: 'tc-1', delta: 'secret input' },
			{ type: 'subagent-started', taskName: 'child' },
			{
				type: 'subagent-chunk',
				parentToolCallId: 'tc-child',
				chunk: { type: 'text-delta', id: 'child-text', delta: 'child response' },
			},
			{ type: 'subagent-completed', taskName: 'child' },
			{ type: 'start-step' },
			{ type: 'finish-step' },
			{ type: 'message', message: { role: 'assistant', content: 'private message' } },
			{ type: 'warning', message: 'warning' },
			{ type: 'tool-call-suspended', runId: 'run-1', toolCallId: 'tc-1' },
		] as StreamChunk[];

		await observeChunks(adapter, ignoredChunks);

		expect(observer).not.toHaveBeenCalled();
	});

	it('tracks concurrent calls to the same tool by call id', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		await observeChunks(adapter, [
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: { secret: 'one' } },
			{ type: 'tool-call', toolCallId: 'tc-2', toolName: 'lookup', input: { secret: 'two' } },
			{ type: 'tool-execution-start', toolCallId: 'tc-1', toolName: 'lookup', startTime: 1 },
			{ type: 'tool-execution-start', toolCallId: 'tc-2', toolName: 'lookup', startTime: 2 },
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				isError: false,
				endTime: 3,
			},
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-2',
				toolName: 'lookup',
				isError: true,
				endTime: 4,
			},
		]);

		expect(observer.mock.calls.map(([event]) => event)).toEqual([
			{
				type: 'capability-start',
				toolCallId: 'tc-1',
				capability: { kind: 'tool', name: 'lookup' },
			},
			{
				type: 'capability-start',
				toolCallId: 'tc-2',
				capability: { kind: 'tool', name: 'lookup' },
			},
			{
				type: 'capability-end',
				toolCallId: 'tc-1',
				capability: { kind: 'tool', name: 'lookup' },
				status: 'succeeded',
			},
			{
				type: 'capability-end',
				toolCallId: 'tc-2',
				capability: { kind: 'tool', name: 'lookup' },
				status: 'failed',
			},
		]);
	});

	it.each([
		[
			'by id',
			{ skillId: 'skill-1', name: 'Research', filePath: 'references/api.md' },
			{ kind: 'skill', id: 'skill-1', name: 'Research' },
		],
		['by name', { name: 'Research' }, { kind: 'skill', name: 'Research' }],
	] as const)('resolves a loaded skill %s', async (_label, input, capability) => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		await observeChunks(adapter, [
			{ type: 'tool-call', toolCallId: 'tc-skill', toolName: SKILL_LOAD_TOOL_NAME, input },
			{
				type: 'tool-execution-start',
				toolCallId: 'tc-skill',
				toolName: SKILL_LOAD_TOOL_NAME,
				startTime: 1,
			},
		]);

		expect(observer).toHaveBeenCalledWith({
			type: 'capability-start',
			toolCallId: 'tc-skill',
			capability,
		});
	});

	it('uses tool-result as a terminal fallback without emitting a duplicate end', async () => {
		const observer = observerMock();
		const adapter = new WorkflowAgentStreamAdapter(observer);

		await observeChunks(adapter, [
			{ type: 'tool-call', toolCallId: 'tc-1', toolName: 'lookup', input: {} },
			{ type: 'tool-execution-start', toolCallId: 'tc-1', toolName: 'lookup', startTime: 1 },
			{ type: 'tool-result', toolCallId: 'tc-1', toolName: 'lookup', output: { secret: true } },
			{
				type: 'tool-execution-end',
				toolCallId: 'tc-1',
				toolName: 'lookup',
				isError: false,
				endTime: 2,
			},
		]);

		expect(observer.mock.calls.map(([event]) => event.type)).toEqual([
			'capability-start',
			'capability-end',
		]);
		expect(JSON.stringify(observer.mock.calls)).not.toContain('secret');
	});
});

describe('createWorkflowAgentStreamObserver', () => {
	const invocation = {
		nodeId: 'node-1',
		nodeName: 'Message an Agent',
		runIndex: 2,
		itemIndex: 3,
	};

	it('maps response events to the standard response chunk callback', async () => {
		const sendResponseChunk = vi.fn().mockResolvedValue(undefined);
		const observer = createWorkflowAgentStreamObserver({
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			executionId: 'exec-1',
			invocation: { ...invocation, sendResponseChunk },
		});

		await observer({ type: 'response-begin' });
		await observer({ type: 'response-delta', delta: 'hello' });
		await observer({ type: 'response-end' });

		expect(sendResponseChunk.mock.calls).toEqual([['begin'], ['item', 'hello'], ['end']]);
	});

	it('sends minimal ordered progress payloads without tool input or output', async () => {
		const sendDataToUI = vi.fn();
		const observer = createWorkflowAgentStreamObserver({
			additionalData: mock<IWorkflowExecuteAdditionalData>({ sendDataToUI }),
			executionId: 'exec-1',
			invocation,
		});

		await observer({
			type: 'capability-start',
			toolCallId: 'tc-1',
			capability: { kind: 'tool', name: 'lookup' },
		});
		await observer({
			type: 'capability-end',
			toolCallId: 'tc-1',
			capability: { kind: 'tool', name: 'lookup' },
			status: 'succeeded',
		});

		expect(sendDataToUI.mock.calls).toEqual([
			[
				'agentNodeProgress',
				{
					executionId: 'exec-1',
					nodeId: 'node-1',
					nodeName: 'Message an Agent',
					runIndex: 2,
					itemIndex: 3,
					sequenceNumber: 0,
					toolCallId: 'tc-1',
					capability: { kind: 'tool', name: 'lookup' },
					status: 'running',
				},
			],
			[
				'agentNodeProgress',
				{
					executionId: 'exec-1',
					nodeId: 'node-1',
					nodeName: 'Message an Agent',
					runIndex: 2,
					itemIndex: 3,
					sequenceNumber: 1,
					toolCallId: 'tc-1',
					capability: { kind: 'tool', name: 'lookup' },
					status: 'succeeded',
				},
			],
		]);
		expect(JSON.stringify(sendDataToUI.mock.calls)).not.toContain('input');
		expect(JSON.stringify(sendDataToUI.mock.calls)).not.toContain('output');
	});

	it('does not require a response callback or an editor push connection', async () => {
		const observer = createWorkflowAgentStreamObserver({
			additionalData: mock<IWorkflowExecuteAdditionalData>(),
			executionId: 'exec-1',
			invocation,
		});

		await expect(observer({ type: 'response-delta', delta: 'ignored' })).resolves.toBeUndefined();
		await expect(
			observer({
				type: 'capability-start',
				toolCallId: 'tc-1',
				capability: { kind: 'tool', name: 'lookup' },
			}),
		).resolves.toBeUndefined();
	});
});
