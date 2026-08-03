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
			'do_not_respond',
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

	describe('getReplyExpectation', () => {
		const platformAgentContext = { agentUserId: 'U_BOT' };

		const slackMessage = (raw: Record<string, unknown>, text = 'hello') => ({ text, raw }) as never;

		it('requires a reply for new mentions and DM starts', () => {
			expect(
				integration.getReplyExpectation({
					message: slackMessage({ channel: 'C123' }),
					isNewMention: true,
					platformAgentContext,
				}),
			).toBe('required');
		});

		it('requires a reply for follow-up messages in a DM', () => {
			expect(
				integration.getReplyExpectation({
					message: slackMessage({ channel: 'D123', channel_type: 'im' }),
					isNewMention: false,
					platformAgentContext,
				}),
			).toBe('required');

			expect(
				integration.getReplyExpectation({
					message: slackMessage({ channel: 'D123' }),
					isNewMention: false,
					platformAgentContext,
				}),
			).toBe('required');
		});

		it('does not infer a mention from raw message text', () => {
			expect(
				integration.getReplyExpectation({
					message: slackMessage({ channel: 'C123', text: '<@U_BOT> what do you think?' }),
					isNewMention: false,
					platformAgentContext,
				}),
			).toBe('optional');
		});

		it('requires a reply when the adapter flags the message as a mention, even without a bot user ID', () => {
			expect(
				integration.getReplyExpectation({
					message: { text: 'hello', isMention: true, raw: { channel: 'C123' } } as never,
					isNewMention: false,
					platformAgentContext: {},
				}),
			).toBe('required');
		});

		it('makes the reply optional for unaddressed follow-ups in subscribed channels', () => {
			expect(
				integration.getReplyExpectation({
					message: slackMessage({ channel: 'C123', channel_type: 'channel' }),
					isNewMention: false,
					platformAgentContext,
				}),
			).toBe('optional');
		});

		it('requires a reply when the raw payload is unavailable', () => {
			expect(
				integration.getReplyExpectation({
					message: slackMessage(undefined as never),
					isNewMention: false,
					platformAgentContext,
				}),
			).toBe('required');
		});
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
