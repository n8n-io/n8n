import { enrichGmail, GMAIL_PROFILE, withMailbox } from '../http-profiles';

const b64 = (text: string) => Buffer.from(text).toString('base64url');

const message = (over: Record<string, unknown> = {}) => ({
	id: '1a1f32cf20c4c2fb',
	threadId: '1a1f32cf20c4c2fb',
	labelIds: ['INBOX', 'UNREAD'],
	internalDate: '1794997523948',
	payload: {
		mimeType: 'multipart/alternative',
		headers: [
			{ name: 'From', value: 'Jo <jo@vendor.test>' },
			{ name: 'To', value: 'guard@unknown.invalid' },
			{ name: 'Subject', value: 'Hello probe' },
			{ name: 'Message-ID', value: '<abc@vendor.test>' },
			{ name: 'In-Reply-To', value: '<prev@vendor.test>' },
		],
		parts: [
			{ mimeType: 'text/html', body: { data: b64('<p>Body html</p>') } },
			{ mimeType: 'text/plain', body: { data: b64('Body text') } },
		],
	},
	...over,
});

describe('enrichGmail', () => {
	it('adds flat header fields, the decoded plain body, an ISO date and the read state', () => {
		const out = enrichGmail(message()) as Record<string, unknown>;

		expect(out.hdr).toEqual({
			from: 'Jo <jo@vendor.test>',
			to: 'guard@unknown.invalid',
			subject: 'Hello probe',
			messageId: '<abc@vendor.test>',
			inReplyTo: '<prev@vendor.test>',
		});
		expect(out.decodedBody).toBe('Body text');
		expect(out.isoDate).toBe(new Date(1794997523948).toISOString());
		expect(out.isRead).toBe(false);
	});

	it('reads a body that sits in the payload and falls back to html when there is no plain part', () => {
		const single = message({
			payload: {
				mimeType: 'text/plain',
				headers: [],
				body: { data: b64('Single body') },
			},
		});
		const htmlOnly = message({
			payload: {
				mimeType: 'multipart/alternative',
				headers: [],
				parts: [{ mimeType: 'text/html', body: { data: b64('<b>x</b>') } }],
			},
		});

		expect((enrichGmail(single) as Record<string, unknown>).decodedBody).toBe('Single body');
		expect((enrichGmail(htmlOnly) as Record<string, unknown>).decodedBody).toBe('<b>x</b>');
	});

	it('marks a message without the UNREAD label as read', () => {
		const out = enrichGmail(message({ labelIds: ['INBOX'] })) as Record<string, unknown>;

		expect(out.isRead).toBe(true);
	});

	it('enriches the messages of a thread and leaves a list of ids as it is', () => {
		const thread = enrichGmail({ id: 't1', messages: [message(), message({ id: 'x2' })] }) as {
			messages: Array<Record<string, unknown>>;
		};
		const list = { messages: [{ id: 'a', threadId: 'a' }] };

		expect(thread.messages.map((m) => m.isRead)).toEqual([false, false]);
		expect(enrichGmail(list)).toEqual(list);
	});

	it('does not throw on data that is not a message', () => {
		expect(enrichGmail(null)).toBeNull();
		expect(enrichGmail('text')).toBe('text');
		expect(enrichGmail({ id: 'x', payload: 'bad' })).toEqual({ id: 'x', payload: 'bad' });
	});

	it('cuts a long body', () => {
		const big = message({
			payload: { mimeType: 'text/plain', headers: [], body: { data: b64('a'.repeat(50_000)) } },
		});

		expect(((enrichGmail(big) as Record<string, unknown>).decodedBody as string).length).toBe(
			20_000,
		);
	});
});

