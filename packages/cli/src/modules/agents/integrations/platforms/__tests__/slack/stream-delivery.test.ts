import type { StreamChunk } from '@n8n/agents';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import type { Message } from 'chat';
import nock from 'nock';
import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { onceStatusHandle } from '../../../agent-chat-integration';
import { AgentChatStreamConsumer } from '../../../agent-chat-stream-consumer';
import type { ChatInstance } from '../../../chat-integration.service';
import {
	createSlackBridgeExecutionContext,
	SLACK_STREAMING_OPTIONS,
} from '../../slack/slack-bridge-behavior';

describe('Slack stream delivery', () => {
	afterEach(() => nock.cleanAll());

	it.each([
		{ name: 'threaded stream', topLevel: false, textEnd: true, ending: 'reply' },
		{ name: 'top-level reply', topLevel: true, textEnd: true, ending: 'reply' },
		{ name: 'stream without text-end', topLevel: false, textEnd: false, ending: 'reply' },
		{ name: 'threaded silent finish', topLevel: false, textEnd: true, ending: 'silent' },
		{ name: 'top-level silent finish', topLevel: true, textEnd: true, ending: 'silent' },
		{ name: 'threaded failure', topLevel: false, textEnd: true, ending: 'error' },
		{ name: 'top-level failure', topLevel: true, textEnd: true, ending: 'error' },
		{
			name: 'text without a tool',
			topLevel: false,
			textEnd: true,
			ending: 'reply',
			toolCall: false,
		},
	])(
		'keeps one reply visible while the turn is active ($name)',
		async ({ topLevel, textEnd, ending, toolCall = true }) => {
			const calls: Array<{ method: string; body: Record<string, string> }> = [];
			let visibleStatus = '';
			nock('https://slack.com')
				.persist()
				.post(/\/api\/.+/)
				.reply(200, (uri, requestBody) => {
					const method = uri.replace('/api/', '');
					const body =
						typeof requestBody === 'string'
							? Object.fromEntries(new URLSearchParams(requestBody))
							: (requestBody as Record<string, string>);
					calls.push({ method, body });
					if (method === 'chat.postMessage') visibleStatus = '';
					if (method === 'assistant.threads.setStatus') visibleStatus = body.status;
					return { ok: true, ts: '1719000999.000100', message: { ts: '1719000999.000100' } };
				});
			const { createSlackAdapter } = await import('@chat-adapter/slack');
			const { createMemoryState } = await import('@chat-adapter/state-memory');
			const { ThreadImpl } = await import('chat');
			const threadTs = topLevel ? '1719000001.000100' : '1719000000.000100';
			const adapter = createSlackAdapter({
				botToken: 'xoxb-test-token',
				botUserId: 'U_BOT',
				signingSecret: 'test-signing-secret',
				nativeStreaming: false,
			});
			const message = mock<Message<unknown>>({
				author: { userId: 'U_USER' },
				raw: {
					channel: 'C_CHANNEL',
					ts: '1719000001.000100',
					thread_ts: topLevel ? undefined : '1719000000.000100',
					team: 'T_TEAM',
				},
			});
			const thread = new ThreadImpl({
				id: `slack:C_CHANNEL:${threadTs}`,
				channelId: 'slack:C_CHANNEL',
				adapter,
				stateAdapter: createMemoryState(),
				currentMessage: message,
				...SLACK_STREAMING_OPTIONS,
			});
			const logger = mock<Logger>();
			const context = await createSlackBridgeExecutionContext({
				chat: mock<ChatInstance>({ getAdapter: () => adapter }),
				thread,
				message,
				logger,
				agentId: 'agent-1',
				integration: { type: 'slack', credentialId: 'slack-1' },
				isNewMention: false,
				replyExpectation: 'required',
			});
			const consumer = new AgentChatStreamConsumer({
				disableStreaming: false,
				logger,
				postErrorToThread: vi.fn().mockRejectedValue(new Error('Unexpected delivery failure')),
				handleSuspension: vi.fn().mockResolvedValue('skipped'),
				handleMessage: vi.fn().mockResolvedValue(false),
			});
			const toolStarted = createDeferredPromise();
			const toolFinished = createDeferredPromise();
			const progress = 'Session found. Let me save the reply.';
			async function* stream(): AsyncGenerator<StreamChunk> {
				yield { type: 'text-delta', id: 'progress', delta: progress.slice(0, 14) };
				yield { type: 'text-delta', id: 'progress', delta: progress.slice(14) };
				if (textEnd) yield { type: 'text-end', id: 'progress' };
				if (toolCall)
					yield { type: 'tool-call', toolCallId: 'save', toolName: 'save_reply', input: {} };
				toolStarted.resolve();
				await toolFinished.promise;
				if (ending === 'error') throw new Error('Tool execution failed');
				if (toolCall) {
					yield {
						type: 'tool-result',
						toolCallId: 'save',
						toolName: 'save_reply',
						output: { ok: true },
					};
				}
				yield { type: 'finish-step' };
				if (ending === 'reply') {
					yield { type: 'start-step' };
					yield { type: 'text-delta', id: 'answer', delta: 'The reply is saved.' };
					yield { type: 'text-end', id: 'answer' };
					expect(visibleStatus).toBe('Thinking...');
				}
				yield { type: 'finish', finishReason: 'stop' };
			}
			const statusHandle = onceStatusHandle(context.statusHandle);
			const run = consumer.consume(stream(), thread, {
				...context,
				statusHandle,
			});
			try {
				await Promise.race([
					toolStarted.promise,
					run.then(() => {
						throw new Error('The turn ended before the tool started');
					}),
				]);
				await vi.waitFor(
					() => {
						expect(
							calls.filter((call) => call.method === 'chat.update').at(-1)?.body,
						).toMatchObject({ markdown_text: progress });
					},
					{ timeout: 2500 },
				);
				expect(calls.filter((call) => call.method === 'chat.postMessage')).toHaveLength(1);
				expect(calls.find((call) => call.method === 'chat.postMessage')?.body).toMatchObject({
					channel: 'C_CHANNEL',
					thread_ts: threadTs,
				});
				expect(calls.some((call) => call.method === 'chat.startStream')).toBe(false);
				expect(visibleStatus).toBe('Thinking...');
				expect(
					calls.filter((call) => call.method === 'assistant.threads.setStatus').at(-1)?.body,
				).toMatchObject({ status: 'Thinking...' });
				expect(
					calls.filter((call) => call.method === 'assistant.threads.setStatus').at(-1)?.body,
				).toMatchObject({ channel_id: 'C_CHANNEL', thread_ts: threadTs });
			} finally {
				toolFinished.resolve();
				if (ending === 'error') {
					await expect(run).rejects.toThrow('Tool execution failed');
				} else {
					await run;
				}
			}
			expect(
				calls.filter((call) => call.method === 'assistant.threads.setStatus').at(-1)?.body,
			).toMatchObject({ status: '' });
			const callCount = calls.length;
			await statusHandle?.clearBeforeResponse();
			expect(calls).toHaveLength(callCount);
			expect(visibleStatus).toBe('');
			expect(calls.filter((call) => call.method === 'chat.postMessage')).toHaveLength(1);
			const updates = calls.filter((call) => call.method === 'chat.update');
			expect(updates.every((call) => call.body.ts === '1719000999.000100')).toBe(true);
			expect(updates.at(-1)?.body.markdown_text).toBe(
				progress + (ending === 'reply' ? '\n\nThe reply is saved.' : ''),
			);
		},
	);
});
