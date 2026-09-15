import { builtTelemetry, fakeSpan, fakeTracer } from './support/fake-tracer';
import { AgentEvent } from '../../types/runtime/event';
import type { AgentEventData } from '../../types/runtime/event';
import type { RunOptions } from '../../types/sdk/agent';
import type { AgentDbMessage, AgentMessage } from '../../types/sdk/message';
import type { BuiltTelemetry } from '../../types/telemetry';
import type { AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';
import { EXPIRED_OFFLOADED_TOOL_RESULT } from '../tools/tool-result-guard';

const THREAD_ID = 'thread-1';
const RESOURCE_ID = 'user-1';
const PERSIST: RunOptions = { persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID } };

function userMsg(text: string): AgentMessage {
	return { role: 'user', content: [{ type: 'text', text }] };
}

function assistantMsg(text: string): AgentMessage {
	return { role: 'assistant', content: [{ type: 'text', text }] };
}

function buildOrchestrator(
	store?: InMemoryMemory,
	bus: AgentEventBus = new AgentEventBus(),
): MemoryOrchestrator {
	const config = { memory: store } as unknown as AgentRuntimeConfig;
	return new MemoryOrchestrator(
		config,
		new BackgroundTaskTracker(),
		bus,
		new RuntimeTelemetry(config),
	);
}

function textsOf(messages: AgentDbMessage[]): string[] {
	return messages.map((m) => {
		const [block] = (m as { content: Array<{ type: string; text: string }> }).content;
		return block.text;
	});
}

describe('MemoryOrchestrator.persistInputMessages', () => {
	it('persists only the input delta, not history or responses', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);
		list.addInput([userMsg('the user prompt')]);
		list.addResponse([userMsg('assistant reply')]);

		await buildOrchestrator(store).persistInputMessages(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['the user prompt']);
	});

	it('is a no-op when no persistence options are provided', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		await buildOrchestrator(store).persistInputMessages(list, undefined);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is a no-op when there is no memory store configured', async () => {
		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		// Should resolve without throwing even though there is nowhere to persist.
		await expect(
			buildOrchestrator(undefined).persistInputMessages(list, PERSIST),
		).resolves.toBeUndefined();
	});

	it('is a no-op when there are no input messages', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);

		await buildOrchestrator(store).persistInputMessages(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is idempotent with the end-of-turn save — one row per input id', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);
		list.addResponse([userMsg('assistant reply')]);

		const orchestrator = buildOrchestrator(store);
		// Eager save on receipt, then the normal end-of-turn save of the full delta.
		await orchestrator.persistInputMessages(list, PERSIST);
		await orchestrator.saveToMemory(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['the user prompt', 'assistant reply']);
		// The eagerly-saved input must be upserted, not duplicated.
		const inputId = list.inputDelta()[0].id;
		expect(persisted.filter((m) => m.id === inputId)).toHaveLength(1);
	});

	it('does not throw, and emits AgentEvent.Error, when the underlying save fails (best-effort)', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		vi.spyOn(store, 'saveMessages').mockRejectedValue(new Error('db down'));
		const bus = new AgentEventBus();
		const errors: AgentEventData[] = [];
		bus.on(AgentEvent.Error, (event) => errors.push(event));

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		// A transient persistence failure must not abort the turn, but is reported.
		await expect(
			buildOrchestrator(store, bus).persistInputMessages(list, PERSIST),
		).resolves.toBeUndefined();
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({ type: AgentEvent.Error, source: 'input-persistence' });
	});

	it('does not call describe() on the memory backend when telemetry is undefined', async () => {
		// Regression guard: a third-party BuiltMemory implementation is not
		// required to implement describe() (it's only otherwise used for schema
		// persistence) — memory access must stay telemetry-free by default.
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const describeSpy = vi.spyOn(store, 'describe').mockImplementation(() => {
			throw new Error('Method not implemented.');
		});

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		await buildOrchestrator(store).persistInputMessages(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['the user prompt']);
		expect(describeSpy).not.toHaveBeenCalled();
	});
});

