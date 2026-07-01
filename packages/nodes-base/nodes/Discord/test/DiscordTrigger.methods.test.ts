import type { ILoadOptionsFunctions } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { getChannels, getRoles, guildSearch } from '../DiscordTrigger.methods';

function buildContext() {
	const requestWithAuthentication = vi.fn();
	const ctx = mock<ILoadOptionsFunctions>();
	ctx.helpers.requestWithAuthentication =
		requestWithAuthentication as unknown as typeof ctx.helpers.requestWithAuthentication;
	return { ctx, requestWithAuthentication };
}

describe('DiscordTrigger listSearch methods', () => {
	it('guildSearch maps the bot guilds to results', async () => {
		const { ctx, requestWithAuthentication } = buildContext();
		requestWithAuthentication.mockResolvedValue([
			{ id: '111', name: 'My Server' },
			{ id: '222', name: 'Other' },
		]);

		const result = await guildSearch.call(ctx);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'discordBotApi',
			expect.objectContaining({ method: 'GET', url: expect.stringContaining('/users/@me/guilds') }),
		);
		expect(result.results).toEqual([
			{ name: 'My Server', value: '111', url: 'https://discord.com/channels/111' },
			{ name: 'Other', value: '222', url: 'https://discord.com/channels/222' },
		]);
	});

	it('getChannels scopes to the selected guild and skips container channels', async () => {
		const { ctx, requestWithAuthentication } = buildContext();
		ctx.getNodeParameter.mockReturnValue('111');
		requestWithAuthentication.mockResolvedValue([
			{ id: 'c1', name: 'General', type: 0 }, // text
			{ id: 'c2', name: 'Voice', type: 2 }, // voice (text-in-voice) - kept
			{ id: 'cat', name: 'A Category', type: 4 }, // container - dropped
			{ id: 'forum', name: 'A Forum', type: 15 }, // container - dropped
			{ id: 'media', name: 'A Media', type: 16 }, // container - dropped
		]);

		const result = await getChannels.call(ctx);

		expect(requestWithAuthentication).toHaveBeenCalledWith(
			'discordBotApi',
			expect.objectContaining({ url: expect.stringContaining('/guilds/111/channels') }),
		);
		expect(result).toEqual([
			{ name: 'General', value: 'c1' },
			{ name: 'Voice', value: 'c2' },
		]);
	});

	it('getChannels returns [] when no guild is selected', async () => {
		const { ctx, requestWithAuthentication } = buildContext();
		ctx.getNodeParameter.mockReturnValue('');

		const result = await getChannels.call(ctx);

		expect(result).toEqual([]);
		expect(requestWithAuthentication).not.toHaveBeenCalled();
	});

	it('getRoles drops @everyone and sorts by position descending', async () => {
		const { ctx, requestWithAuthentication } = buildContext();
		ctx.getNodeParameter.mockReturnValue('111');
		requestWithAuthentication.mockResolvedValue([
			{ id: '111', name: '@everyone', position: 0 }, // id === guildId → dropped
			{ id: 'r1', name: 'Member', position: 1 },
			{ id: 'r2', name: 'Admin', position: 5 },
		]);

		const result = await getRoles.call(ctx);

		expect(result).toEqual([
			{ name: 'Admin', value: 'r2' },
			{ name: 'Member', value: 'r1' },
		]);
	});

	it('getRoles returns [] when no guild is selected', async () => {
		const { ctx, requestWithAuthentication } = buildContext();
		ctx.getNodeParameter.mockReturnValue('');

		const result = await getRoles.call(ctx);

		expect(result).toEqual([]);
		expect(requestWithAuthentication).not.toHaveBeenCalled();
	});
});
