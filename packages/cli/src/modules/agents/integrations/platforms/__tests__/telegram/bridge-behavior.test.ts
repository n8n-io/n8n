/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { Thread } from 'chat';
import type { Logger } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import {
	createTelegramBridgeExecutionContext,
	createTelegramResumeExecutionContext,
	startTelegramTypingIndicator,
} from '../../telegram-bridge-behavior';

const REFRESH_MS = 4000;
const MAX_LIFETIME_MS = 10 * 60 * 1000;

describe('telegram-bridge-behavior', () => {
	let thread: ReturnType<typeof mock<Thread<unknown, unknown>>>;
	let logger: ReturnType<typeof mock<Logger>>;

	beforeEach(() => {
		vi.useFakeTimers();
		thread = mock<Thread<unknown, unknown>>();
		thread.startTyping.mockResolvedValue(undefined);
		logger = mock<Logger>();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('startTelegramTypingIndicator', () => {
		it('sends the typing indicator immediately on start', () => {
			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			expect(thread.startTyping).toHaveBeenCalledTimes(1);
		});

		it('re-sends the typing indicator on every refresh interval', async () => {
			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			await vi.advanceTimersByTimeAsync(REFRESH_MS);
			expect(thread.startTyping).toHaveBeenCalledTimes(2);

			await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);
			expect(thread.startTyping).toHaveBeenCalledTimes(4);
		});

		it('stops re-sending after clearBeforeResponse', async () => {
			const handle = startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			await vi.advanceTimersByTimeAsync(REFRESH_MS);
			await handle.clearBeforeResponse();
			const callsAtClear = thread.startTyping.mock.calls.length;

			await vi.advanceTimersByTimeAsync(REFRESH_MS * 5);
			expect(thread.startTyping).toHaveBeenCalledTimes(callsAtClear);
		});

		it('stops re-sending after the max lifetime even when never cleared', async () => {
			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			await vi.advanceTimersByTimeAsync(MAX_LIFETIME_MS);
			const callsAtCap = thread.startTyping.mock.calls.length;

			await vi.advanceTimersByTimeAsync(REFRESH_MS * 5);
			expect(thread.startTyping).toHaveBeenCalledTimes(callsAtCap);
		});

		it('awaits an in-flight send on clearBeforeResponse so the reply posts after it', async () => {
			let resolveSend: () => void = () => {};
			thread.startTyping.mockReturnValue(
				new Promise<void>((resolve) => {
					resolveSend = resolve;
				}),
			);

			const handle = startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			let cleared = false;
			const clearing = handle.clearBeforeResponse().then(() => {
				cleared = true;
			});

			await vi.advanceTimersByTimeAsync(0);
			expect(cleared).toBe(false);

			resolveSend();
			await clearing;
			expect(cleared).toBe(true);
		});

		it('skips refresh ticks while a previous send is still in flight', async () => {
			thread.startTyping.mockReturnValue(new Promise<void>(() => {}));

			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });

			await vi.advanceTimersByTimeAsync(REFRESH_MS * 3);
			expect(thread.startTyping).toHaveBeenCalledTimes(1);
		});

		it('warns again for a new failure streak after a successful send', async () => {
			thread.startTyping
				.mockRejectedValueOnce(new Error('first streak'))
				.mockResolvedValueOnce(undefined)
				.mockRejectedValueOnce(new Error('second streak'));

			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });
			await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);

			expect(logger.warn).toHaveBeenCalledTimes(2);
		});

		it('keeps trying when startTyping rejects, warning once and debug-logging repeats', async () => {
			thread.startTyping.mockRejectedValue(new Error('boom'));

			startTelegramTypingIndicator(thread, { logger, agentId: 'agent-1' });
			await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);

			expect(thread.startTyping).toHaveBeenCalledTimes(3);
			expect(logger.warn).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'[AgentChatBridge] Failed to send Telegram typing indicator',
				expect.objectContaining({ agentId: 'agent-1', error: 'boom' }),
			);
			expect(logger.debug).toHaveBeenCalledTimes(2);
		});
	});

	describe('createTelegramBridgeExecutionContext', () => {
		it('returns a status handle that drives the typing indicator', async () => {
			const context = createTelegramBridgeExecutionContext({
				chat: mock(),
				thread,
				message: mock(),
				logger,
				agentId: 'agent-1',
				isNewMention: false,
			});

			expect(context.platformAgentContext).toEqual({});
			expect(thread.startTyping).toHaveBeenCalledTimes(1);

			await context.statusHandle?.clearBeforeResponse();
			await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);
			expect(thread.startTyping).toHaveBeenCalledTimes(1);
		});
	});

	describe('createTelegramResumeExecutionContext', () => {
		it('returns a status handle that drives the typing indicator', async () => {
			const context = createTelegramResumeExecutionContext({
				thread,
				logger,
				agentId: 'agent-1',
			});

			expect(thread.startTyping).toHaveBeenCalledTimes(1);

			await context.statusHandle?.clearBeforeResponse();
			await vi.advanceTimersByTimeAsync(REFRESH_MS * 2);
			expect(thread.startTyping).toHaveBeenCalledTimes(1);
		});
	});
});
