import { mock } from 'vitest-mock-extended';
import { z } from 'zod';

import type { ChatInstance } from '../chat-integration.service';
import { executeSlackContextQuery } from '../platforms/slack/slack-operations';

const person = { id: 'U12345678', real_name: 'Example Person', name: 'example' };

function setup() {
	const list = vi.fn().mockResolvedValue({ members: [], response_metadata: {} });
	const info = vi.fn().mockResolvedValue({ user: person });
	const lookupByEmail = vi.fn().mockResolvedValue({ user: person });
	const conversationsList = vi.fn().mockResolvedValue({ channels: [], response_metadata: {} });
	const chat = mock<ChatInstance>();
	chat.getAdapter.mockReturnValue({
		client: { users: { list, info, lookupByEmail }, conversations: { list: conversationsList } },
	});
	const run = async (input: Record<string, unknown>, abortSignal?: AbortSignal) =>
		await executeSlackContextQuery({ chat, query: 'search_users', input, abortSignal });
	const channels = async (input: Record<string, unknown>) =>
		await executeSlackContextQuery({ chat, query: 'search_channels', input });
	return { run, channels, list, info, lookupByEmail, conversationsList, chat };
}

const userPageSchema = z.object({
	users: z.array(z.object({ userId: z.string() })),
	nextCursor: z.string().optional(),
});

