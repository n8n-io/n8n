import { ExecutionRecorder } from '../execution-recorder';
import type { BuiltTool, StreamChunk } from '@n8n/agents';
import { buildToolRegistry } from '../tool-registry';

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
		it('captures the working-memory tool call as a timeline event', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({ type: 'text-delta', id: 't1', delta: 'Hello' });
			recorder.record({
				type: 'tool-call',
				toolCallId: 'wm-1',
				toolName: 'update_working_memory',
				input: { memory: '# Name: Alice' },
			} as StreamChunk);
			recorder.record({
				type: 'tool-result',
				toolCallId: 'wm-1',
				toolName: 'update_working_memory',
				output: { success: true },
			} as StreamChunk);
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();

			expect(record.workingMemory).toBe('# Name: Alice');
			expect(record.toolCalls).toEqual([]);
			expect(record.timeline.some((e) => e.type === 'working-memory')).toBe(true);
		});

		it('keeps last working memory when multiple updates occur', () => {
			const recorder = new ExecutionRecorder();

			recorder.record({
				type: 'tool-call',
				toolCallId: 'wm-1',
				toolName: 'update_working_memory',
				input: { memory: 'first' },
			} as StreamChunk);
			recorder.record({
				type: 'tool-call',
				toolCallId: 'wm-2',
				toolName: 'update_working_memory',
				input: { memory: 'second' },
			} as StreamChunk);
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

	describe('display-only rich_interaction', () => {
		it('records the standard tool-call/tool-result pair with displayOnly marker', () => {
			const recorder = new ExecutionRecorder();

			const cardPayload = {
				components: [{ type: 'image', url: 'https://media.giphy.com/x.gif', alt: 'gif' }],
			};

			// Display-only rich_interaction emits no special framework chunk:
			// the LLM calls the tool, the handler returns `{ displayOnly: true }`
			// (which is what gets recorded), and the bridge handles rendering.
			recorder.record(makeToolCallChunk('rich_interaction', cardPayload, 'tc1'));
			recorder.record(makeToolResultChunk('rich_interaction', { displayOnly: true }, 'tc1'));
			recorder.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

			const record = recorder.getMessageRecord();

			const toolEvents = record.timeline.filter((e) => e.type === 'tool-call');
			expect(toolEvents).toHaveLength(1);
			if (toolEvents[0].type === 'tool-call') {
				expect(toolEvents[0].toolCallId).toBe('tc1');
				expect(toolEvents[0].input).toEqual(cardPayload);
				expect(toolEvents[0].output).toEqual({ displayOnly: true });
				expect(toolEvents[0].success).toBe(true);
			}

			expect(record.toolCalls).toHaveLength(1);
			expect(record.toolCalls[0]).toEqual({
				name: 'rich_interaction',
				input: cardPayload,
				output: { displayOnly: true },
			});
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

function wfTool(name: string, id: string, wfName: string, trigger = 'manual'): BuiltTool {
	return {
		name,
		metadata: { kind: 'workflow', workflowId: id, workflowName: wfName, triggerType: trigger },
	} as unknown as BuiltTool;
}

function nodeTool(
	name: string,
	nodeType: string,
	nodeParameters: Record<string, unknown>,
): BuiltTool {
	return {
		name,
		metadata: { kind: 'node', nodeType, nodeTypeVersion: 1, displayName: name, nodeParameters },
	} as unknown as BuiltTool;
}

describe('ExecutionRecorder — node-tool $fromAI resolution', () => {
	it('substitutes a full-string $fromAI expression with the LLM-provided value', () => {
		const registry = buildToolRegistry([
			nodeTool('generate_image', '@n8n/n8n-nodes-langchain.openAi', {
				resource: 'image',
				operation: 'generate',
				prompt: "={{ $fromAI('prompt', 'Image description', 'string') }}",
			}),
		]);
		const rec = new ExecutionRecorder(registry);

		rec.record({
			type: 'tool-call',
			toolCallId: 't1',
			toolName: 'generate_image',
			input: { prompt: 'a rolling landscape' },
		} as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'generate_image',
			output: { status: 'success' },
		} as never);

		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect(tc.kind).toBe('node');
		expect(tc.nodeParameters).toEqual({
			resource: 'image',
			operation: 'generate',
			prompt: 'a rolling landscape',
		});
	});

	it('falls back to the $fromAI default when the LLM did not provide the key', () => {
		const registry = buildToolRegistry([
			nodeTool('send_message', 'n8n-nodes-base.slack', {
				channel: "={{ $fromAI('channel', 'Channel name', 'string', 'general') }}",
			}),
		]);
		const rec = new ExecutionRecorder(registry);

		rec.record({
			type: 'tool-call',
			toolCallId: 't1',
			toolName: 'send_message',
			input: {},
		} as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'send_message',
			output: { ok: true },
		} as never);

		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect((tc.nodeParameters as Record<string, unknown>).channel).toBe('general');
	});

	it('substitutes $fromAI inside an auto-generated-marker template', () => {
		const registry = buildToolRegistry([
			nodeTool('search', 'n8n-nodes-base.http', {
				url: "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('query', 'Search term', 'string') }}",
			}),
		]);
		const rec = new ExecutionRecorder(registry);

		rec.record({
			type: 'tool-call',
			toolCallId: 't1',
			toolName: 'search',
			input: { query: 'dragons' },
		} as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'search',
			output: { ok: true },
		} as never);

		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect((tc.nodeParameters as Record<string, unknown>).url).toBe('dragons');
	});

	it('walks nested objects in nodeParameters and resolves each $fromAI', () => {
		const registry = buildToolRegistry([
			nodeTool('image', '@n8n/n8n-nodes-langchain.openAi', {
				options: {
					size: "={{ $fromAI('size', 'Image size', 'string', '1024x1024') }}",
					nested: { nested2: "={{ $fromAI('quality', 'Quality', 'string', 'medium') }}" },
				},
			}),
		]);
		const rec = new ExecutionRecorder(registry);

		rec.record({
			type: 'tool-call',
			toolCallId: 't1',
			toolName: 'image',
			input: { size: '512x512', quality: 'high' },
		} as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'image',
			output: { ok: true },
		} as never);

		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		const params = tc.nodeParameters as Record<string, Record<string, unknown>>;
		expect(params.options.size).toBe('512x512');
		expect((params.options.nested as Record<string, unknown>).nested2).toBe('high');
	});

	it('leaves the raw template in place when extraction fails', () => {
		const registry = buildToolRegistry([
			nodeTool('broken', 'n8n-nodes-base.set', {
				field: '={{ $fromAI(unbalanced ',
			}),
		]);
		const rec = new ExecutionRecorder(registry);

		rec.record({
			type: 'tool-call',
			toolCallId: 't1',
			toolName: 'broken',
			input: {},
		} as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'broken',
			output: { ok: true },
		} as never);

		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect((tc.nodeParameters as Record<string, unknown>).field).toBe('={{ $fromAI(unbalanced ');
	});
});

describe('ExecutionRecorder — workflow-tool timeline tags', () => {
	it('tags a tool-call entry as kind:tool when no registry is provided', () => {
		const rec = new ExecutionRecorder();
		rec.record({ type: 'tool-call', toolCallId: 't1', toolName: 'http', input: {} } as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'http',
			output: { ok: true },
			isError: false,
		} as never);
		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect(tc.kind).toBe('tool');
		expect(tc.workflowId).toBeUndefined();
	});

	it('tags a tool-call as kind:workflow and stores workflowId/Name/triggerType when registry matches', () => {
		const registry = buildToolRegistry([wfTool('run-wf', 'wf-1', 'Run WF')]);
		const rec = new ExecutionRecorder(registry);
		rec.record({ type: 'tool-call', toolCallId: 't1', toolName: 'run-wf', input: {} } as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'run-wf',
			output: { executionId: 'e-42', status: 'success' },
			isError: false,
		} as never);
		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect(tc.kind).toBe('workflow');
		expect(tc.workflowId).toBe('wf-1');
		expect(tc.workflowName).toBe('Run WF');
		expect(tc.triggerType).toBe('manual');
		expect(tc.workflowExecutionId).toBe('e-42');
	});

	it('leaves workflowExecutionId undefined for form-trigger workflow tools', () => {
		const registry = buildToolRegistry([wfTool('fill-form', 'wf-2', 'Fill Form', 'form')]);
		const rec = new ExecutionRecorder(registry);
		rec.record({ type: 'tool-call', toolCallId: 't1', toolName: 'fill-form', input: {} } as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'fill-form',
			output: { status: 'form_link_sent', formUrl: 'https://x/form' },
			isError: false,
		} as never);
		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect(tc.kind).toBe('workflow');
		expect(tc.triggerType).toBe('form');
		expect(tc.workflowExecutionId).toBeUndefined();
	});

	it('synthesizes a tool-call timeline entry when tool-result arrives without a preceding tool-call', () => {
		const registry = buildToolRegistry([wfTool('run-wf', 'wf-1', 'Run WF')]);
		const rec = new ExecutionRecorder(registry);

		// HITL/approval resume: SDK replays the result without a tool-call chunk
		rec.record({
			type: 'tool-result',
			toolCallId: 't-resume',
			toolName: 'run-wf',
			output: { executionId: 'e-99', status: 'success' },
			isError: false,
		} as never);
		rec.record({ type: 'finish', finishReason: 'stop' } as StreamChunk);

		const record = rec.getMessageRecord();
		const tc = record.timeline.find((e) => e.type === 'tool-call');

		expect(tc).toBeDefined();
		expect(tc?.kind).toBe('workflow');
		expect(tc?.name).toBe('run-wf');
		expect(tc?.toolCallId).toBe('t-resume');
		expect(tc?.workflowId).toBe('wf-1');
		expect(tc?.workflowName).toBe('Run WF');
		expect(tc?.workflowExecutionId).toBe('e-99');
		expect(tc?.success).toBe(true);
		expect(record.toolCalls).toHaveLength(1);
		expect(record.toolCalls[0]).toEqual({
			name: 'run-wf',
			input: undefined,
			output: { executionId: 'e-99', status: 'success' },
		});
	});

	it('leaves workflowExecutionId undefined when the output is an error with no executionId', () => {
		const registry = buildToolRegistry([wfTool('run-wf', 'wf-1', 'Run WF')]);
		const rec = new ExecutionRecorder(registry);
		rec.record({ type: 'tool-call', toolCallId: 't1', toolName: 'run-wf', input: {} } as never);
		rec.record({
			type: 'tool-result',
			toolCallId: 't1',
			toolName: 'run-wf',
			output: { error: 'Kaboom' },
			isError: true,
		} as never);
		const tc = rec.getMessageRecord().timeline.find((e) => e.type === 'tool-call')!;
		expect(tc.workflowExecutionId).toBeUndefined();
		expect(tc.success).toBe(false);
	});
});