describe('Gmail lookups', () => {
	const ids = Array.from({ length: 12 }, (_, i) => ({ id: `1a1f32cf20c4c2f${i.toString(16)}` }));

	it('reads the first 8 messages of a list in full', () => {
		const reads = GMAIL_PROFILE.lookups?.(
			'read_list_messages',
			{ method: 'GET', path: '/gmail/v1/users/me/messages' },
			{ messages: ids },
		);

		expect(reads).toHaveLength(8);
		expect(reads?.[0]).toEqual({
			tool: 'read_get_messages',
			args: {
				method: 'GET',
				path: '/gmail/v1/users/me/messages/1a1f32cf20c4c2f0',
				query: { format: 'full' },
			},
		});
	});

	it('reads the first 8 threads of a thread list', () => {
		const reads = GMAIL_PROFILE.lookups?.(
			'read_list_threads',
			{ method: 'GET', path: '/gmail/v1/users/me/threads' },
			{ threads: ids },
		);

		expect(reads).toHaveLength(8);
		expect(reads?.[0].args.path).toBe('/gmail/v1/users/me/threads/1a1f32cf20c4c2f0');
	});

	it('reads the message that a write names', () => {
		const reads = GMAIL_PROFILE.lookups?.('write_post_messages_modify', {
			method: 'POST',
			path: '/gmail/v1/users/me/messages/1a1f32cf20c4c2fb/modify',
		});

		expect(reads).toEqual([
			{
				tool: 'read_get_messages',
				args: {
					method: 'GET',
					path: '/gmail/v1/users/me/messages/1a1f32cf20c4c2fb',
					query: { format: 'full' },
				},
			},
		]);
	});

	it('reads nothing for a send, a draft, a label list or a single message read', () => {
		const none = (tool: string, path: string, result?: unknown) =>
			GMAIL_PROFILE.lookups?.(tool, { method: 'POST', path }, result);

		expect(none('write_post_messages_send', '/gmail/v1/users/me/messages/send')).toEqual([]);
		expect(none('write_post_drafts', '/gmail/v1/users/me/drafts')).toEqual([]);
		expect(none('read_list_labels', '/gmail/v1/users/me/labels', { labels: [] })).toEqual([]);
		expect(
			none('read_get_messages', '/gmail/v1/users/me/messages/1a1f32cf20c4c2fb', message()),
		).toEqual([]);
	});
});

describe('Gmail hydration rules', () => {
	it('skips the hydration of a label list that has only system labels', () => {
		const system = { labels: [{ id: 'INBOX', type: 'system' }] };
		const user = { labels: [{ id: 'Label_1', type: 'user', name: 'Receipts' }] };
		const read = { method: 'GET', path: '/gmail/v1/users/me/labels' };

		expect(GMAIL_PROFILE.hydrateRead?.(read, system)).toBe(false);
		expect(GMAIL_PROFILE.hydrateRead?.(read, user)).toBe(true);
		expect(
			GMAIL_PROFILE.hydrateRead?.({ method: 'GET', path: '/gmail/v1/users/me/messages' }, {}),
		).toBe(true);
	});

	it('hydrates a write only when it names a message or thread that the gym did not make', () => {
		const known = new Set(['1a1f32cf20c4c2fb']);
		const write = (path: string) => GMAIL_PROFILE.hydrateWrite?.({ method: 'POST', path }, known);

		expect(write('/gmail/v1/users/me/messages/send')).toBe(false);
		expect(write('/gmail/v1/users/me/drafts')).toBe(false);
		expect(write('/gmail/v1/users/me/messages/1a1f32cf20c4c2fb/modify')).toBe(false);
		expect(write('/gmail/v1/users/me/messages/1b2e43df31d5d3ac/modify')).toBe(true);
		expect(write('/gmail/v1/users/me/threads/1b2e43df31d5d3ac/modify')).toBe(true);
	});
});

describe('withMailbox', () => {
	it('places every message and label in the mailbox of the placeholder account', () => {
		const out = withMailbox({
			world_version: 1,
			native: {
				gmail: {
					messages: [
						{ ref: 'message:a', subject: 's', account: 'someone@else.test' },
						{ ref: 'message:b' },
					],
					labels: [{ name: 'Receipts' }],
				},
			},
		}) as {
			native: {
				gmail: { messages: Array<{ account: string }>; labels: Array<{ account: string }> };
			};
		};

		const account = 'guard@unknown.invalid';
		expect(out.native.gmail.messages.map((m) => m.account)).toEqual([account, account]);
		expect(out.native.gmail.labels.map((l) => l.account)).toEqual([account]);
	});

	it('leaves an overlay without Gmail data as it is', () => {
		const overlay = { world_version: 1 };

		expect(withMailbox(overlay)).toEqual(overlay);
		expect(withMailbox({ native: { gmail: {} } })).toEqual({ native: { gmail: {} } });
	});

	it('is the finalize step of the Gmail profile', () => {
		expect(GMAIL_PROFILE.finalize).toBe(withMailbox);
	});
});

