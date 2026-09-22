import type { StreamChunk } from '@n8n/agents';
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { INTEGRATION_ERROR_CODES } from '../integration-error-codes';
import { AgentChatStreamConsumer } from '../agent-chat-stream-consumer';

function makeStream(chunks: StreamChunk[]): AsyncGenerator<StreamChunk> {
	return (async function* () {
		for (const chunk of chunks) yield chunk;
	})();
}

function makeConsumer(
	postErrorToThread: (thread: Thread<unknown, unknown> | null, error: unknown) => Promise<void>,
) {
	return new AgentChatStreamConsumer({
		disableStreaming: true,
		logger: mock<Logger>(),
		postErrorToThread,
		handleSuspension: vi.fn().mockResolvedValue('skipped'),
		handleMessage: vi.fn().mockResolvedValue(false),
		isIntegrationActionTool: () => true,
	});
}

const thread = mock<Thread<unknown, unknown>>();

describe('AgentChatStreamConsumer — rate-limit fallback', () => {
	it('posts a fallback error after a RATE_LIMIT_EXCEEDED tool result', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		const rateLimitResult = {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
				message:
					'The Slack integration has exceeded its rate limit. Please wait a few minutes before trying again.',
			},
		};

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: rateLimitResult,
				},
				{ type: 'text-delta', id: 't-1', delta: 'Let me try again' },
			]),
			thread,
		);

		expect(postErrorToThread).toHaveBeenCalledTimes(1);
		const postedError = postErrorToThread.mock.calls[0][1];
		expect(postedError).toEqual(rateLimitResult);
	});

	it('still posts the fallback when a later tool result succeeds', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		const rateLimitResult = {
			ok: false,
			error: {
				code: INTEGRATION_ERROR_CODES.RATE_LIMIT_EXCEEDED,
				message: 'The Slack integration has exceeded its rate limit.',
			},
		};

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: rateLimitResult,
				},
				{
					type: 'tool-result',
					toolCallId: 'tc-2',
					toolName: 'linear_action',
					output: { ok: true },
				},
			]),
			thread,
		);

		// rate-limit is not cleared by a later success
		expect(postErrorToThread).toHaveBeenCalledTimes(1);
	});

	it('does not post a fallback when there is no rate-limit or error', async () => {
		const postErrorToThread = vi.fn().mockResolvedValue(undefined);
		const consumer = makeConsumer(postErrorToThread);

		await consumer.consume(
			makeStream([
				{
					type: 'tool-result',
					toolCallId: 'tc-1',
					toolName: 'slack_action',
					output: { ok: true },
				},
			]),
			thread,
		);

		expect(postErrorToThread).not.toHaveBeenCalled();
	});
});
