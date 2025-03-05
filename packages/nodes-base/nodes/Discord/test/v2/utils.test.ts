import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as transport from '../../v2//transport/discord.api';
import {
	createSimplifyFunction,
	prepareOptions,
	prepareEmbeds,
	checkAccessToGuild,
	setupChannelGetter,
} from '../../v2/helpers/utils';

const node: INode = {
	id: '1',
	name: 'Discord node',
	typeVersion: 2,
	type: 'n8n-nodes-base.discord',
	position: [60, 760],
	parameters: {
		resource: 'channel',
		operation: 'get',
	},
};

describe('Test Discord > createSimplifyFunction', () => {
	it('should create function', () => {
		const result = createSimplifyFunction(['message_reference']);
		expect(result).toBeDefined();
		expect(typeof result).toBe('function');
	});

	it('should return object containing only specified fields', () => {
		const simplify = createSimplifyFunction(['id', 'name']);
		const data = {
			id: '123',
			name: 'test',
			type: 'test',
			randomField: 'test',
		};
		const result = simplify(data);
		expect(result).toEqual({
			id: '123',
			name: 'test',
		});
	});
});

describe('Test Discord > prepareOptions', () => {
	it('should return correct flag value', () => {
		const result = prepareOptions({
			flags: ['SUPPRESS_EMBEDS', 'SUPPRESS_NOTIFICATIONS'],
		});
		expect(result.flags).toBe((1 << 2) + (1 << 12));
	});

	it('should convert message_reference', () => {
		const result = prepareOptions(
			{
				message_reference: '123456',
			},
			'789000',
		);
		expect(result.message_reference).toEqual({
			message_id: '123456',
			guild_id: '789000',
		});
	});
});

describe('Test Discord > prepareEmbeds', () => {
	it('should return return empty object removing empty strings', () => {
		const embeds = [
			{
				test1: 'test',
				test2: 'test',
				description: 'test',
			},
		];

		const executeFunction = {};

		const result = prepareEmbeds.call(executeFunction as unknown as IExecuteFunctions, embeds);

		expect(result).toEqual(embeds);
	});
});

describe('Test Discord > checkAccessToGuild', () => {
	it('should throw error', () => {
		const guildId = '123456';
		const guilds = [
			{
				id: '789000',
			},
		];

		expect(() => {
			checkAccessToGuild(node, guildId, guilds);
		}).toThrow('You do not have access to the guild with the id 123456');
	});

	it('should pass', () => {
		const guildId = '123456';
		const guilds = [
			{
				id: '123456',
			},
			{
				id: '789000',
			},
		];

		expect(() => {
			checkAccessToGuild(node, guildId, guilds);
		}).not.toThrow();
	});
});

describe('Test Discord > setupChannelGetter & checkAccessToChannel', () => {
	const discordApiRequestSpy = jest.spyOn(transport, 'discordApiRequest');
	discordApiRequestSpy.mockImplementation(async (method: string) => {
		if (method === 'GET') {
			return {
				guild_id: '123456',
			};
		}
	});

	it('should setup channel getter and get channel id', async () => {
		const fakeExecuteFunction = (auth: string) => {
			return {
				getNodeParameter: (parameter: string) => {
					if (parameter === 'authentication') return auth;
					if (parameter === 'channelId') return '42';
				},
				getNode: () => node,
			} as unknown as IExecuteFunctions;
		};

		const userGuilds = [
			{
				id: '789000',
			},
		];

		try {
			const getChannel = await setupChannelGetter.call(fakeExecuteFunction('oAuth2'), userGuilds);
			await getChannel(0);
		} catch (error) {
			expect(error.message).toBe('You do not have access to the guild with the id 123456');
		}

		const getChannel = await setupChannelGetter.call(fakeExecuteFunction('botToken'), userGuilds);
		const channelId = await getChannel(0);
		expect(channelId).toBe('42');
	});
});
