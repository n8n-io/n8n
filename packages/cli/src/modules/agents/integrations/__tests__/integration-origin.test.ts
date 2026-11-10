import type { AgentMessageIntegrationOrigin } from '@n8n/api-types';
import type { Message, Thread } from 'chat';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import type { AgentChatIntegration } from '../agent-chat-integration';
import { buildIntegrationOrigin, recordIntegrationOriginNames } from '../integration-origin';
import {
	buildDiscordOriginDraft,
	fetchDiscordOriginNames,
} from '../platforms/discord/discord-origin';
import { buildLinearOriginDraft, fetchLinearOriginNames } from '../platforms/linear/linear-origin';
import { buildSlackOriginDraft, fetchSlackOriginNames } from '../platforms/slack/slack-origin';
import { buildTeamsOriginDraft } from '../platforms/teams/teams-origin';
import { buildTelegramOriginDraft } from '../platforms/telegram/telegram-origin';
import { buildWhatsAppOriginDraft } from '../platforms/whatsapp/whatsapp-origin';

const logger = mock<Logger>();

/** Each integration class delegates to the builder from its own folder. */
function integrationFor(platform: string): AgentChatIntegration {
	const builders = {
		slack: buildSlackOriginDraft,
		discord: (_input: unknown, decoded: Record<string, unknown>) =>
			buildDiscordOriginDraft(decoded),
		linear: buildLinearOriginDraft,
		telegram: (_input: unknown, decoded: Record<string, unknown>) =>
			buildTelegramOriginDraft(decoded),
		teams: buildTeamsOriginDraft,
		whatsapp: (_input: unknown, decoded: Record<string, unknown>) =>
			buildWhatsAppOriginDraft(decoded),
	} as Record<string, AgentChatIntegration['buildOriginDraft']>;
	return { buildOriginDraft: builders[platform] } as unknown as AgentChatIntegration;
}

function makeThread(
	decoded: unknown,
	options: { isDM?: boolean; channelName?: string | Error; client?: unknown } = {},
): Thread<unknown, unknown> {
	const fetchMetadata =
		options.channelName instanceof Error
			? vi.fn().mockRejectedValue(options.channelName)
			: vi.fn().mockResolvedValue({ id: 'c', metadata: {}, name: options.channelName });
	return {
		id: 'thread-id',
		isDM: options.isDM ?? false,
		adapter: { decodeThreadId: vi.fn().mockReturnValue(decoded), client: options.client },
		channel: { fetchMetadata },
	} as unknown as Thread<unknown, unknown>;
}

const makeMessage = (raw: unknown = {}) => ({ raw }) as unknown as Message<unknown>;