describe('MemoryOrchestrator.persistTurnDelta', () => {
	it('persists the full turn delta (input + response), not history', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		await buildOrchestrator(store).persistTurnDelta(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['please build it', 'built the workflow']);
	});

	it('is a no-op when no persistence options are provided', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		await buildOrchestrator(store).persistTurnDelta(list, undefined);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is a no-op when there is no memory store configured', async () => {
		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		await expect(
			buildOrchestrator(undefined).persistTurnDelta(list, PERSIST),
		).resolves.toBeUndefined();
	});

	it('is a no-op when the turn delta is empty', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addHistory([{ id: 'h1', createdAt: new Date(2024, 0, 1), ...userMsg('old history') }]);

		await buildOrchestrator(store).persistTurnDelta(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(persisted).toEqual([]);
	});

	it('is idempotent with the end-of-turn save — one row per message id', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });

		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		const orchestrator = buildOrchestrator(store);
		// Save on suspend, then the end-of-turn save of the same delta after resume.
		await orchestrator.persistTurnDelta(list, PERSIST);
		await orchestrator.saveToMemory(list, PERSIST);

		const persisted = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
		expect(textsOf(persisted)).toEqual(['please build it', 'built the workflow']);
		const responseId = list.responseDelta()[0].id;
		expect(persisted.filter((m) => m.id === responseId)).toHaveLength(1);
	});

	it('does not throw, and emits AgentEvent.Error, when the underlying save fails (best-effort)', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		vi.spyOn(store, 'saveMessages').mockRejectedValue(new Error('db down'));
		const bus = new AgentEventBus();
		const errors: AgentEventData[] = [];
		bus.on(AgentEvent.Error, (event) => errors.push(event));

		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		// A transient persistence failure must not abort the suspend flow, but is reported.
		await expect(
			buildOrchestrator(store, bus).persistTurnDelta(list, PERSIST),
		).resolves.toBeUndefined();
		expect(errors).toHaveLength(1);
		expect(errors[0]).toMatchObject({ type: AgentEvent.Error, source: 'turn-delta-persistence' });
	});

	it.each(['persistTurnDelta', 'saveToMemory'] as const)(
		'sanitizes offloaded result locators for %s',
		async (method) => {
			const store = new InMemoryMemory();
			await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
			const runHash = 'a'.repeat(43);
			const envelope = (kind: 'result' | 'error' | 'message') => {
				const path = `tool-results/runs/${runHash}/${kind[0].repeat(43)}.${kind}.json`;
				return {
					_offloaded: true as const,
					path,
					originalCharCount: 100_000,
					estimatedTokenCount: 60_000,
					requiredAction: {
						toolName: 'workspace_read_tool_result' as const,
						input: { path, view: 'describe' as const },
					},
					message: 'Stored in workspace',
				};
			};
			const list = new AgentMessageList();
			list.addResponse([
				{
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'result-call',
							toolName: 'result-tool',
							input: {},
							state: 'resolved',
							output: envelope('result'),
						},
						{
							type: 'tool-call',
							toolCallId: 'content-result-call',
							toolName: 'content-result-tool',
							input: {},
							state: 'resolved',
							output: {
								type: 'content',
								value: [
									{ type: 'text', text: JSON.stringify(envelope('result')) },
									{
										type: 'file-data',
										data: 'base64-pdf',
										mediaType: 'application/pdf',
									},
								],
							},
						},
						{
							type: 'tool-call',
							toolCallId: 'error-call',
							toolName: 'error-tool',
							input: {},
							state: 'rejected',
							error: JSON.stringify(envelope('error')),
						},
						{ type: 'text', text: JSON.stringify(envelope('message')) },
					],
				},
			]);

			const orchestrator = buildOrchestrator(store);
			await orchestrator[method](list, PERSIST);

			const [persisted] = await store.getMessages(THREAD_ID, { resourceId: RESOURCE_ID });
			if (!persisted || !('content' in persisted)) throw new Error('Expected persisted message');
			expect(persisted.content).toEqual([
				expect.objectContaining({
					state: 'resolved',
					output: EXPIRED_OFFLOADED_TOOL_RESULT,
				}),
				expect.objectContaining({
					state: 'resolved',
					output: {
						type: 'content',
						value: [
							{
								type: 'text',
								text: JSON.stringify(EXPIRED_OFFLOADED_TOOL_RESULT),
							},
							{
								type: 'file-data',
								data: 'base64-pdf',
								mediaType: 'application/pdf',
							},
						],
					},
				}),
				expect.objectContaining({
					state: 'rejected',
					error: JSON.stringify(EXPIRED_OFFLOADED_TOOL_RESULT),
				}),
				{ type: 'text', text: JSON.stringify(EXPIRED_OFFLOADED_TOOL_RESULT) },
			]);
		},
	);
});

describe('MemoryOrchestrator save-path telemetry', () => {
	function buildOrchestratorWithTelemetry(
		store: InMemoryMemory,
		telemetry: BuiltTelemetry,
	): MemoryOrchestrator {
		const config = { name: 'my-agent', memory: store, telemetry } as unknown as AgentRuntimeConfig;
		return new MemoryOrchestrator(
			config,
			new BackgroundTaskTracker(),
			new AgentEventBus(),
			new RuntimeTelemetry(config),
		);
	}

	it('persistInputMessages opens a save_memory span with created operations for the input ids', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const span = fakeSpan();
		const telemetry = builtTelemetry({ tracer: fakeTracer(span) });

		const list = new AgentMessageList();
		list.addInput([userMsg('the user prompt')]);

		await buildOrchestratorWithTelemetry(store, telemetry).persistInputMessages(list, PERSIST);

		const inputId = list.inputDelta()[0].id;
		expect(span.setAttributes).toHaveBeenCalledWith(
			expect.objectContaining({
				'gen_ai.memory.ids': [inputId],
				'gen_ai.memory.operations': ['created'],
			}),
		);
	});

	it('saveToMemory opens a save_memory span with session/owner attributes', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
		const span = fakeSpan();
		const tracer = fakeTracer(span);
		const telemetry = builtTelemetry({ tracer });

		const list = new AgentMessageList();
		list.addInput([userMsg('please build it')]);
		list.addResponse([assistantMsg('built the workflow')]);

		await buildOrchestratorWithTelemetry(store, telemetry).saveToMemory(list, PERSIST);

		expect(tracer.startActiveSpan).toHaveBeenCalledWith(
			'save_memory',
			expect.objectContaining({
				attributes: expect.objectContaining({
					'gen_ai.operation.name': 'save_memory',
					'gen_ai.memory.types': ['session'],
					'gen_ai.memory.owners': [RESOURCE_ID],
				}),
			}),
			expect.anything(),
		);
	});
});
