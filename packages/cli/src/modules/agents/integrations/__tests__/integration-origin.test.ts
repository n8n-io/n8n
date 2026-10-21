import type { Message, Thread } from 'chat';
import { mock } from 'vitest-mock-extended';
import type { Logger } from 'n8n-workflow';

import { buildIntegrationOrigin } from '../integration-origin';

const logger = mock<Logger>();

function makeThread(
	decoded: unknown,
	options: { isDM?: boolean; channelName?: string | Error } = {},
): Thread<unknown, unknown> {
	const fetchMetadata =
		options.channelName instanceof Error
			? vi.fn().mockRejectedValue(options.channelName)
			: vi.fn().mockResolvedValue({ id: 'c', metadata: {}, name: options.channelName });
	return {
		id: 'thread-id',
		isDM: options.isDM ?? false,
		adapter: { decodeThreadId: vi.fn().mockReturnValue(decoded) },
		channel: { fetchMetadata },
	} as unknown as Thread<unknown, unknown>;
}

const makeMessage = (raw: unknown = {}) => ({ raw }) as unknown as Message<unknown>;

describe('buildIntegrationOrigin', () => {
	it('records Slack workspace, conversation kind, channel and name', async () => {
		const thread = makeThread({ channel: 'C1', threadTs: '1.2' }, { channelName: 'general' });

		await expect(
			buildIntegrationOrigin(
				{ platform: 'slack', thread, message: makeMessage({ team_id: 'T1' }) },
				logger,
			),
		).resolves.toEqual({
			type: 'slack',
			workspaceId: 'T1',
			conversationKind: 'channel',
			channelId: 'C1',
			channelName: 'general',
		});
	});

	it.each([
		{ name: 'dm', isDM: true, raw: { team_id: 'T1' }, kind: 'dm' },
		{ name: 'group', isDM: false, raw: { team_id: 'T1', channel_type: 'mpim' }, kind: 'group' },
	])('classifies a Slack $name conversation', async ({ isDM, raw, kind }) => {
		const thread = makeThread({ channel: 'G1', threadTs: '' }, { isDM, channelName: 'x' });

		const origin = await buildIntegrationOrigin(
			{ platform: 'slack', thread, message: makeMessage(raw) },
			logger,
		);

		expect(origin).toMatchObject({ type: 'slack', conversationKind: kind });
	});

	it('does not look up a name for a Slack direct message', async () => {
		const thread = makeThread({ channel: 'D1', threadTs: '' }, { isDM: true });

		const origin = await buildIntegrationOrigin(
			{ platform: 'slack', thread, message: makeMessage({ team_id: 'T1' }) },
			logger,
		);

		expect(origin).toMatchObject({ type: 'slack', conversationKind: 'dm', channelName: undefined });
		expect(thread.channel.fetchMetadata).not.toHaveBeenCalled();
	});

	it('keeps IDs when the channel name lookup fails', async () => {
		const thread = makeThread({ channel: 'C1', threadTs: '' }, { channelName: new Error('boom') });

		await expect(
			buildIntegrationOrigin(
				{ platform: 'slack', thread, message: makeMessage({ team_id: 'T1' }) },
				logger,
			),
		).resolves.toEqual({
			type: 'slack',
			workspaceId: 'T1',
			conversationKind: 'channel',
			channelId: 'C1',
		});
	});

	it('drops the origin when a required ID is missing', async () => {
		const thread = makeThread({ channel: 'C1', threadTs: '' });

		await expect(
			buildIntegrationOrigin({ platform: 'slack', thread, message: makeMessage() }, logger),
		).resolves.toBeUndefined();
	});

	it('records a Discord server and omits it for a direct message', async () => {
		const server = makeThread({ guildId: 'G1', channelId: 'C1' }, { channelName: 'dev' });
		const dm = makeThread({ guildId: '@me', channelId: 'C2' }, { isDM: true });

		await expect(
			buildIntegrationOrigin(
				{ platform: 'discord', thread: server, message: makeMessage() },
				logger,
			),
		).resolves.toEqual({ type: 'discord', serverId: 'G1', channelId: 'C1', channelName: 'dev' });
		await expect(
			buildIntegrationOrigin({ platform: 'discord', thread: dm, message: makeMessage() }, logger),
		).resolves.toEqual({ type: 'discord', channelId: 'C2' });
	});

	it('records the Linear issue ID and the subject snapshot when available', async () => {
		const thread = makeThread({ issueId: 'issue-uuid' });
		const subject = { type: 'issue', id: 'ENG-1', title: 'Fix it', projectId: 'project-1' };

		await expect(
			buildIntegrationOrigin(
				{ platform: 'linear', thread, message: makeMessage(), subject },
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
			buildIntegrationOrigin({ platform: 'linear', thread, message: makeMessage() }, logger),
		).resolves.toEqual({ type: 'linear', issueId: 'issue-uuid' });
	});

	it('omits empty optional Linear fields and keeps the issue ID', async () => {
		const thread = makeThread({ issueId: 'issue-uuid' });
		const subject = { type: 'issue', id: 'ENG-1', title: '' };

		await expect(
			buildIntegrationOrigin(
				{ platform: 'linear', thread, message: makeMessage(), subject },
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
			buildIntegrationOrigin({ platform: 'telegram', thread: telegram, message }, logger),
		).resolves.toEqual({ type: 'telegram', chatId: '-100', messageThreadId: '7' });
		await expect(
			buildIntegrationOrigin({ platform: 'teams', thread: teams, message }, logger),
		).resolves.toEqual({ type: 'teams', conversationId: 'conv', conversationType: 'channel' });
		await expect(
			buildIntegrationOrigin({ platform: 'whatsapp', thread: whatsapp, message }, logger),
		).resolves.toEqual({ type: 'whatsapp', phoneNumberId: 'p1', userWaId: 'u1' });
	});

	it('returns nothing when the adapter cannot decode the thread', async () => {
		const thread = makeThread(undefined);
		thread.adapter.decodeThreadId = vi.fn(() => {
			throw new Error('bad id');
		});

		await expect(
			buildIntegrationOrigin({ platform: 'telegram', thread, message: makeMessage() }, logger),
		).resolves.toBeUndefined();
	});
});