describe('Slack directory search', () => {
	it('returns a match from the first large page without scanning the workspace', async () => {
		const { run, list } = setup();
		list.mockResolvedValue({ members: [person], response_metadata: { next_cursor: 'page-2' } });
		await expect(run({ query: 'Example Person' })).resolves.toMatchObject({
			users: [{ userId: person.id }],
			nextCursor: 'page-2',
			resultCount: 1,
		});
		expect(list).toHaveBeenCalledExactlyOnceWith({ limit: 200 });
	});

	it('continues past an empty page and returns a match from the next directory page', async () => {
		const { run, list } = setup();
		list
			.mockResolvedValueOnce({
				members: [{ ...person, real_name: 'Other Person', name: 'other' }],
				response_metadata: { next_cursor: 'page-2' },
			})
			.mockResolvedValueOnce({ members: [person], response_metadata: { next_cursor: 'page-3' } });
		await expect(run({ query: 'Example Person' })).resolves.toMatchObject({
			users: [{ userId: person.id }],
			resultCount: 1,
			nextCursor: 'page-3',
		});
		expect(list.mock.calls.map(([options]) => options)).toEqual([
			{ limit: 200 },
			{ limit: 200, cursor: 'page-2' },
		]);
	});

	it('reports an incomplete search after five empty directory pages', async () => {
		const { run, list } = setup();
		list.mockImplementation(async () => ({
			members: [person],
			response_metadata: { next_cursor: `page-${list.mock.calls.length + 1}` },
		}));
		await expect(run({ query: 'Other Person' })).resolves.toMatchObject({
			ok: true,
			users: [],
			resultCount: 0,
			searchComplete: false,
			nextCursor: 'page-6',
			message: expect.stringContaining('search is incomplete'),
		});
		expect(list).toHaveBeenCalledTimes(5);
		list.mockResolvedValueOnce({
			members: [{ ...person, real_name: 'Other Person' }],
			response_metadata: {},
		});
		await expect(run({ query: 'Other Person', cursor: 'page-6' })).resolves.toMatchObject({
			users: [{ userId: person.id }],
			resultCount: 1,
			searchComplete: true,
		});
		expect(list).toHaveBeenLastCalledWith({ limit: 200, cursor: 'page-6' });
	});

	it('reports no matches only after the directory ends', async () => {
		const { run, list } = setup();
		list
			.mockResolvedValueOnce({ members: [person], response_metadata: { next_cursor: 'page-2' } })
			.mockResolvedValueOnce({ members: [], response_metadata: {} });
		await expect(run({ query: 'Other Person' })).resolves.toEqual({
			ok: true,
			users: [],
			resultCount: 0,
			searchComplete: true,
		});
		expect(list).toHaveBeenCalledTimes(2);
	});

	it('keeps every matching user when the result limit splits a directory page', async () => {
		const { run, list } = setup();
		list.mockImplementation(async (options: { cursor?: string }) =>
			options.cursor === 'page-2'
				? { members: [{ ...person, id: 'U4' }], response_metadata: {} }
				: {
						members: ['U1', 'U2', 'U3'].map((id) => ({ ...person, id })),
						response_metadata: { next_cursor: 'page-2' },
					},
		);
		let cursor: string | undefined;
		const ids: string[] = [];
		for (let page = 0; page < 4; page++) {
			const result = userPageSchema.parse(
				await run({ query: 'Example', limit: 1, ...(cursor ? { cursor } : {}) }),
			);
			ids.push(...result.users.map((user) => user.userId));
			cursor = result.nextCursor;
		}
		expect(ids).toEqual(['U1', 'U2', 'U3', 'U4']);
		expect(cursor).toBeUndefined();
		expect(list.mock.calls.map(([options]) => options)).toEqual([
			{ limit: 200 },
			{ limit: 200 },
			{ limit: 200 },
			{ limit: 200, cursor: 'page-2' },
		]);
	});

	it.each(['U12345678', '<@U12345678>'])('uses a direct lookup for %s', async (query) => {
		const { run, info, list } = setup();
		await expect(run({ query })).resolves.toMatchObject({ users: [{ userId: person.id }] });
		expect(info).toHaveBeenCalledExactlyOnceWith({ user: person.id });
		expect(list).not.toHaveBeenCalled();
	});

	it.each([{ email: 'person@example.com' }, { query: 'person@example.com' }])(
		'returns an exact email result without listing users: %j',
		async (input) => {
			const { run, lookupByEmail, list } = setup();
			await expect(run(input)).resolves.toMatchObject({ users: [{ userId: person.id }] });
			expect(lookupByEmail).toHaveBeenCalledExactlyOnceWith({ email: 'person@example.com' });
			expect(list).not.toHaveBeenCalled();
		},
	);

	it('returns an empty result for an unknown active email address', async () => {
		const { run, lookupByEmail, list } = setup();
		lookupByEmail.mockRejectedValue(
			Object.assign(new Error('Not found'), { data: { error: 'users_not_found' } }),
		);
		await expect(run({ email: 'unknown@example.com' })).resolves.toEqual({
			ok: true,
			users: [],
			resultCount: 0,
			searchComplete: true,
		});
		expect(list).not.toHaveBeenCalled();
	});

	it('does not start a directory scan after an email lookup has a transient error', async () => {
		const { run, lookupByEmail, list } = setup();
		lookupByEmail.mockRejectedValue(new Error('Request failed'));
		await expect(run({ email: 'person@example.com' })).rejects.toThrow('Request failed');
		expect(list).not.toHaveBeenCalled();
	});

	it('uses a directory page when the token cannot use email lookup', async () => {
		const { run, lookupByEmail, list } = setup();
		lookupByEmail.mockRejectedValue(
			Object.assign(new Error('Missing scope'), { data: { error: 'missing_scope' } }),
		);
		list.mockResolvedValue({ members: [{ ...person, profile: { email: 'person@example.com' } }] });
		await expect(run({ email: 'person@example.com' })).resolves.toMatchObject({ resultCount: 1 });
		expect(list).toHaveBeenCalledExactlyOnceWith({ limit: 200 });
	});

	it('excludes bots and deleted users from direct results', async () => {
		const { run, info } = setup();
		info.mockResolvedValue({ user: { ...person, is_bot: true } });
		await expect(run({ query: person.id })).resolves.toMatchObject({ resultCount: 0 });
		await expect(run({ query: person.id, includeBots: true })).resolves.toMatchObject({
			resultCount: 1,
		});
		info.mockResolvedValue({ user: { ...person, deleted: true } });
		await expect(run({ query: person.id })).resolves.toMatchObject({ resultCount: 0 });
	});

	it('rejects a repeated platform cursor', async () => {
		const { run, list } = setup();
		list.mockResolvedValue({ members: [], response_metadata: { next_cursor: 'same-page' } });
		await expect(run({ query: 'Example', cursor: 'same-page' })).rejects.toThrow(
			'same search cursor',
		);
		expect(list).toHaveBeenCalledTimes(1);
	});

	it('rejects an invalid continuation before calling Slack', async () => {
		const { run, list } = setup();
		await expect(run({ query: 'Example', cursor: 'n8n-slack:invalid' })).rejects.toThrow(
			'cursor is invalid',
		);
		expect(list).not.toHaveBeenCalled();
	});

	it('stops before the next directory page after cancellation', async () => {
		const { run, list } = setup();
		const controller = new AbortController();
		list.mockImplementationOnce(async () => {
			controller.abort();
			return { members: [], response_metadata: { next_cursor: 'page-2' } };
		});
		await expect(run({ query: 'Example' }, controller.signal)).rejects.toThrow();
		expect(list).toHaveBeenCalledTimes(1);
	});

	it('does not start a Slack request after cancellation during token resolution', async () => {
		const { run, chat, list } = setup();
		const controller = new AbortController();
		chat.getAdapter.mockReturnValue({
			client: { users: { list } },
			withToken: async (options: object) => {
				controller.abort();
				return options;
			},
		});
		await expect(run({ query: 'Example' }, controller.signal)).rejects.toThrow();
		expect(list).not.toHaveBeenCalled();
	});

	it('keeps every matching channel when the result limit splits a directory page', async () => {
		const { channels, conversationsList } = setup();
		conversationsList.mockResolvedValue({
			channels: [
				{ id: 'C1', name: 'team-one' },
				{ id: 'C2', name: 'team-two' },
			],
			response_metadata: {},
		});
		const first = z
			.object({ nextCursor: z.string() })
			.parse(await channels({ query: 'team', limit: 1 }));
		await expect(
			channels({ query: 'team', limit: 1, cursor: first.nextCursor }),
		).resolves.toMatchObject({ channels: [{ channelId: 'C2' }], resultCount: 1 });
		expect(conversationsList).toHaveBeenCalledTimes(2);
	});
});