describe('buildIntegrationOrigin', () => {
	it('records Slack workspace, conversation kind and channel without a name lookup', async () => {
		const thread = makeThread({ channel: 'C1', threadTs: '1.2' }, { channelName: 'general' });

		await expect(
			buildIntegrationOrigin(
				integrationFor('slack'),
				{ thread, message: makeMessage({ n8nWorkspaceId: 'T1', channel_type: 'channel' }) },
				logger,
			),
		).resolves.toEqual({
			type: 'slack',
			workspaceId: 'T1',
			conversationKind: 'channel',
			channelId: 'C1',
		});
		expect(thread.channel.fetchMetadata).not.toHaveBeenCalled();
	});

	it.each([
		{ name: 'dm', isDM: true, raw: { n8nWorkspaceId: 'T1', channel_type: 'im' }, kind: 'dm' },
		{
			name: 'group',
			isDM: true,
			raw: { n8nWorkspaceId: 'T1', channel_type: 'mpim' },
			kind: 'group',
		},
		{
			name: 'private channel',
			isDM: false,
			raw: { n8nWorkspaceId: 'T1', channel_type: 'group' },
			kind: 'channel',
		},
		{
			name: 'mention',
			isDM: false,
			raw: { n8nWorkspaceId: 'T1', type: 'app_mention' },
			kind: 'channel',
		},
	])('classifies a Slack $name conversation', async ({ isDM, raw, kind }) => {
		const thread = makeThread({ channel: 'G1', threadTs: '' }, { isDM, channelName: 'x' });

		const origin = await buildIntegrationOrigin(
			integrationFor('slack'),
			{ thread, message: makeMessage(raw) },
			logger,
		);

		expect(origin).toMatchObject({ type: 'slack', conversationKind: kind });
	});

	it.each([
		{},
		{ team_id: 'T_AUTHOR', team: 'T_AUTHOR', channel_type: 'channel' },
		{ n8nWorkspaceId: 123, channel_type: 'channel' },
		{ n8nWorkspaceId: 'T1' },
		{ n8nWorkspaceId: 'T1', channel_type: 'unsupported' },
	])('drops unresolved Slack origin %j', async (raw) => {
		const thread = makeThread({ channel: 'C1', threadTs: '' });

		await expect(
			buildIntegrationOrigin(
				integrationFor('slack'),
				{ thread, message: makeMessage(raw) },
				logger,
			),
		).resolves.toBeUndefined();
	});

	it('records a Discord server and omits it for a direct message', async () => {
		const server = makeThread({ guildId: 'G1', channelId: 'C1' }, { channelName: 'dev' });
		const dm = makeThread({ guildId: '@me', channelId: 'C2' }, { isDM: true });

		await expect(
			buildIntegrationOrigin(
				integrationFor('discord'),
				{ thread: server, message: makeMessage() },
				logger,
			),
		).resolves.toEqual({ type: 'discord', serverId: 'G1', channelId: 'C1' });
		await expect(
			buildIntegrationOrigin(
				integrationFor('discord'),
				{ thread: dm, message: makeMessage() },
				logger,
			),
		).resolves.toEqual({ type: 'discord', channelId: 'C2' });
	});

	it('records the Linear issue ID and the subject snapshot when available', async () => {
		const thread = makeThread({ issueId: 'issue-uuid' });
		const subject = { type: 'issue', id: 'ENG-1', title: 'Fix it', projectId: 'project-1' };

		await expect(
			buildIntegrationOrigin(
				integrationFor('linear'),
				{ thread, message: makeMessage(), subject },
				logger,
			),
		).resolves.toEqual({
			type: 'linear',
			issueId: 'issue-uuid',
			identifier: 'ENG-1',
			title: 'Fix it',
			projectId: 'project-1',
		});
		await expect(
			buildIntegrationOrigin(integrationFor('linear'), { thread, message: makeMessage() }, logger),
		).resolves.toEqual({ type: 'linear', issueId: 'issue-uuid' });
	});

	it('records the Linear team ID without a name lookup', async () => {
		const team = vi.fn();
		const thread = makeThread({ issueId: 'issue-uuid' }, { client: { team } });
		const subject = { type: 'issue', id: 'ENG-1', teamId: 'team-1' };

		await expect(
			buildIntegrationOrigin(
				integrationFor('linear'),
				{ thread, message: makeMessage(), subject: subject as never },
				logger,
			),
		).resolves.toEqual({
			type: 'linear',
			issueId: 'issue-uuid',
			identifier: 'ENG-1',
			teamId: 'team-1',
		});
		expect(team).not.toHaveBeenCalled();
	});

	it('omits empty optional Linear fields and keeps the issue ID', async () => {
		const thread = makeThread({ issueId: 'issue-uuid' });
		const subject = { type: 'issue', id: 'ENG-1', title: '' };

		await expect(
			buildIntegrationOrigin(
				integrationFor('linear'),
				{ thread, message: makeMessage(), subject },
				logger,
			),
		).resolves.toEqual({ type: 'linear', issueId: 'issue-uuid', identifier: 'ENG-1' });
	});

	it('records native identifiers for Telegram, Teams and WhatsApp', async () => {
		const telegram = makeThread({ chatId: '-100', messageThreadId: 7 });
		const teams = makeThread({
			conversationId: 'conv',
			conversationType: 'channel',
			serviceUrl: 'u',
		});
		const whatsapp = makeThread({ phoneNumberId: 'p1', userWaId: 'u1' });
		const message = makeMessage();

		await expect(
			buildIntegrationOrigin(integrationFor('telegram'), { thread: telegram, message }, logger),
		).resolves.toEqual({ type: 'telegram', chatId: '-100', messageThreadId: '7' });
		await expect(
			buildIntegrationOrigin(integrationFor('teams'), { thread: teams, message }, logger),
		).resolves.toEqual({ type: 'teams', conversationId: 'conv', conversationType: 'channel' });
		await expect(
			buildIntegrationOrigin(integrationFor('whatsapp'), { thread: whatsapp, message }, logger),
		).resolves.toEqual({ type: 'whatsapp', phoneNumberId: 'p1', userWaId: 'u1' });
	});

	describe('Teams conversation type', () => {
		const serviceUrl = 'https://smba.trafficmanager.net/teams/';

		async function teamsThread(conversationType: 'channel' | 'groupChat' | 'personal') {
			const { encodeThreadId, decodeThreadId } = await import('@chat-adapter/teams');
			const id = encodeThreadId({
				conversationId: '19:abc@thread.tacv2',
				conversationType,
				serviceUrl,
			});
			return {
				id,
				isDM: false,
				adapter: { decodeThreadId },
			} as unknown as Thread<unknown, unknown>;
		}

		it.each(['channel', 'groupChat'] as const)(
			'reads a %s type from the activity when the thread ID has none',
			async (conversationType) => {
				const thread = await teamsThread(conversationType);
				const message = makeMessage({ conversation: { conversationType } });

				await expect(
					buildIntegrationOrigin(integrationFor('teams'), { thread, message }, logger),
				).resolves.toEqual({
					type: 'teams',
					conversationId: '19:abc@thread.tacv2',
					conversationType,
				});
			},
		);

		it('falls back to the type in the thread ID when the activity has none', async () => {
			const thread = await teamsThread('personal');

			await expect(
				buildIntegrationOrigin(integrationFor('teams'), { thread, message: makeMessage() }, logger),
			).resolves.toMatchObject({ conversationType: 'personal' });
		});

		it('drops the origin when the activity reports an unknown type', async () => {
			const thread = await teamsThread('channel');
			const message = makeMessage({ conversation: { conversationType: 'meeting' } });

			await expect(
				buildIntegrationOrigin(integrationFor('teams'), { thread, message }, logger),
			).resolves.toBeUndefined();
		});
	});

	it('returns nothing when the adapter cannot decode the thread', async () => {
		const thread = makeThread(undefined);
		thread.adapter.decodeThreadId = vi.fn(() => {
			throw new Error('bad id');
		});

		await expect(
			buildIntegrationOrigin(
				integrationFor('telegram'),
				{ thread, message: makeMessage() },
				logger,
			),
		).resolves.toBeUndefined();
	});
});