describe('Gmail profile edge cases', () => {
	it('skips header entries that are no text pair and header names that the model does not use', () => {
		const out = enrichGmail({
			id: 'm1',
			payload: {
				headers: [
					null,
					{ name: 5, value: 'x' },
					{ name: 'X-Other', value: 'ignored' },
					{ name: 'From', value: 'a@x.test' },
				],
				body: { data: Buffer.from('hi').toString('base64url') },
			},
		}) as { hdr: Record<string, string>; decodedBody: string };

		expect(out.hdr).toEqual({ from: 'a@x.test' });
		expect(out.decodedBody).toBe('');
	});

	it('leaves the date out when internalDate is no number, and reads a message without labels as read', () => {
		const out = enrichGmail({ id: 'm1', internalDate: 'soon', payload: { headers: [] } }) as Record<
			string,
			unknown
		>;

		expect(out.isoDate).toBeUndefined();
		expect(out.isRead).toBe(true);
	});

	it('enriches a list of messages and leaves other values as they are', () => {
		const list = enrichGmail([{ id: 'a', payload: { headers: [] } }, 'text', 3]) as unknown[];

		expect(list[1]).toBe('text');
		expect(list[2]).toBe(3);
		expect((list[0] as Record<string, unknown>).hdr).toEqual({});
		expect(enrichGmail({ id: 'no payload' })).toEqual({ id: 'no payload' });
		expect(enrichGmail('text')).toBe('text');
	});

	it('asks for no reads when a list result has no usable ids or is missing', () => {
		const lookups = GMAIL_PROFILE.lookups!;

		expect(lookups('read_list_messages', {}, undefined)).toEqual([]);
		expect(lookups('read_list_threads', {}, { threads: [null, { id: 5 }] })).toEqual([]);
		expect(lookups('read_list_labels', {}, { labels: [] })).toEqual([]);
	});

	it('reads the thread that a write names, and ignores a path with a short name', () => {
		const lookups = GMAIL_PROFILE.lookups!;

		expect(
			lookups('write_post_threads_modify', {
				path: '/gmail/v1/users/me/threads/1a1f32cf20c4c2fb/modify',
			}),
		).toEqual([
			{
				tool: 'read_get_threads',
				args: {
					method: 'GET',
					path: '/gmail/v1/users/me/threads/1a1f32cf20c4c2fb',
					query: { format: 'full' },
				},
			},
		]);
		expect(
			lookups('write_post_messages_send', { path: '/gmail/v1/users/me/messages/send' }),
		).toEqual([]);
	});

	it('hydrates a label list that has a user label, and skips one that is no list', () => {
		const args = { method: 'GET', path: '/gmail/v1/users/me/labels' };

		expect(GMAIL_PROFILE.hydrateRead!(args, { labels: [{ type: 'user' }] })).toBe(true);
		expect(GMAIL_PROFILE.hydrateRead!(args, 'not an object')).toBe(false);
		expect(
			GMAIL_PROFILE.hydrateRead!({ method: 'GET', path: '/gmail/v1/users/me/messages' }, {}),
		).toBe(true);
	});

	it('does not hydrate a write without an object in its path', () => {
		expect(
			GMAIL_PROFILE.hydrateWrite!(
				{ method: 'POST', path: '/gmail/v1/users/me/messages/send' },
				new Set(),
			),
		).toBe(false);
	});

	it('keeps an overlay that has no messages or labels, and items that are no records', () => {
		const only = { native: { gmail: { labels: [{ name: 'a' }, 'x'] } } };
		const placed = withMailbox(only) as { native: { gmail: Record<string, unknown[]> } };

		expect(placed.native.gmail.messages).toBeUndefined();
		expect(placed.native.gmail.labels[1]).toBe('x');
		expect(withMailbox({ native: { gmail: { messages: 'not a list' } } })).toEqual({
			native: { gmail: { messages: 'not a list' } },
		});
		expect(withMailbox({ native: 5 })).toEqual({ native: 5 });
	});
});
