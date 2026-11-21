import type { LanguageModelV2, LanguageModelV2CallOptions } from '@ai-sdk/provider';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Agent } from '../../sdk/agent';
import { Memory } from '../../sdk/memory';
import { Tool } from '../../sdk/tool';
import type { AgentDbMessage } from '../../types/sdk/message';
import { AgentRuntime, type AgentRuntimeConfig } from '../loop/agent-runtime';
import { MemoryOrchestrator } from '../memory/memory-orchestrator';
import { InMemoryMemory } from '../memory/memory-store';
import { AgentMessageList, MODEL_SWITCH_CONTINUATION_REMINDER } from '../model/message-list';
import { BackgroundTaskTracker } from '../state/background-task-tracker';
import { AgentEventBus } from '../state/event-bus';
import { RuntimeTelemetry } from '../telemetry/runtime-telemetry';

const THREAD_ID = 'thread-switch-1';
const RESOURCE_ID = 'user-1';

function createMockLanguageModel(
	provider: string,
	modelId: string,
	responses: Array<{
		text?: string;
		toolCalls?: Array<{ toolCallId: string; toolName: string; input: string }>;
		reasoning?: { text: string; providerMetadata?: Record<string, Record<string, unknown>> };
	}>,
) {
	const calls: LanguageModelV2CallOptions[] = [];
	let callIndex = 0;

	const model: LanguageModelV2 = {
		specificationVersion: 'v2',
		provider,
		modelId,
		supportedUrls: {},
		doGenerate: vi.fn(async (options: LanguageModelV2CallOptions) => {
			calls.push(options);
			const next = responses[Math.min(callIndex++, responses.length - 1)];
			const content: Array<Record<string, unknown>> = [];

			if (next.reasoning) {
				content.push({
					type: 'reasoning',
					text: next.reasoning.text,
					...(next.reasoning.providerMetadata
						? { providerMetadata: next.reasoning.providerMetadata }
						: {}),
				});
			}

			if (next.text) {
				content.push({ type: 'text', text: next.text });
			}

			for (const tc of next.toolCalls ?? []) {
				content.push({
					type: 'tool-call',
					toolCallId: tc.toolCallId,
					toolName: tc.toolName,
					input: tc.input,
				});
			}

			return {
				content,
				finishReason: next.toolCalls?.length ? 'tool-calls' : 'stop',
				usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
				warnings: [],
			} as unknown as Awaited<ReturnType<LanguageModelV2['doGenerate']>>;
		}),
		doStream: vi.fn(),
	};

	return { model, calls };
}

function makeForeignAssistantMessage(
	id: string,
	createdAt: Date,
	overrides: Partial<Extract<AgentDbMessage, { role: 'assistant' }>> = {},
): AgentDbMessage {
	return {
		id,
		createdAt,
		role: 'assistant',
		model: 'anthropic/claude-sonnet-5-5',
		content: [
			{
				type: 'reasoning',
				text: 'searching',
				providerMetadata: { anthropic: { signature: 'sig-abc' } },
			},
			{
				type: 'tool-call',
				toolCallId: 'srvtoolu_1',
				toolName: 'anthropic.web_search_20250305',
				input: { query: 'inline validation' },
				providerExecuted: true,
				state: 'resolved',
				output: { summary: 'Show errors on blur.' },
			},
			{ type: 'text', text: 'Use on-blur inline validation.' },
		],
		...overrides,
	};
}

async function seedThread(store: InMemoryMemory, messages: AgentDbMessage[]): Promise<void> {
	await store.saveThread({ id: THREAD_ID, resourceId: RESOURCE_ID });
	await store.saveMessages({ threadId: THREAD_ID, resourceId: RESOURCE_ID, messages });
}

