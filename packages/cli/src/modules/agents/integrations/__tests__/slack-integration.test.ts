import { SlackIntegration } from '../platforms/slack-integration';
import type { ChatInstance } from '../chat-integration.service';

describe('SlackIntegration', () => {
	let integration: SlackIntegration;

	beforeEach(() => {
		integration = new SlackIntegration();
	});

	it('advertises Slack messaging and reaction actions', () => {
		expect(integration.actions).toEqual([
			'respond',
			'send_dm',
			'send_channel_message',
			'add_reaction',
		]);
	});

	it('only advertises Slack bot token credentials for agent integrations', () => {
		expect(integration.credentialTypes).toEqual(['slackApi']);
	});

	it('extracts the Slack bot user ID for bridge message context', () => {
		const chat = {
			getAdapter: vi.fn().mockReturnValue({ botUserId: 'U_BOT' }),
		} as unknown as ChatInstance;

		expect(integration.getPlatformAgentContext(chat)).toEqual({ agentUserId: 'U_BOT' });
		expect(chat.getAdapter).toHaveBeenCalledWith('slack');
	});

	it('strips Slack bot self-mentions before handing text to the agent', () => {
		expect(integration.prepareInboundText('<@U_BOT> hello', { agentUserId: 'U_BOT' })).toBe(
			'hello',
		);
		expect(integration.prepareInboundText('@U_BOT hello', { agentUserId: 'U_BOT' })).toBe('hello');
	});

	it('sets a thinking status and buffers resume responses for Slack actions', async () => {
		const thread = {
			startTyping: vi.fn().mockResolvedValue(undefined),
		};

		const context = await integration.createResumeExecutionContext({
			chat: {
				getAdapter: vi.fn().mockReturnValue(undefined),
			} as unknown as ChatInstance,
			thread: thread as never,
			logger: { warn: vi.fn() } as never,
			agentId: 'agent-1',
		});

		expect(context.forceBuffered).toBe(true);
		expect(context.statusHandle).toBeUndefined();
		expect(thread.startTyping).toHaveBeenCalledWith('Thinking...');
	});

	describe('handleUnauthenticatedWebhook', () => {
		it('echoes the challenge for a url_verification event', () => {
			const result = integration.handleUnauthenticatedWebhook({
				type: 'url_verification',
				challenge: 'abc123',
			});

			expect(result).toEqual({ status: 200, body: { challenge: 'abc123' } });
		});

		it('returns undefined for non-verification events', () => {
			const result = integration.handleUnauthenticatedWebhook({
				type: 'event_callback',
				event: { type: 'message', text: 'hi' },
			});

			expect(result).toBeUndefined();
		});

		it.each([
			['missing challenge', { type: 'url_verification' }],
			['non-string challenge', { type: 'url_verification', challenge: 42 }],
		])('returns undefined for malformed url_verification body (%s)', (_label, body) => {
			expect(integration.handleUnauthenticatedWebhook(body)).toBeUndefined();
		});

		it.each([
			['null', null],
			['undefined', undefined],
			['string', 'hello'],
			['number', 42],
		])('returns undefined for non-object body (%s)', (_label, body) => {
			expect(integration.handleUnauthenticatedWebhook(body)).toBeUndefined();
		});
	});
});
