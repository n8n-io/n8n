import type * as AiImport from 'ai';

import type { AgentDbMessage } from '../../types/sdk/message';
import type { MemoryTaskUsageReport } from '../../types/sdk/observation-log';
import type { BuiltTelemetry } from '../../types/telemetry';
import { InMemoryMemory } from '../memory/memory-store';
import {
	buildObservationLogObserverPrompt,
	createObservationLogObserveFn,
	DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT,
	DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS,
	DEFAULT_OBSERVATION_LOG_TAIL_LIMIT,
} from '../memory/observation-log-defaults';
import {
	parseObservationLogMarkdown,
	renderObserverTranscript,
	runObservationLogObserver,
} from '../memory/observation-log-observer';

type GenerateTextCall = Record<string, unknown>;
type GenerateTextResult = {
	text: string;
	usage?: {
		totalTokens?: number;
		inputTokens?: number;
		outputTokens?: number;
		inputTokenDetails?: {
			noCacheTokens?: number;
			cacheReadTokens?: number;
			cacheWriteTokens?: number;
		};
	};
	providerMetadata?: Record<string, unknown>;
};

const { mockGenerateText } = vi.hoisted(() => ({
	mockGenerateText: vi.fn<(...args: [GenerateTextCall]) => Promise<GenerateTextResult>>(),
}));

vi.mock('ai', async () => {
	const actual = await vi.importActual<typeof AiImport>('ai');
	return {
		...actual,
		generateText: async (call: GenerateTextCall): Promise<GenerateTextResult> =>
			await mockGenerateText(call),
	};
});

function message(
	id: string,
	role: 'user' | 'assistant',
	text: string,
	createdAt: Date,
): AgentDbMessage {
	return {
		id,
		createdAt,
		role,
		content: [{ type: 'text', text }],
	};
}

