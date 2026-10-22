import { mock } from 'vitest-mock-extended';

import type { ChatInstance } from '../../../chat-integration.service';
import { executeTeamsContextQuery } from '../teams-operations';

const GRAPH = 'https://graph.microsoft.com/v1.0';

function graphError(status: number) {
	return Object.assign(new Error(`Graph ${status}`), { response: { status } });
}

function setup(routes: Record<string, unknown | Error>) {
	const get = vi.fn(async (url: string) => {
		const match = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
		if (!match) throw graphError(404);
		if (match[1] instanceof Error) throw match[1];
		return { data: match[1] };
	});
	const chat = mock<ChatInstance>();
	chat.getAdapter.mockReturnValue({ app: { graph: { http: { get } } } });
	const run = async (query: 'get_user' | 'search_users' | 'search_channels', input: object) =>
		await executeTeamsContextQuery({ chat, query, input: { ...input } });
	return { chat, get, run };
}

const alice = {
	id: '6b1f0c4e-1111-4222-8333-944455556666',
	displayName: 'Alice Example',
	mail: 'alice@contoso.com',
	userPrincipalName: 'alice@contoso.com',
};

describe('executeTeamsContextQuery', () => {
	describe('search_users', () => {
		it('finds a person by sign-in name or mail address in one request', async () => {
			const { run, get } = setup({ [`${GRAPH}/users?`]: { value: [alice] } });

			await expect(run('search_users', { email: 'alice@contoso.com' })).resolves.toEqual({
				ok: true,
				users: [
					{
						userId: alice.id,
						fullName: 'Alice Example',
						email: 'alice@contoso.com',
						userName: 'alice@contoso.com',
						isBot: false,
					},
				],
				resultCount: 1,
			});
			expect(get).toHaveBeenCalledTimes(1);
			expect(new URL(get.mock.calls[0][0]).searchParams.get('$filter')).toBe(
				"userPrincipalName eq 'alice@contoso.com' or mail eq 'alice@contoso.com'",
			);
		});

		it('treats a query with an @ as an email address', async () => {
			const { run, get } = setup({ [`${GRAPH}/users?`]: { value: [alice] } });

			await run('search_users', { query: 'alice@contoso.com' });

			expect(new URL(get.mock.calls[0][0]).searchParams.get('$filter')).toContain('mail eq');
		});

		it('rejects an email that is only whitespace', async () => {
			const { run, get } = setup({});

			await expect(run('search_users', { email: '   ' })).rejects.toThrow();
			expect(get).not.toHaveBeenCalled();
		});

		it('escapes a quote in a name search', async () => {
			const { run, get } = setup({ [`${GRAPH}/users?`]: { value: [] } });

			await run('search_users', { query: "O'Brien" });

			const filter = new URL(get.mock.calls[0][0]).searchParams.get('$filter');
			expect(filter).toContain("startswith(displayName,'O''Brien')");
		});

		it('tells the agent what to do when an admin has not approved the lookup', async () => {
			const { run } = setup({ [`${GRAPH}/users`]: graphError(403) });

			await expect(run('search_users', { email: 'alice@contoso.com' })).resolves.toEqual({
				ok: false,
				error: {
					code: 'PERMISSION_NOT_GRANTED',
					message: expect.stringContaining('User.ReadBasic.All'),
				},
			});
		});
	});

	describe('get_user', () => {
		it('asks the adapter for a Bot Framework ID, which Graph does not know', async () => {
			const { run, chat, get } = setup({});
			chat.getUser.mockResolvedValue({ userId: '29:abc' } as never);

			await expect(run('get_user', { userId: '29:abc' })).resolves.toEqual({
				ok: true,
				user: { userId: '29:abc' },
			});
			expect(get).not.toHaveBeenCalled();
		});

		it('returns null for an unknown person', async () => {
			const { run } = setup({});

			await expect(run('get_user', { userId: alice.id })).resolves.toEqual({
				ok: true,
				user: null,
			});
		});
	});

	describe('search_channels', () => {
		const routes = {
			[`${GRAPH}/teams?`]: {
				value: [
					{ id: 'team-1', displayName: 'Marketing' },
					{ id: 'team-2', displayName: 'Engineering' },
				],
			},
			[`${GRAPH}/teams/team-1/channels`]: {
				value: [
					{ id: '19:general-m@thread.tacv2', displayName: 'General' },
					{ id: '19:news@thread.tacv2', displayName: 'Daily news' },
				],
			},
			[`${GRAPH}/teams/team-2/channels`]: {
				value: [{ id: '19:general-e@thread.tacv2', displayName: 'General' }],
			},
		};

		it('matches team and channel names together', async () => {
			const { run } = setup(routes);

			await expect(run('search_channels', { query: 'marketing general' })).resolves.toEqual({
				ok: true,
				channels: [
					{
						channelId: '19:general-m@thread.tacv2',
						name: 'General',
						teamId: 'team-1',
						teamName: 'Marketing',
					},
				],
				resultCount: 1,
			});
		});

		it('returns every team that has a matching channel', async () => {
			const { run } = setup(routes);

			const result = await run('search_channels', { query: '#General' });

			expect(result).toMatchObject({ ok: true, resultCount: 2 });
		});

		it('skips a team whose channels cannot be read', async () => {
			const { run } = setup({ ...routes, [`${GRAPH}/teams/team-2/channels`]: graphError(404) });

			await expect(run('search_channels', { query: 'general' })).resolves.toMatchObject({
				ok: true,
				resultCount: 1,
			});
		});

		it('fails the search when a team cannot be read for another reason', async () => {
			const { run } = setup({ ...routes, [`${GRAPH}/teams/team-2/channels`]: graphError(500) });

			await expect(run('search_channels', { query: 'general' })).rejects.toThrow('Graph 500');
		});

		it('says when a team has more channels than the first page', async () => {
			const { run } = setup({
				...routes,
				[`${GRAPH}/teams/team-1/channels`]: {
					value: [{ id: '19:general-m@thread.tacv2', displayName: 'General' }],
					'@odata.nextLink': `${GRAPH}/teams/team-1/channels?$skiptoken=x`,
				},
			});

			await expect(run('search_channels', { query: 'general' })).resolves.toMatchObject({
				ok: true,
				note: expect.stringContaining('first page of channels'),
			});
		});

		it('says when only part of a large organisation was searched', async () => {
			const { run } = setup({
				...routes,
				[`${GRAPH}/teams?`]: {
					value: [{ id: 'team-1', displayName: 'Marketing' }],
					'@odata.nextLink': `${GRAPH}/teams?$skiptoken=x`,
				},
			});

			await expect(run('search_channels', { query: 'general' })).resolves.toMatchObject({
				ok: true,
				note: expect.stringContaining('at most 50 teams'),
			});
		});

		it('tells the agent what to do when an admin has not approved the lookup', async () => {
			const { run } = setup({ [`${GRAPH}/teams`]: graphError(403) });

			await expect(run('search_channels', { query: 'general' })).resolves.toMatchObject({
				ok: false,
				error: { code: 'PERMISSION_NOT_GRANTED' },
			});
		});
	});
});