describe('recordIntegrationOriginNames', () => {
	const slack = {
		type: 'slack',
		workspaceId: 'T1',
		conversationKind: 'channel',
		channelId: 'C1',
	} as const;
	const linear = { type: 'linear', issueId: 'issue-uuid', teamId: 'team-1' } as const;
	const namesFor = {
		slack: fetchSlackOriginNames,
		discord: fetchDiscordOriginNames,
		linear: fetchLinearOriginNames,
	};

	async function record(
		platform: keyof typeof namesFor,
		thread: Thread<unknown, unknown>,
		origin: AgentMessageIntegrationOrigin,
		save = vi.fn().mockResolvedValue(undefined),
	) {
		const integration = { fetchOriginNames: namesFor[platform] } as unknown as AgentChatIntegration;
		await recordIntegrationOriginNames(
			integration,
			{ thread, message: makeMessage() },
			origin,
			save,
			logger,
		);
		return save;
	}

	beforeEach(() => {
		logger.debug.mockClear();
	});

	it('saves the Slack channel name on the origin', async () => {
		const thread = makeThread({}, { channelName: 'general' });

		const save = await record('slack', thread, slack);

		expect(save).toHaveBeenCalledWith({ ...slack, channelName: 'general' });
	});

	it('saves the Discord channel name on the origin', async () => {
		const thread = makeThread({}, { channelName: 'dev' });
		const discord = { type: 'discord', serverId: 'G1', channelId: 'C1' } as const;

		const save = await record('discord', thread, discord);

		expect(save).toHaveBeenCalledWith({ ...discord, channelName: 'dev' });
	});

	it('saves the Linear team name on the origin', async () => {
		const team = vi.fn().mockResolvedValue({ name: 'Core' });
		const thread = makeThread({}, { client: { team } });

		const save = await record('linear', thread, linear);

		expect(team).toHaveBeenCalledWith('team-1');
		expect(save).toHaveBeenCalledWith({ ...linear, teamName: 'Core' });
	});

	it.each([
		{
			name: 'a Slack direct message',
			platform: 'slack' as const,
			thread: makeThread({}, { isDM: true }),
			origin: { ...slack, conversationKind: 'dm' } as const,
		},
		{
			name: 'a Discord direct message',
			platform: 'discord' as const,
			thread: makeThread({}, { isDM: true }),
			origin: { type: 'discord', channelId: 'C2' } as const,
		},
		{
			name: 'a Linear origin without a team',
			platform: 'linear' as const,
			thread: makeThread({}, { client: { team: vi.fn() } }),
			origin: { type: 'linear', issueId: 'issue-uuid' } as const,
		},
	])('does not look up a name for $name', async ({ platform, thread, origin }) => {
		const save = await record(platform, thread, origin);

		expect(thread.channel.fetchMetadata).not.toHaveBeenCalled();
		expect(save).not.toHaveBeenCalled();
	});

	it('logs a failed lookup and saves nothing', async () => {
		const thread = makeThread({}, { channelName: new Error('boom') });

		const save = await record('slack', thread, slack);

		expect(save).not.toHaveBeenCalled();
		expect(logger.debug).toHaveBeenCalledWith(
			'[AgentChatBridge] Failed to record integration origin names',
			{ type: 'slack', error: 'boom' },
		);
	});

	it('logs a lookup that does not settle within the timeout', async () => {
		vi.useFakeTimers();
		try {
			const team = vi.fn().mockReturnValue(new Promise(() => {}));
			const save = vi.fn();
			const pending = record('linear', makeThread({}, { client: { team } }), linear, save);

			await vi.advanceTimersByTimeAsync(500);
			await pending;

			expect(save).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'[AgentChatBridge] Failed to record integration origin names',
				{ type: 'linear', error: 'Timed out' },
			);
		} finally {
			vi.useRealTimers();
		}
	});

	it('logs a failed save and does not throw', async () => {
		const thread = makeThread({}, { channelName: 'general' });
		const save = vi.fn().mockRejectedValue(new Error('db down'));

		await expect(record('slack', thread, slack, save)).resolves.toBe(save);

		expect(logger.debug).toHaveBeenCalledWith(
			'[AgentChatBridge] Failed to record integration origin names',
			{ type: 'slack', error: 'db down' },
		);
	});

	it('does nothing for a channel without name lookups', async () => {
		const save = vi.fn();

		await recordIntegrationOriginNames(
			{} as AgentChatIntegration,
			{ thread: makeThread({}), message: makeMessage() },
			slack,
			save,
			logger,
		);

		expect(save).not.toHaveBeenCalled();
	});
});
