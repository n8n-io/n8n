import { ExecutionRecorder } from '../execution-recorder';
import type { StreamChunk } from '@n8n/agents';

function makeToolCallChunk(toolName: string, input: unknown, toolCallId = 'tc1'): StreamChunk {
	return { type: 'tool-call', toolCallId, toolName, input } satisfies StreamChunk;
}

function makeToolResultChunk(toolName: string, output: unknown, toolCallId = 'tc1'): StreamChunk {
	return { type: 'tool-result', toolCallId, toolName, output } satisfies StreamChunk;
}

describe('ExecutionRecorder', () => {
	describe('timeline ordering', () => {
		it('captures text → tool call → text in order', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Let me check' });
			recorder.record(makeToolCallChunk('lookup', { query: 'test' }));
			recorder.record(makeToolResultChunk('lookup', { found: true }));
			recorder.record({ type: 'text-delta', id: 't2', delta: 'Here are the results' });
			recorder.record({
				type: 'finish',
				finishReason: 'stop',
			} as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(record.timeline).toHaveLength(3);
			expect(record.timeline[0].type).toBe('text');
			expect(record.timeline[1].type).toBe('tool-call');
			expect(record.timeline[2].type).toBe('text');

			if (record.timeline[0].type === 'text') {
				expect(record.timeline[0].content).toBe('Let me check');
			}
			if (record.timeline[1].type === 'tool-call') {
				expect(record.timeline[1].name).toBe('lookup');
				expect(record.timeline[1].output).toEqual({ found: true });
				expect(record.timeline[1].success).toBe(true);
			}
			if (record.timeline[2].type === 'text') {
				expect(record.timeline[2].content).toBe('Here are the results');
			}
		});

		it('captures multiple tool calls between text segments', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Checking...' });
			recorder.record(makeToolCallChunk('tool_a', {}, 'a1'));
			recorder.record(makeToolResultChunk('tool_a', 'result_a', 'a1'));
			recorder.record(makeToolCallChunk('tool_b', {}, 'b1'));
			recorder.record(makeToolResultChunk('tool_b', 'result_b', 'b1'));
			recorder.record({ type: 'text-delta', id: 't2', delta: 'Done' });
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(record.timeline).toHaveLength(4);
			expect(record.timeline.map((e) => e.type)).toEqual([
				'text',
				'tool-call',
				'tool-call',
				'text',
			]);
		});

		it('does not create empty text events for whitespace-only segments', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: '   ' });
			recorder.record(makeToolCallChunk('lookup', {}));
			recorder.record(makeToolResultChunk('lookup', {}));
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();
			const textEvents = record.timeline.filter((e) => e.type === 'text');
			expect(textEvents).toHaveLength(0);
		});
	});

	describe('working memory capture', () => {
		it('captures working-memory-update as a timeline event', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Hello' });
			recorder.record({ type: 'working-memory-update', content: '# Name: Alice' });
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(record.workingMemory).toBe('# Name: Alice');
			expect(record.timeline.some((e) => e.type === 'working-memory')).toBe(true);
		});

		it('keeps last working memory when multiple updates occur', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'working-memory-update', content: 'first' });
			recorder.record({ type: 'working-memory-update', content: 'second' });
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();
			expect(record.workingMemory).toBe('second');
		});
	});

	describe('suspension', () => {
		it('records suspension as a timeline event', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Choose an option' });
			recorder.record({
				type: 'tool-call-suspended',
				toolName: 'rich_interaction',
				toolCallId: 'tc1',
			} as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(recorder.suspended).toBe(true);
			expect(record.timeline.some((e) => e.type === 'suspension')).toBe(true);
		});
	});

	describe('backward compat', () => {
		it('still populates flat toolCalls array', () => {
			const recorder = new ExecutionRecorder();

			recorder.record(makeToolCallChunk('my_tool', { x: 1 }));
			recorder.record(makeToolResultChunk('my_tool', { y: 2 }));
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(record.toolCalls).toHaveLength(1);
			expect(record.toolCalls[0]).toEqual({
				name: 'my_tool',
				input: { x: 1 },
				output: { y: 2 },
			});
		});

		it('still concatenates assistantResponse from all text deltas', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Hello ' });
			recorder.record(makeToolCallChunk('tool', {}));
			recorder.record(makeToolResultChunk('tool', {}));
			recorder.record({ type: 'text-delta', id: 't2', delta: 'world' });
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();
			expect(record.assistantResponse).toBe('Hello world');
		});
	});
});
