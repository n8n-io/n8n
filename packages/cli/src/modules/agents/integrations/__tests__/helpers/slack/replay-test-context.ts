import type { StreamChunk } from '@n8n/agents';
import type { AgentIntegrationConfig } from '@n8n/api-types';

import type {
	getIntegrationToolConnectionDescriptors,
	IntegrationMessageContext,
} from '../../../integration-tools';
import { SlackIntegration } from '../../../platforms/slack-integration';
import {
	createReplayContextSetup,
	type MemoryMessageContextStore,
	postableToText,
	type ReplayApiCall,
	type ReplayAuthor,
	ReplayChat,
	type ReplayContextSetup,
	type ReplayMessage,
	type ReplayPlatformAdapter,
	type ReplayPostable,
	sendJsonWebhook,
} from '../replay-test-helpers';

export interface SlackUserFixture {
	id: string;
	name: string;
	real_name: string;
}

export interface SlackChannelFixture {
	id: string;
	name: string;
}

export interface SlackEventFixture {
	token?: string;
	type: 'event_callback';
	team_id: string;
	authorizations?: Array<{
		team_id: string;
		user_id: string;
		is_bot: boolean;
	}>;
	event: {
		type: string;
		subtype?: string;
		user: string;
		text: string;
		ts: string;
		thread_ts?: string;
		channel: string;
		channel_type: string;
		team?: string;
		bot_id?: string;
	};
}

export interface SlackReplayFixtures {
	botUserId: string;
	user: SlackUserFixture;
	channel: SlackChannelFixture;
	mention: SlackEventFixture;
	followUp: SlackEventFixture;
	selfMessage: SlackEventFixture;
}

export type SlackApiCall = ReplayApiCall;

type SlackMessage = ReplayMessage<SlackEventFixture['event'], null>;

export interface SlackReplayContext
	extends Omit<ReplayContextSetup, 'agentExecutor' | 'nextStream' | 'chat'> {
	chat: ReplayChat<ReplayPostable, SlackMessage>;
	agentExecutor: {
		executeForChatPublished: jest.Mock;
	};
	apiCalls: SlackApiCall[];
	descriptor: ReturnType<typeof getIntegrationToolConnectionDescriptors>[number];
	integration: AgentIntegrationConfig;
	messageContextStore: MemoryMessageContextStore;
	sendWebhook: (payload: unknown) => Promise<Response>;
	latestContext: () => IntegrationMessageContext | undefined;
	latestThreadId: () => string | undefined;
	lastPost: () => SlackApiCall | undefined;
}

// TODO: Remove this fake adapter after the jest -> vitest migration. It only
// exists because the ESM-only `@chat-adapter/slack` package cannot be loaded in
// jest's VM sandbox; vitest can load it natively, letting tests use the real adapter.
class TestSlackAdapter implements ReplayPlatformAdapter<ReplayPostable, SlackMessage> {
	readonly name = 'slack';

	constructor(
		readonly botUserId: string,
		private readonly user: SlackUserFixture,
		private readonly apiCalls: SlackApiCall[],
	) {}

	async handleWebhook(
		request: Request,
		chat: ReplayChat<ReplayPostable, SlackMessage>,
		options?: { waitUntil?: (task: Promise<unknown>) => void },
	): Promise<Response> {
		const payload = (await request.json()) as SlackEventFixture;
		const event = payload.event;
		const threadTs = event.thread_ts ?? (event.channel_type === 'im' ? '' : event.ts);
		const threadId = `slack:${event.channel}:${threadTs}`;
		chat.processMessage(threadId, this.parseMessage(event, threadId), options);
		return new Response('OK', { status: 200 });
	}

	async postMessage(
		threadId: string,
		message: ReplayPostable,
	): Promise<{ id: string; threadId: string }> {
		const body = {
			channel: this.channelIdFromThreadId(threadId),
			thread_ts: this.threadTsFromThreadId(threadId),
			text: await postableToText(message),
		};
		this.apiCalls.push({ method: 'postMessage', body });
		await Promise.resolve();
		return { id: `${body.channel}:1719000999.000999`, threadId };
	}

	async postChannelMessage(
		channelId: string,
		message: ReplayPostable,
	): Promise<{ id: string; threadId: string }> {
		const body = {
			channel: channelId.replace(/^slack:/, ''),
			text: await postableToText(message),
		};
		this.apiCalls.push({ method: 'postMessage', body });
		await Promise.resolve();
		return {
			id: `${body.channel}:1719000999.000999`,
			threadId: `slack:${body.channel}:1719000999.000999`,
		};
	}

	channelIdFromThreadId(threadId: string): string {
		return threadId.split(':')[1] ?? threadId;
	}

	openDMThreadId(userId: string): string {
		return `slack:D_${userId}:1719000000.000100`;
	}

	async getUser(userId: string): Promise<ReplayAuthor> {
		return await Promise.resolve({
			userId,
			userName: userId,
			fullName: userId,
			isBot: userId === this.botUserId,
			isMe: userId === this.botUserId,
		});
	}

	shouldDispatchAsMention(threadId: string, message: SlackMessage): boolean {
		return message.isMention || this.isDM(threadId);
	}

	private isDM(threadId: string): boolean {
		return this.channelIdFromThreadId(threadId).startsWith('D');
	}

	private threadTsFromThreadId(threadId: string): string {
		return threadId.split(':').slice(2).join(':');
	}

	private parseMessage(event: SlackEventFixture['event'], threadId: string): SlackMessage {
		const isMe = event.user === this.botUserId || Boolean(event.bot_id);
		return {
			id: event.ts,
			threadId,
			text: event.text,
			raw: event,
			author: {
				userId: event.user,
				userName: event.user === this.user.id ? this.user.name : event.user,
				fullName: event.user === this.user.id ? this.user.real_name : event.user,
				isBot: isMe,
				isMe,
			},
			isMention: event.type === 'app_mention' || event.text.includes(`<@${this.botUserId}>`),
			subject: Promise.resolve(null),
		};
	}
}

export async function createSlackReplayContext(
	fixtures: SlackReplayFixtures,
	options: { stream?: StreamChunk[] } = {},
): Promise<SlackReplayContext> {
	await Promise.resolve();
	const apiCalls: SlackApiCall[] = [];
	const adapter = new TestSlackAdapter(fixtures.botUserId, fixtures.user, apiCalls);
	const chat = new ReplayChat(adapter);
	const setup = createReplayContextSetup({
		chat: chat as never,
		integrationImpl: new SlackIntegration(),
		integration: { type: 'slack', credentialId: 'cred-slack' },
		stream: options.stream,
	});

	const sendWebhook = async (payload: unknown) =>
		await sendJsonWebhook(
			chat.webhooks.slack,
			'https://n8n.example.com/rest/projects/project-1/agents/v2/agent-1/webhooks/slack',
			payload,
		);

	return {
		...setup,
		chat,
		apiCalls,
		sendWebhook,
		latestContext: () => setup.messageContextStore.latest(),
		latestThreadId: () => setup.messageContextStore.latestThreadId(),
		lastPost: () => apiCalls.filter((call) => call.method === 'postMessage').at(-1),
	};
}
