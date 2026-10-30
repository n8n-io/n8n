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
	const channels = async (input: Record<string, unknown>, abortSignal?: AbortSignal) =>
		await executeSlackContextQuery({ chat, query: 'search_channels', input, abortSignal });
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
			nextCursor: expect.any(String),
			resultCount: 1,
		});
		expect(list).toHaveBeenCalledExactlyOnceWith({ limit: 200 });
	});

	it('continues past empty pages and stops as soon as a matching user is found', async () => {
		const { run, list } = setup();
		list
			.mockResolvedValueOnce({
				members: [{ id: 'U99999999', real_name: 'Another Person', name: 'another' }],
				response_metadata: { next_cursor: 'page-2' },
			})
			.mockResolvedValueOnce({
				members: [person],
				response_metadata: { next_cursor: 'page-3' },
			});

		await expect(run({ query: 'Example Person' })).resolves.toMatchObject({
			ok: true,
			users: [{ userId: person.id }],
			resultCount: 1,
			nextCursor: expect.any(String),
		});
		expect(list.mock.calls.map(([options]) => options)).toEqual([
			{ limit: 200 },
			{ limit: 200, cursor: 'page-2' },
		]);
	});

	it('returns a successful empty result only after the directory ends', async () => {
		const { run, list } = setup();
		list
			.mockResolvedValueOnce({ members: [person], response_metadata: { next_cursor: 'page-2' } })
			.mockResolvedValueOnce({ members: [], response_metadata: {} });

		await expect(run({ query: 'Other Person' })).resolves.toEqual({
			ok: true,
			users: [],
			resultCount: 0,
		});
		expect(list).toHaveBeenCalledTimes(2);
	});

	it('returns an incomplete-search error and a usable continuation after five empty pages', async () => {
		const { run, list } = setup();
		list.mockImplementation(async () => ({
			members: [],
			response_metadata: { next_cursor: `page-${list.mock.calls.length + 1}` },
		}));
		const response = await run({ query: 'Example Person', limit: 1, includeDeleted: true });
		expect(response).not.toHaveProperty('users');
		expect(response).not.toHaveProperty('resultCount');

		const result = z
			.object({
				ok: z.literal(false),
				error: z.object({
					code: z.literal('CONTEXT_SEARCH_INCOMPLETE'),
					message: z.string(),
				}),
				searchComplete: z.literal(false),
				nextCursor: z.string(),
				nextQuery: z.object({
					query: z.literal('search_users'),
					input: z.record(z.unknown()),
				}),
			})
			.parse(response);
		expect(result.error.message).toContain('Do not report that the user does not exist');
		expect(list).toHaveBeenCalledTimes(5);
		expect(result.nextQuery.input).toMatchObject({
			query: 'Example Person',
			limit: 1,
			includeDeleted: true,
			cursor: result.nextCursor,
		});
		list.mockResolvedValueOnce({ members: [person], response_metadata: {} });

		await expect(run(result.nextQuery.input)).resolves.toMatchObject({
			ok: true,
			users: [{ userId: person.id }],
		});
		expect(list).toHaveBeenLastCalledWith({ limit: 200, cursor: 'page-6' });
	});

	it('returns a match on the last allowed page', async () => {
		const { run, list } = setup();
		list.mockImplementation(async () => ({
			members: list.mock.calls.length === 5 ? [person] : [],
			response_metadata: { next_cursor: `page-${list.mock.calls.length + 1}` },
		}));

		await expect(run({ query: 'Example Person' })).resolves.toMatchObject({
			ok: true,
			users: [{ userId: person.id }],
			nextCursor: expect.any(String),
		});
		expect(list).toHaveBeenCalledTimes(5);
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

	it('searches an uppercase name when the direct user lookup does not find an ID', async () => {
		const { run, info, list } = setup();
		info.mockRejectedValue(
			Object.assign(new Error('Not found'), { data: { error: 'user_not_found' } }),
		);
		list.mockResolvedValue({ members: [{ ...person, real_name: 'Example Washington' }] });
		await expect(run({ query: 'WASHINGTON' })).resolves.toMatchObject({
			users: [{ userId: person.id }],
		});
		expect(info).toHaveBeenCalledExactlyOnceWith({ user: 'WASHINGTON' });
		expect(list).toHaveBeenCalledExactlyOnceWith({ limit: 200 });
	});

	it('returns an empty result for an unknown explicit user mention without scanning', async () => {
		const { run, info, list } = setup();
		info.mockRejectedValue(
			Object.assign(new Error('Not found'), { data: { error: 'user_not_found' } }),
		);
		await expect(run({ query: '<@U12345678>' })).resolves.toMatchObject({
			users: [],
			resultCount: 0,
		});
		expect(list).not.toHaveBeenCalled();
	});

	it('does not scan after a direct user lookup fails for another reason', async () => {
		const { run, info, list } = setup();
		info.mockRejectedValue(new Error('Request failed'));
		await expect(run({ query: 'WASHINGTON' })).rejects.toThrow('Request failed');
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
		});
		expect(list).not.toHaveBeenCalled();
	});

	it('does not start a directory scan after an email lookup has a transient error', async () => {
		const { run, lookupByEmail, list } = setup();
		lookupByEmail.mockRejectedValue(new Error('Request failed'));
		await expect(run({ email: 'person@example.com' })).rejects.toThrow('Request failed');
		expect(list).not.toHaveBeenCalled();
	});

	it.each([false, true])(
		'reports missing email permission without scanning users (includeDeleted: %s)',
		async (includeDeleted) => {
			const { run, lookupByEmail, list } = setup();
			lookupByEmail.mockRejectedValue(
				Object.assign(new Error('Missing scope'), { data: { error: 'missing_scope' } }),
			);
			await expect(run({ email: 'person@example.com', includeDeleted })).resolves.toEqual({
				ok: false,
				error: {
					code: 'PERMISSION_NOT_GRANTED',
					message: expect.stringContaining('users:read.email'),
				},
			});
			expect(list).not.toHaveBeenCalled();
		},
	);

	it('searches the directory for a deactivated email user when requested', async () => {
		const { run, lookupByEmail, list } = setup();
		lookupByEmail.mockRejectedValue(
			Object.assign(new Error('Not found'), { data: { error: 'users_not_found' } }),
		);
		list.mockResolvedValue({
			members: [{ ...person, deleted: true, profile: { email: 'person@example.com' } }],
		});
		await expect(run({ email: 'person@example.com', includeDeleted: true })).resolves.toMatchObject(
			{
				users: [{ userId: person.id }],
			},
		);
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

	it.each([
		{ query: 'Another' },
		{ query: 'Example', includeBots: true },
		{ query: 'Example', includeDeleted: true },
		{ query: 'Example', email: 'person@example.com' },
	])('rejects changed user search criteria: %j', async (input) => {
		const { run, list } = setup();
		list.mockResolvedValue({ members: [person], response_metadata: { next_cursor: 'page-2' } });
		const first = userPageSchema.parse(await run({ query: 'Example' }));
		await expect(run({ ...input, cursor: first.nextCursor })).rejects.toThrow('cursor is invalid');
		expect(list).toHaveBeenCalledTimes(1);
	});

	it('accepts normalized criteria and a new result limit for a user continuation', async () => {
		const { run, list } = setup();
		list.mockResolvedValue({ members: [person, { ...person, id: 'U2' }] });
		const first = userPageSchema.parse(await run({ query: 'Example', limit: 1 }));
		await expect(
			run({ query: ' @EXAMPLE ', limit: 2, cursor: first.nextCursor }),
		).resolves.toMatchObject({ users: [{ userId: 'U2' }], resultCount: 1 });
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

	it('does not request another directory page after cancellation', async () => {
		const { run, list } = setup();
		const controller = new AbortController();
		list.mockImplementationOnce(async () => {
			controller.abort();
			return { members: [], response_metadata: { next_cursor: 'page-2' } };
		});

		await expect(run({ query: 'Example Person' }, controller.signal)).rejects.toThrow();
		expect(list).toHaveBeenCalledTimes(1);
	});

	it('continues past empty channel pages and stops at the first matching page', async () => {
		const { channels, conversationsList } = setup();
		conversationsList
			.mockResolvedValueOnce({
				channels: [{ id: 'C1', name: 'other' }],
				response_metadata: { next_cursor: 'page-2' },
			})
			.mockResolvedValueOnce({
				channels: [{ id: 'C2', name: 'team' }],
				response_metadata: { next_cursor: 'page-3' },
			});

		await expect(channels({ query: '#team' })).resolves.toMatchObject({
			ok: true,
			channels: [{ channelId: 'C2' }],
			resultCount: 1,
			nextCursor: expect.any(String),
		});
		expect(conversationsList.mock.calls.map(([options]) => options)).toEqual([
			{ exclude_archived: true, limit: 200, types: 'public_channel,private_channel' },
			{
				exclude_archived: true,
				limit: 200,
				types: 'public_channel,private_channel',
				cursor: 'page-2',
			},
		]);
	});

	it('returns a successful empty channel result only after the directory ends', async () => {
		const { channels, conversationsList } = setup();
		conversationsList
			.mockResolvedValueOnce({
				channels: [{ id: 'C1', name: 'other' }],
				response_metadata: { next_cursor: 'page-2' },
			})
			.mockResolvedValueOnce({ channels: [], response_metadata: {} });

		await expect(channels({ query: 'team' })).resolves.toEqual({
			ok: true,
			channels: [],
			resultCount: 0,
		});
		expect(conversationsList).toHaveBeenCalledTimes(2);
	});

	it('returns an incomplete channel search with a usable continuation after five empty pages', async () => {
		const { channels, conversationsList } = setup();
		conversationsList.mockImplementation(async () => ({
			channels: [],
			response_metadata: { next_cursor: `page-${conversationsList.mock.calls.length + 1}` },
		}));
		const response = await channels({ query: 'team', limit: 1, includeArchived: true });
		expect(response).not.toHaveProperty('channels');
		expect(response).not.toHaveProperty('resultCount');
		const result = z
			.object({
				ok: z.literal(false),
				error: z.object({ code: z.literal('CONTEXT_SEARCH_INCOMPLETE'), message: z.string() }),
				searchComplete: z.literal(false),
				nextCursor: z.string(),
				nextQuery: z.object({
					query: z.literal('search_channels'),
					input: z.record(z.unknown()),
				}),
			})
			.parse(response);
		expect(result.error.message).toContain('Do not report that the channel does not exist');
		expect(conversationsList).toHaveBeenCalledTimes(5);
		expect(result.nextQuery.input).toMatchObject({
			query: 'team',
			limit: 1,
			includeArchived: true,
			cursor: result.nextCursor,
		});
		conversationsList.mockResolvedValueOnce({
			channels: [{ id: 'C1', name: 'team', is_archived: true }],
			response_metadata: {},
		});

		await expect(channels(result.nextQuery.input)).resolves.toMatchObject({
			ok: true,
			channels: [{ channelId: 'C1', isArchived: true }],
		});
		expect(conversationsList).toHaveBeenLastCalledWith({
			exclude_archived: false,
			limit: 200,
			types: 'public_channel,private_channel',
			cursor: 'page-6',
		});
	});

	it('returns a channel match on the last allowed page', async () => {
		const { channels, conversationsList } = setup();
		conversationsList.mockImplementation(async () => ({
			channels: conversationsList.mock.calls.length === 5 ? [{ id: 'C1', name: 'team' }] : [],
			response_metadata: { next_cursor: `page-${conversationsList.mock.calls.length + 1}` },
		}));

		await expect(channels({ query: 'team' })).resolves.toMatchObject({
			ok: true,
			channels: [{ channelId: 'C1' }],
			nextCursor: expect.any(String),
		});
		expect(conversationsList).toHaveBeenCalledTimes(5);
	});

	it('does not request another channel page after cancellation', async () => {
		const { channels, conversationsList } = setup();
		const controller = new AbortController();
		conversationsList.mockImplementationOnce(async () => {
			controller.abort();
			return { channels: [], response_metadata: { next_cursor: 'page-2' } };
		});

		await expect(channels({ query: 'team' }, controller.signal)).rejects.toThrow();
		expect(conversationsList).toHaveBeenCalledTimes(1);
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

	it.each([{ query: 'other' }, { query: 'team', includeArchived: true }])(
		'rejects changed channel search criteria: %j',
		async (input) => {
			const { channels, conversationsList } = setup();
			conversationsList.mockResolvedValue({
				channels: [
					{ id: 'C1', name: 'team-one' },
					{ id: 'C2', name: 'team-two' },
				],
			});
			const first = z
				.object({ nextCursor: z.string() })
				.parse(await channels({ query: 'team', limit: 1 }));
			await expect(channels({ ...input, cursor: first.nextCursor })).rejects.toThrow(
				'cursor is invalid',
			);
			expect(conversationsList).toHaveBeenCalledTimes(1);
		},
	);
});