describe('Model-switch observational memory compaction and fallback', () => {
	it('compacts incompatible foreign-model history synchronously before calling the new model', async () => {
		const store = new InMemoryMemory();
		const t1 = new Date('2026-10-01T10:00:00Z');
		const t2 = new Date('2026-10-01T10:00:01Z');
		await seedThread(store, [
			{
				id: 'm-user-1',
				createdAt: t1,
				role: 'user',
				content: [{ type: 'text', text: 'How should I handle inline form validation?' }],
			},
			makeForeignAssistantMessage('m-asst-1', t2),
		]);

		const observe = vi.fn(
			async () =>
				'* CRITICAL (10:00) User asked about inline form validation; web search recommended showing errors on blur.',
		);
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Here is how to apply on-blur validation.' },
		]);

		const agent = new Agent('researcher')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		const result = await agent.generate('Now add accessibility guidance.', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(result.finishReason).toBe('stop');
		expect(observe).toHaveBeenCalledTimes(1);
		expect(observe.mock.calls[0][0].transcript).toContain('anthropic.web_search_20250305');
		expect(observe.mock.calls[0][0].transcript).not.toContain('sig-abc');

		// New model receives observations and ONLY the new user message (no foreign assistant messages).
		expect(gemini.calls).toHaveLength(1);
		const prompt = gemini.calls[0].prompt;
		const nonSystem = prompt.filter((m) => m.role !== 'system');
		const renderedPrompt = JSON.stringify(prompt);

		expect(renderedPrompt).toContain('<observations>');
		expect(renderedPrompt).toContain('showing errors on blur');
		expect(nonSystem).toHaveLength(1);
		expect(nonSystem[0].role).toBe('user');

		// Cursor moved past the foreign assistant message and new assistant reply is stamped with the new model.
		const cursor = await store.getCursor(THREAD_ID);
		expect(cursor?.lastObservedMessageId).toBe('m-asst-1');

		const savedAssistant = result.messages.find(
			(m): m is Extract<AgentDbMessage, { role: 'assistant' }> =>
				'role' in m && m.role === 'assistant',
		);
		expect(savedAssistant?.model).toBe('google/gemini-3-flash');
	});

	it('skips compaction when switching models on plain-text-only history', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Hello' }],
			},
			{
				id: 'm-2',
				createdAt: new Date('2026-10-01T10:00:01Z'),
				role: 'assistant',
				model: 'anthropic/claude-sonnet-5-5',
				content: [{ type: 'text', text: 'Hi! How can I help?' }],
			},
		]);

		const observe = vi.fn(async () => '* INFO (10:00) Greeting');
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Sure thing.' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		await agent.generate('Tell me a joke.', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).not.toHaveBeenCalled();
		const nonSystem = gemini.calls[0].prompt.filter((m) => m.role !== 'system');
		expect(nonSystem.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
	});

	it('advances the cursor even when Observer returns NO_OBSERVATIONS on a thread with no prior observations', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Quick check' }],
			},
			makeForeignAssistantMessage('m-2', new Date('2026-10-01T10:00:01Z')),
		]);

		const observe = vi.fn(async () => 'NO_OBSERVATIONS');
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'First reply on Gemini' },
			{ text: 'Second reply on Gemini' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		await agent.generate('Next question', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).toHaveBeenCalledTimes(1);
		expect((await store.getCursor(THREAD_ID))?.lastObservedMessageId).toBe('m-2');
		expect((await store.getResumeState(THREAD_ID))?.resumeFrom?.lastObservedMessageId).toBe('m-2');
		expect(gemini.calls[0].prompt.filter((m) => m.role !== 'system')).toHaveLength(1);

		// A subsequent turn stays past the cursor and does not re-trigger compaction.
		await agent.generate('Follow-up', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).toHaveBeenCalledTimes(1);
		const secondNonSystem = gemini.calls[1].prompt.filter((m) => m.role !== 'system');
		expect(secondNonSystem.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
	});

	it('settles abandoned pending tool calls during pre-turn model-switch compaction', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Delete the draft' }],
			},
			{
				id: 'm-2',
				createdAt: new Date('2026-10-01T10:00:01Z'),
				role: 'assistant',
				model: 'anthropic/claude-sonnet-5-5',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'toolu_pending',
						toolName: 'delete_draft',
						input: { draftId: 'd-9' },
						state: 'pending',
					},
				],
			},
		]);

		const observe = vi.fn(
			async () => '* IMPORTANT (10:00) Draft d-9 deletion was interrupted and did not take effect.',
		);
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Draft d-9 was not deleted.' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		await agent.generate('Did you delete it?', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).toHaveBeenCalledTimes(1);
		expect(observe.mock.calls[0][0].transcript).toContain('INTERRUPTED');
		expect((await store.getCursor(THREAD_ID))?.lastObservedMessageId).toBe('m-2');
		expect(gemini.calls[0].prompt.filter((m) => m.role !== 'system')).toHaveLength(1);
	});

	it('preserves uploaded file metadata in the observer transcript', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [
					{ type: 'text', text: 'Review this spec' },
					{
						type: 'file',
						mediaType: 'application/pdf',
						fileRef: { id: 'file-42', fileName: 'spec.pdf', sizeBytes: 2048 },
					},
				],
			},
			makeForeignAssistantMessage('m-2', new Date('2026-10-01T10:00:01Z')),
		]);

		const observe = vi.fn(async () => '* INFO (10:00) User uploaded spec.pdf (fileId: file-42).');
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Got it.' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		await agent.generate('Continue', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).toHaveBeenCalledTimes(1);
		expect(observe.mock.calls[0][0].transcript).toContain('spec.pdf');
		expect(observe.mock.calls[0][0].transcript).toContain('fileId: file-42');
	});

	it('propagates abortSignal to forced model-switch compaction', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Question' }],
			},
			makeForeignAssistantMessage('m-2', new Date('2026-10-01T10:00:01Z')),
		]);

		const controller = new AbortController();
		const observe = vi.fn(async (input) => {
			expect(input.abortSignal).toBe(controller.signal);
			controller.abort();
			throw new Error('Aborted');
		});
		const config = {
			name: 'helper',
			model: 'google/gemini-3-flash',
			memory: store,
			observationalMemory: {
				observerThresholdTokens: 50_000,
				observe,
			},
		} as unknown as AgentRuntimeConfig;

		const orchestrator = new MemoryOrchestrator(
			config,
			new BackgroundTaskTracker(),
			new AgentEventBus(),
			new RuntimeTelemetry(config),
		);

		await expect(
			orchestrator.loadInto(new AgentMessageList(), {
				persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
				abortSignal: controller.signal,
			}),
		).rejects.toThrow('Aborted');
	});

	it('falls back to history sanitization when observational memory is disabled', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Search for inline validation' }],
			},
			makeForeignAssistantMessage('m-2', new Date('2026-10-01T10:00:01Z')),
		]);

		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Sanitized continuation worked.' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(new Memory().storage(store));

		const result = await agent.generate('Summarize that', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(result.finishReason).toBe('stop');
		const nonSystem = gemini.calls[0].prompt.filter((m) => m.role !== 'system');
		expect(nonSystem.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);

		const assistantParts = nonSystem[1].content as Array<{ type: string; text?: string }>;
		expect(assistantParts.every((part) => part.type === 'text')).toBe(true);
		expect(assistantParts.map((part) => part.text).join('\n')).toContain(
			'anthropic.web_search_20250305',
		);
	});

	it('falls back to history sanitization when forced Observer compaction fails', async () => {
		const store = new InMemoryMemory();
		await seedThread(store, [
			{
				id: 'm-1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Search for inline validation' }],
			},
			makeForeignAssistantMessage('m-2', new Date('2026-10-01T10:00:01Z')),
		]);

		const observe = vi.fn(async () => {
			throw new Error('Observer unavailable');
		});
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Recovered via sanitization.' },
		]);

		const agent = new Agent('helper')
			.model(gemini.model)
			.instructions('You are helpful.')
			.memory(
				new Memory().storage(store).observationalMemory({
					observerThresholdTokens: 50_000,
					observe,
					reflect: async () => '{"drop":[],"merge":[]}',
				}),
			);

		const result = await agent.generate('Continue', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});

		expect(observe).toHaveBeenCalledTimes(1);
		expect(result.finishReason).toBe('stop');
		const nonSystem = gemini.calls[0].prompt.filter((m) => m.role !== 'system');
		const assistantParts = nonSystem[1].content as Array<{ type: string }>;
		expect(assistantParts.every((part) => part.type === 'text')).toBe(true);
	});

	it('compacts after settling a resumed tool call when the model changed while suspended', async () => {
		const store = new InMemoryMemory();
		const checkpoints = new Map<string, unknown>();
		const checkpointStore = {
			save: async (key: string, state: unknown) => {
				checkpoints.set(key, structuredClone(state));
			},
			load: async (key: string) => structuredClone(checkpoints.get(key)),
			delete: async (key: string) => {
				checkpoints.delete(key);
			},
		};

		const approveTool = new Tool('send_email')
			.description('Send an email')
			.input(z.object({ to: z.string() }))
			.suspend(z.object({ confirm: z.boolean() }))
			.resume(z.object({ approved: z.boolean() }))
			.handler(async (input, ctx) => {
				if (!ctx.resumeData) {
					return await ctx.suspend({ confirm: true });
				}
				return { sentTo: input.to, approved: ctx.resumeData.approved };
			})
			.build();

		const anthropic = createMockLanguageModel('anthropic.messages', 'claude-sonnet-5-5', [
			{
				reasoning: { text: 'Need approval', providerMetadata: { anthropic: { signature: 's1' } } },
				toolCalls: [
					{ toolCallId: 'toolu_1', toolName: 'send_email', input: JSON.stringify({ to: 'a@b.c' }) },
				],
			},
		]);

		const runtime1 = new AgentRuntime({
			name: 'emailer',
			model: anthropic.model,
			instructions: 'You send emails.',
			tools: [approveTool],
			memory: store,
			checkpointStorage: checkpointStore as never,
		});

		const suspended = await runtime1.generate('Email a@b.c', {
			persistence: { threadId: THREAD_ID, resourceId: RESOURCE_ID },
		});
		expect(suspended.pendingSuspend).toHaveLength(1);

		const observe = vi.fn(
			async () => '* COMPLETION (10:01) Sent email to a@b.c after user approval.',
		);
		const gemini = createMockLanguageModel('google.generative-ai', 'gemini-3-flash', [
			{ text: 'Email sent!' },
		]);

		const runtime2 = new AgentRuntime({
			name: 'emailer',
			model: gemini.model,
			instructions: 'You send emails.',
			tools: [approveTool],
			memory: store,
			observationalMemory: {
				observerThresholdTokens: 50_000,
				observe,
				reflect: async () => '{"drop":[],"merge":[]}',
			},
			checkpointStorage: checkpointStore as never,
		});

		const resumed = await runtime2.resume(
			'generate',
			{ approved: true },
			{
				runId: suspended.runId,
				toolCallId: 'toolu_1',
			},
		);

		expect(resumed.finishReason).toBe('stop');
		expect(observe).toHaveBeenCalledTimes(1);

		const prompt = gemini.calls[0].prompt;
		const nonSystem = prompt.filter((m) => m.role !== 'system');
		expect(nonSystem).toHaveLength(1);
		expect(nonSystem[0].role).toBe('user');
		const renderedPrompt = JSON.stringify(prompt);
		expect(renderedPrompt).toContain('<observations>');
		expect(renderedPrompt).toContain('Sent email to a@b.c');
		expect(renderedPrompt).not.toContain('sig');
	});

	it('appends a continuation user message on fallback sanitization when a resumed cross-provider tool turn would end with assistant', () => {
		const list = new AgentMessageList();
		list.addHistory([
			{
				id: 'u1',
				createdAt: new Date('2026-10-01T10:00:00Z'),
				role: 'user',
				content: [{ type: 'text', text: 'Email a@b.c' }],
			},
			{
				id: 'a1',
				createdAt: new Date('2026-10-01T10:00:01Z'),
				role: 'assistant',
				model: 'google/gemini-3-flash',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'call_1',
						toolName: 'send_email',
						input: { to: 'a@b.c' },
						state: 'resolved',
						output: { sent: true },
						providerMetadata: { google: { thoughtSignature: 'ts-1' } },
					},
				],
			},
		]);

		const context = list.forLlm(
			'base',
			undefined,
			undefined,
			true,
			'anthropic',
			'anthropic/claude-sonnet-5-5',
		);

		expect(context.messages.map((m) => m.role)).toEqual(['user', 'assistant', 'user']);
		expect(context.messages[2]).toEqual({
			role: 'user',
			content: MODEL_SWITCH_CONTINUATION_REMINDER,
		});
	});
});
