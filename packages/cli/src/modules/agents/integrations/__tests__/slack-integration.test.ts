/* eslint-disable @typescript-eslint/unbound-method -- mock-based tests intentionally reference unbound methods */
import type { AgentIntegrationConfig } from '@n8n/api-types';
import type { Thread } from 'chat';
import { mock } from 'vitest-mock-extended';

import { ConflictError } from '@/errors/response-errors/conflict.error';

import type { AgentRepository } from '../../repositories/agent.repository';
import type { AgentChatIntegrationContext } from '../agent-chat-integration';
import type { ChatInstance } from '../chat-integration.service';
import { loadSlackAdapter } from '../esm-loader';
import { SlackIntegration } from '../platforms/slack/slack-integration';

vi.mock('../esm-loader', () => ({
	loadSlackAdapter: vi.fn(),
}));

const mockedLoadSlackAdapter = vi.mocked(loadSlackAdapter);

describe('SlackIntegration', () => {
	let integration: SlackIntegration;
	const createSlackAdapter = vi.fn();

	beforeEach(() => {
		integration = new SlackIntegration(mock<AgentRepository>());
		createSlackAdapter.mockReset();
		createSlackAdapter.mockReturnValue({ marker: 'adapter' });
		mockedLoadSlackAdapter.mockReset();
		mockedLoadSlackAdapter.mockResolvedValue({
			createSlackAdapter,
		} as unknown as Awaited<ReturnType<typeof loadSlackAdapter>>);
	});

	function connectionContext(config: AgentIntegrationConfig): AgentChatIntegrationContext {
		return {
			agentId: 'agent-1',
			projectId: 'project-1',
			integration: config,
			credentialId: config.credentialId,
			credential: {
				accessToken: 'xoxb-token',
				signatureSecret: 'signing-secret',
			},
			ingressEnabled: true,
			webhookUrlFor: () => 'https://example.test/webhook',
		};
	}

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

	it('keeps existing Slack integrations on the Assistant messaging experience', async () => {
		await integration.createAdapter(
			connectionContext({ type: 'slack', credentialId: 'credential-1' }),
		);

		expect(createSlackAdapter).toHaveBeenCalledWith({
			botToken: 'xoxb-token',
			signingSecret: 'signing-secret',
			agentView: false,
		});
	});

	it('enables Agent view for new Slack integrations', async () => {
		await integration.createAdapter(
			connectionContext({
				type: 'slack',
				credentialId: 'credential-1',
				settings: { messagingExperience: 'agent' },
			}),
		);

		expect(createSlackAdapter).toHaveBeenCalledWith({
			botToken: 'xoxb-token',
			signingSecret: 'signing-secret',
			agentView: true,
		});
	});

	it('does not subscribe a conversation-scoped DM in Agent view', async () => {
		const subscribe = vi.fn();
		const thread = { id: 'slack:D123:', subscribe } as unknown as Thread<unknown, unknown>;

		await integration.prepareSentThread(thread, {
			type: 'slack',
			credentialId: 'credential-1',
			settings: { messagingExperience: 'agent' },
		});

		expect(subscribe).not.toHaveBeenCalled();
	});

	it('keeps subscribing outbound threads for existing Slack integrations', async () => {
		const subscribe = vi.fn();
		const thread = { id: 'slack:D123:', subscribe } as unknown as Thread<unknown, unknown>;

		await integration.prepareSentThread(thread, {
			type: 'slack',
			credentialId: 'credential-1',
		});

		expect(subscribe).toHaveBeenCalledOnce();
	});

	it('rejects a credential already connected to another agent', async () => {
		const agentRepository = mock<AgentRepository>();
		agentRepository.findByIntegrationCredential.mockResolvedValue([
			{ id: 'other-agent', name: 'Other Agent' },
		] as never);
		integration = new SlackIntegration(agentRepository);

		await expect(
			integration.onBeforeConnect({
				agentId: 'agent-1',
				projectId: 'project-1',
				integration: { type: 'slack', credentialId: 'credential-1' },
				credentialId: 'credential-1',
				credential: {},
				ingressEnabled: true,
				webhookUrlFor: vi.fn(),
			}),
		).rejects.toThrow(ConflictError);
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

	describe('messageThreadId', () => {
		it('anchors a top-level post at the sent message ts', () => {
			expect(integration.messageThreadId({ id: '123.456', threadId: 'slack:C123:' })).toBe(
				'slack:C123:123.456',
			);
			expect(integration.messageThreadId({ id: '123.456', threadId: 'slack:D123:' })).toBe(
				'slack:D123:123.456',
			);
			expect(integration.messageThreadId({ id: '123.456', threadId: 'slack:G123:' })).toBe(
				'slack:G123:123.456',
			);
		});

		it('returns undefined when the message is already in an anchored thread', () => {
			expect(
				integration.messageThreadId({ id: '123.457', threadId: 'slack:C123:123.456' }),
			).toBeUndefined();
			expect(
				integration.messageThreadId({ id: '123.457', threadId: 'slack:D123:123.456' }),
			).toBeUndefined();
			expect(
				integration.messageThreadId({ id: '123.457', threadId: 'slack:G123:123.456' }),
			).toBeUndefined();
		});

		it('returns undefined for non-Slack thread ids', () => {
			expect(
				integration.messageThreadId({ id: 'msg-1', threadId: 'telegram:12345' }),
			).toBeUndefined();
			expect(
				integration.messageThreadId({ id: 'msg-1', threadId: 'linear:issue-1' }),
			).toBeUndefined();
		});

		it('does not re-anchor conversation-scoped DMs on inbound', () => {
			expect(
				integration.messageThreadId({ id: '123.456', threadId: 'slack:D123:' }, { inbound: true }),
			).toBeUndefined();
			expect(
				integration.messageThreadId({ id: '123.456', threadId: 'slack:C123:' }, { inbound: true }),
			).toBe('slack:C123:123.456');
		});

		it('does not re-anchor inbound group DMs, but re-anchors private channels', () => {
			expect(
				integration.messageThreadId(
					{ id: '123.456', threadId: 'slack:G123:', raw: { channel_type: 'mpim' } },
					{ inbound: true },
				),
			).toBeUndefined();
			expect(
				integration.messageThreadId(
					{ id: '123.456', threadId: 'slack:G123:', raw: { channel_type: 'group' } },
					{ inbound: true },
				),
			).toBe('slack:G123:123.456');
			expect(
				integration.messageThreadId({ id: '123.456', threadId: 'slack:G123:' }, { inbound: true }),
			).toBe('slack:G123:123.456');
		});
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
