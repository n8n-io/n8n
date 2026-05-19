import type { AgentDbMessage } from '../../types/sdk/message';
import { InMemoryMemory } from '../memory-store';
import {
	buildObservationLogObserverPrompt,
	DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT,
	DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS,
	DEFAULT_OBSERVATION_LOG_TAIL_LIMIT,
} from '../observation-log-defaults';
import {
	parseObservationLogMarkdown,
	renderObserverTranscript,
	runObservationLogObserver,
} from '../observation-log-observer';

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
	it('keeps default policy and threshold configuration in the SDK', () => {
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_THRESHOLD_TOKENS).toBe(2000);
		expect(DEFAULT_OBSERVATION_LOG_TAIL_LIMIT).toBe(20);
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain('Output the new observations only');
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain('🔴 CRITICAL');
		expect(DEFAULT_OBSERVATION_LOG_OBSERVER_PROMPT).toContain(
			'GOOD:\n* 🟡 (14:30) User is purchasing Claude Code subscriptions for their team.',
		);
	});

	it('builds the default observer prompt from log tail and transcript delta', () => {
		const prompt = buildObservationLogObserverPrompt({
			scopeKind: 'thread',
			scopeId: 'thread-1',
			now: new Date('2026-05-12T14:30:00.000Z'),
			deltaMessages: [],
			transcript: '[2026-05-12T14:29:00.000Z] user:\nRemember daily-report-prod.',
			transcriptTokenCount: 42,
			observationLogTail: [],
			renderedObservationLogTail:
				'## Memory\n\n* 🔴 (14:28) User is rebuilding observational memory.',
		});

		expect(prompt).toContain('Current timestamp: 2026-05-12T14:30:00.000Z');
		expect(prompt).toContain('* 🔴 (14:28) User is rebuilding observational memory.');
		expect(prompt).toContain('Remember daily-report-prod.');
		expect(prompt).toContain('Unobserved transcript tokens: 42');
	});
});

describe('parseObservationLogMarkdown', () => {
	it('parses marker bullets and attaches marked sub-bullets to the previous parent', () => {
		const parsed = parseObservationLogMarkdown(
			[
				'* 🔴 (14:30) User chose the observation log model.',
				'  * ✅ (14:31) Plan 4 was completed.',
				'not a bullet',
				'* 🟢 (14:32) Small context detail.',
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
							message: 'Authorization: Basic output-basic-token; token: inline-output-token',
						},
					},
				],
			},
		]);

		expect(transcript).toContain('[redacted]');
		expect(transcript).toContain('"x-safe-header":"keep-me"');
		expect(transcript).toContain('safe=1');
		expect(transcript).toContain('password=[redacted]');
		expect(transcript).not.toContain('sk-live-input-secret');
		expect(transcript).not.toContain('input-token');
		expect(transcript).not.toContain('inline-secret');
		expect(transcript).not.toContain('output-access-token');
		expect(transcript).not.toContain('output-basic-token');
		expect(transcript).not.toContain('inline-output-token');
		expect(transcript).not.toMatch(/password=\d+\[redacted\]/);
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
		expect(transcript).toContain('Authorization: [redacted]');
		expect(transcript).toContain('api_key=[redacted]');
		expect(transcript).toContain('password=[redacted]');
		expect(transcript).not.toContain('rejected-token');
		expect(transcript).not.toContain('rejected-key');
		expect(transcript).not.toContain('rejected-password');
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

		const observe = jest.fn().mockResolvedValue('* 🔴 (14:30) User said something durable.');

		const result = await runObservationLogObserver({
			memory: store,
			scopeKind: 'thread',
			scopeId: 'thread-1',
			observerThresholdTokens: 999,
			observationLogTailLimit: 20,
			tokenCounter: () => 1,
			observe,
		});

		expect(result).toEqual({ status: 'skipped', reason: 'below-threshold', tokenCount: 1 });
		expect(observe).not.toHaveBeenCalled();
		expect(await store.getCursor('thread', 'thread-1')).toBeNull();
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
			scopeKind: 'thread',
			scopeId: 'thread-1',
			observerThresholdTokens: 1,
			observationLogTailLimit: 20,
			tokenCounter: () => 10,
			now: new Date(2026, 4, 12, 14, 31),
			observe: async () =>
				await Promise.resolve(
					[
						'* 🔴 (14:31) User needs the current request remembered.',
						'  * ✅ (14:31) Observer pipeline parsed the child row.',
					].join('\n'),
				),
		});

		expect(result).toMatchObject({ status: 'ran', observationsWritten: 2 });
		const observations = await store.getActiveObservationLog({
			scopeKind: 'thread',
			scopeId: 'thread-1',
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
		expect(await store.getCursor('thread', 'thread-1')).toMatchObject({
			lastObservedMessageId: 'm1',
		});
	});
});
