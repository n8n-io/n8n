import type { ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { channelRLC, textChannelRLC } from '../../../v2/actions/common.description';
import { channelSearch, textChannelSearch } from '../../../v2/methods/listSearch';
import { discordApiRequest } from '../../../v2/transport';

vi.mock('../../../v2/transport', () => ({ discordApiRequest: vi.fn() }));

const channels = [
	{ id: '300', name: 'zebra', type: 0 },
	{ id: '400', name: 'Beta-voice', type: 2 },
	{ id: '200', name: 'Team-zeta', type: 5 },
	{ id: '100', name: 'alpha', type: 0 },
	{ id: '500', name: 'team-alpha', type: 0 },
	{ id: '600', name: 'team-category', type: 4 },
	{ id: '700', name: 'stage', type: 13 },
	{ id: '800', name: 'forum', type: 15 },
];

describe.each([
	{
		name: 'channelSearch',
		search: channelSearch,
		locator: channelRLC,
		expected: [
			['alpha', '100'],
			['Beta-voice', '400'],
			['forum', '800'],
			['stage', '700'],
			['team-alpha', '500'],
			['Team-zeta', '200'],
			['zebra', '300'],
		],
	},
	{
		name: 'textChannelSearch',
		search: textChannelSearch,
		locator: textChannelRLC,
		expected: [
			['alpha', '100'],
			['forum', '800'],
			['stage', '700'],
			['team-alpha', '500'],
			['Team-zeta', '200'],
			['zebra', '300'],
		],
	},
])('Discord v2 > $name', ({ name, search, locator, expected }) => {
	const context = mock<ILoadOptionsFunctions>();

	beforeEach(() => {
		vi.resetAllMocks();
		context.getNodeParameter.mockImplementation((parameter) => {
			if (parameter === 'guildId') return '123456';
			if (parameter === 'authentication') return 'botToken';
			return '';
		});
		context.getNode.mockReturnValue(mock<INode>());
		vi.mocked(discordApiRequest).mockResolvedValue(channels);
	});

	it('enables search in the channel list mode', () => {
		expect(locator.modes?.find((mode) => mode.name === 'list')?.typeOptions).toEqual({
			searchListMethod: name,
			searchable: true,
		});
	});

	it.each([undefined, ''])('returns all eligible channels for filter %j', async (filter) => {
		const result = await search.call(context, filter);

		expect(context.getNodeParameter).toHaveBeenCalledWith('guildId', undefined, {
			extractValue: true,
		});
		expect(discordApiRequest).toHaveBeenCalledExactlyOnceWith('GET', '/guilds/123456/channels');
		expect(result).toEqual({
			results: expected.map(([name, value]) => ({
				name,
				value,
				url: `https://discord.com/channels/123456/${value}`,
			})),
		});
	});

	it('matches part of a channel name without case sensitivity and sorts the matches', async () => {
		const result = await search.call(context, 'TeAm');

		expect(result.results.map(({ name, value, url }) => [name, value, url])).toEqual([
			['team-alpha', '500', 'https://discord.com/channels/123456/500'],
			['Team-zeta', '200', 'https://discord.com/channels/123456/200'],
		]);
	});

	it('returns no results when no channel name matches', async () => {
		await expect(search.call(context, 'missing')).resolves.toEqual({ results: [] });
	});

	it('returns no results for an empty server', async () => {
		vi.mocked(discordApiRequest).mockResolvedValue([]);

		await expect(search.call(context, 'team')).resolves.toEqual({ results: [] });
	});

	it('checks server access for OAuth2 before it loads channels', async () => {
		context.getNodeParameter.mockReturnValueOnce('123456').mockReturnValueOnce('oAuth2');
		vi.mocked(discordApiRequest)
			.mockResolvedValueOnce([{ id: '123456' }])
			.mockResolvedValueOnce(channels);

		const result = await search.call(context, 'ALPHA');

		expect(discordApiRequest).toHaveBeenNthCalledWith(1, 'GET', '/users/@me/guilds');
		expect(discordApiRequest).toHaveBeenNthCalledWith(2, 'GET', '/guilds/123456/channels');
		expect(result.results.map((channel) => channel.value)).toEqual(['100', '500']);
	});

	it('keeps the OAuth2 server access check when a filter is set', async () => {
		context.getNodeParameter.mockReturnValueOnce('123456').mockReturnValueOnce('oAuth2');
		vi.mocked(discordApiRequest).mockResolvedValueOnce([{ id: '654321' }]);

		await expect(search.call(context, 'team')).rejects.toThrow(
			'You do not have access to the guild with the id 123456',
		);
		expect(discordApiRequest).toHaveBeenCalledExactlyOnceWith('GET', '/users/@me/guilds');
	});
});