describe('observation-log observer defaults', () => {
	beforeEach(() => {
		mockGenerateText.mockReset();
	});

	it('keeps default policy and threshold configuration in the SDK', () => {
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS).toBe(8_000);
		expect(DEFAULT_OBSERVATION_LOG_TAIL_LIMIT).toBe(20);
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain('Output the new observations only');
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain(
			'CRITICAL. Things the agent must not forget',
		);
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain(
			'GOOD:\n* IMPORTANT (14:30) User is purchasing Claude Code subscriptions for their team.',
		);
	});

	it('builds the default observer prompt from log tail and transcript delta', () => {
		const prompt = buildObservationLogObserverPrompt({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '[2026-05-12T14:29:00.000Z] user:\nRemember daily-report-prod.',
			transcriptTokenCount: 42,
			observationLogTail: [],
			renderedObservationLogTail:
				'<observations>\n* CRITICAL (14:28) User is rebuilding observational memory.\n</observations>',
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T14:30:00.000Z');
		expect(prompt).toContain('* CRITICAL (14:28) User is rebuilding observational memory.');
		expect(prompt).toContain('Remember daily-report-prod.');
		expect(prompt).toContain('Unobserved transcript tokens: 42');
	});

	it('counts observer generation tokens when usage is available', async () => {
		mockGenerateText.mockResolvedValue({
			text: '* CRITICAL (14:30) User asked to remember project context.',
			usage: { totalTokens: 17 },
		});
		const counter = {
			incrementMessageCount: vi.fn(),
			incrementToolCallCount: vi.fn(),
			incrementTokenCount: vi.fn(),
		};

		const result = await createObservationLogObserveFn('openai/gpt-4o-mini')({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: 'user:\nRemember the project context.',
			transcriptTokenCount: 10,
			observationLogTail: [],
			renderedObservationLogTail: null,
			executionCounter: counter,
		});

		expect(result).toContain('CRITICAL');
		expect(counter.incrementTokenCount).toHaveBeenCalledWith(17);
		expect(counter.incrementMessageCount).not.toHaveBeenCalled();
		expect(counter.incrementToolCallCount).not.toHaveBeenCalled();
	});

	it('threads input.telemetry into generateText as a memory-observer-suffixed call, omitting it when disabled or absent', async () => {
		mockGenerateText.mockResolvedValue({ text: '' });
		const observe = createObservationLogObserveFn('openai/gpt-4o-mini');
		const baseInput = {
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '',
			transcriptTokenCount: 0,
			observationLogTail: [],
			renderedObservationLogTail: null,
		};
		const telemetry: BuiltTelemetry = {
			enabled: true,
			functionId: 'my-agent',
			metadata: { thread_id: 't1' },
			recordInputs: true,
			recordOutputs: false,
			integrations: [],
		};

		await observe({ ...baseInput, telemetry });
		await observe(baseInput);
		await observe({ ...baseInput, telemetry: { ...telemetry, enabled: false } });

		expect(mockGenerateText.mock.calls[0][0]).toMatchObject({
			experimental_telemetry: {
				isEnabled: true,
				functionId: 'my-agent.memory-observer',
				metadata: { thread_id: 't1' },
				recordInputs: true,
				recordOutputs: false,
			},
		});
		expect(mockGenerateText.mock.calls[1][0].experimental_telemetry).toBeUndefined();
		expect(mockGenerateText.mock.calls[2][0].experimental_telemetry).toBeUndefined();
	});

	it('reports normalized, cache-aware usage through an async onUsage before the observer promise settles', async () => {
		mockGenerateText.mockResolvedValue({
			text: '* CRITICAL (14:30) Durable fact.',
			usage: {
				inputTokens: 100,
				outputTokens: 10,
				totalTokens: 110,
				inputTokenDetails: { noCacheTokens: 20, cacheReadTokens: 80 },
			},
		});
		let resolveUsage!: () => void;
		const usageGate = new Promise<void>((resolve) => {
			resolveUsage = resolve;
		});
		const onUsage = vi.fn(async (report: MemoryTaskUsageReport) => {
			expect(report).toMatchObject({
				task: 'observer',
				model: 'anthropic/claude-haiku-4-5-20251001',
				usage: expect.objectContaining({
					promptTokens: 100,
					completionTokens: 10,
					totalTokens: 110,
					inputTokenDetails: { noCache: 20, cacheRead: 80 },
				}),
				reportId: expect.any(String),
			});
			await usageGate;
		});

		const observePromise = createObservationLogObserveFn('anthropic/claude-haiku-4-5-20251001', {
			onUsage,
		})({
			observationScopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '',
			transcriptTokenCount: 0,
			observationLogTail: [],
			renderedObservationLogTail: null,
		});
		let observeSettled = false;
		void observePromise.then(() => {
			observeSettled = true;
		});

		await Promise.resolve();
		await Promise.resolve();
		expect(observeSettled).toBe(false);

		resolveUsage();
		await observePromise;

		expect(observeSettled).toBe(true);
		expect(onUsage).toHaveBeenCalledTimes(1);
	});
});

describe('parseObservationLogMarkdown', () => {
	it('parses marker bullets and attaches marked sub-bullets to the previous parent', () => {
		const parsed = parseObservationLogMarkdown(
			[
				'* CRITICAL (14:30) User chose the observation log model.',
				'  * COMPLETION (14:31) Plan 4 was completed.',
				'not a bullet',
				'* INFO (14:32) Small context detail.',
			].join('\n'),
		);

		expect(parsed.entries).toEqual([
			{
				marker: 'critical',
				text: 'User chose the observation log model.',
				parentIndex: null,
			},
			{ marker: 'completion', text: 'Plan 4 was completed.', parentIndex: 0 },
			{ marker: 'info', text: 'Small context detail.', parentIndex: null },
		]);
		expect(parsed.skippedLines).toEqual(['not a bullet']);
	});
});

describe('renderObserverTranscript', () => {
	it('includes text turns, tool calls, and compact tool results', () => {
		const transcript = renderObserverTranscript(
			[
				message('u1', 'user', 'Use the literal workflow name daily-report-prod.', new Date(0)),
				{
					id: 'a1',
					createdAt: new Date(1),
					role: 'assistant',
					content: [
						{ type: 'text', text: 'I will inspect it.' },
						{
							type: 'tool-call',
							toolCallId: 'tc1',
							toolName: 'lookup_workflow',
							input: { workflow: 'daily-report-prod' },
							state: 'resolved',
							output: { rows: [{ id: 1 }], blob: 'x'.repeat(80) },
						},
					],
				},
			],
			{ maxStringChars: 20 },
		);

		expect(transcript).toContain('user:');
		expect(transcript).toContain('Use the literal workflow name daily-report-prod.');
		expect(transcript).toContain('tool_call lookup_workflow');
		expect(transcript).toContain('"workflow":"daily-report-prod"');
		expect(transcript).toContain('tool_result lookup_workflow');
		expect(transcript).toContain('[truncated');
	});

	it('redacts credential-looking tool inputs and outputs before serialization', () => {
		const transcript = renderObserverTranscript([
			{
				id: 'a1',
				createdAt: new Date(1),
				role: 'assistant',
				content: [
					{
						type: 'tool-call',
						toolCallId: 'tc1',
						toolName: 'call_api',
						input: {
							apiKey: 'sk-live-input-secret',
							headers: {
								authorization: 'Bearer input-token',
								'x-safe-header': 'keep-me',
							},
							query: 'safe=1&password=inline-secret',
						},
						state: 'resolved',
						output: {
							access_token: 'output-access-token',
							message: 'Authorization: Basic output-basic-token',
						},
					},
				],
			},
		]);

		expect(transcript).toContain('[REDACTED]');
		expect(transcript).toContain('"x-safe-header":"keep-me"');
		expect(transcript).toContain('safe=1');
		expect(transcript).not.toContain('sk-live-input-secret');
		expect(transcript).not.toContain('input-token');
		expect(transcript).not.toContain('inline-secret');
		expect(transcript).not.toContain('output-access-token');
		expect(transcript).not.toContain('output-basic-token');
	});

	it('redacts credential-looking rejected tool errors before serialization', () => {
		const transcript = renderObserverTranscript(
			[
				{
					id: 'a1',
					createdAt: new Date(1),
					role: 'assistant',
					content: [
						{
							type: 'tool-call',
							toolCallId: 'tc1',
							toolName: 'call_api',
							input: { url: 'https://example.test' },
							state: 'rejected',
							error:
								'Request failed: Authorization: Bearer rejected-token; api_key=rejected-key; password=rejected-password',
						},
					],
				},
			],
			{ maxStringChars: 200 },
		);

		expect(transcript).toContain('tool_result call_api error=');
		expect(transcript).toContain('[REDACTED]');
		expect(transcript).not.toContain('rejected-token');
		expect(transcript).not.toContain('rejected-key');
		expect(transcript).not.toContain('rejected-password');
	});

	it('redacts secret values from user and assistant message text', () => {
		const transcript = renderObserverTranscript([
			message(
				'u1',
				'user',
				'Here is the setup: xoxb-1234567890-abcdefghij for the integration.',
				new Date(0),
			),
			{
				id: 'a1',
				createdAt: new Date(1),
				role: 'assistant',
				content: [
					{
						type: 'text',
						text: 'Got it, I will use sk-live-assistant-echo-secret to configure it.',
					},
				],
			},
		]);

		expect(transcript).toContain('for the integration.');
		expect(transcript).toContain('Got it, I will use');
		expect(transcript).toContain('[REDACTED]');
		expect(transcript).not.toContain('xoxb-1234567890-abcdefghij');
		expect(transcript).not.toContain('sk-live-assistant-echo-secret');
	});
});

describe('runObservationLogObserver', () => {
	it('waits until the unobserved transcript reaches the token threshold', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 'thread-1', resourceId: 'user-1' });
		await store.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages: [message('m1', 'user', 'short turn', new Date(2026, 4, 12, 14, 30))],
		});

		const observe = vi.fn().mockResolvedValue('* CRITICAL (14:30) User said something durable.');

		const result = await runObservationLogObserver({
			memory: store,
			observationScopeId: 'thread-1',
			observerThresholdTokens: 999,
			observationLogTailLimit: 20,
			tokenCounter: () => 1,
			observe,
		});

		expect(result).toEqual({ status: 'skipped', reason: 'below-threshold', tokenCount: 1 });
		expect(observe).not.toHaveBeenCalled();
		expect(await store.getCursor('thread-1')).toBeNull();
	});

	it('writes parsed observations and advances the cursor after observing', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 'thread-1', resourceId: 'user-1' });
		await store.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages: [message('m1', 'user', 'I need this remembered.', new Date(2026, 4, 12, 14, 30))],
		});

		const result = await runObservationLogObserver({
			memory: store,
			observationScopeId: 'thread-1',
			observerThresholdTokens: 1,
			observationLogTailLimit: 20,
			tokenCounter: () => 10,
			now: new Date(2026, 4, 12, 14, 31),
			observe: async () =>
				await Promise.resolve(
					[
						'* CRITICAL (14:31) User needs the current request remembered.',
						'  * COMPLETION (14:31) Observer pipeline parsed the child row.',
					].join('\n'),
				),
		});

		expect(result).toMatchObject({ status: 'ran', observationsWritten: 2, cursorAdvanced: true });
		const observations = await store.getActiveObservationLog({
			observationScopeId: 'thread-1',
		});
		expect(observations).toMatchObject([
			{
				marker: 'critical',
				text: 'User needs the current request remembered.',
				parentId: null,
			},
			{
				marker: 'completion',
				text: 'Observer pipeline parsed the child row.',
				parentId: observations[0]?.id,
			},
		]);
		expect(await store.getCursor('thread-1')).toMatchObject({
			lastObservedMessageId: 'm1',
		});
	});

	it('does not advance the cursor when observe yields no parseable observations', async () => {
		// A cursor advanced without persisted observations orphans the delta
		// messages from future history loads, causing mid-thread amnesia.
		const store = new InMemoryMemory();
		await store.saveThread({ id: 'thread-1', resourceId: 'user-1' });
		await store.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages: [message('m1', 'user', 'I need this remembered.', new Date(2026, 4, 12, 14, 30))],
		});

		const result = await runObservationLogObserver({
			memory: store,
			observationScopeId: 'thread-1',
			observerThresholdTokens: 1,
			observationLogTailLimit: 20,
			tokenCounter: () => 10,
			now: new Date(2026, 4, 12, 14, 31),
			// Empty / unparseable observe output (e.g. a failed or no-op generation).
			observe: async () => await Promise.resolve('   \nnot a bullet line\n'),
		});

		expect(result).toMatchObject({
			status: 'ran',
			observationsWritten: 0,
			cursorAdvanced: false,
		});
		// Cursor stays put so the delta is re-observed next time and remains in
		// raw history in the meantime.
		expect(await store.getCursor('thread-1')).toBeNull();
		expect(await store.getActiveObservationLog({ observationScopeId: 'thread-1' })).toEqual([]);
	});

	it('does not persist secret values echoed by the observer into observation entries', async () => {
		const store = new InMemoryMemory();
		await store.saveThread({ id: 'thread-1', resourceId: 'user-1' });
		await store.saveMessages({
			threadId: 'thread-1',
			resourceId: 'user-1',
			messages: [
				message('m1', 'user', 'setting up the integration', new Date(2026, 4, 12, 14, 30)),
			],
		});

		await runObservationLogObserver({
			memory: store,
			observationScopeId: 'thread-1',
			observerThresholdTokens: 1,
			observationLogTailLimit: 20,
			tokenCounter: () => 10,
			now: new Date(2026, 4, 12, 14, 31),
			observe: async () =>
				await Promise.resolve(
					'* CRITICAL (14:31) User provided the token xoxb-1234567890-abcdefghij for the integration.',
				),
		});

		const observations = await store.getActiveObservationLog({ observationScopeId: 'thread-1' });
		expect(observations).toHaveLength(1);
		expect(observations[0].text).toContain('[REDACTED]');
		expect(observations[0].text).not.toContain('xoxb-1234567890-abcdefghij');
	});
});
