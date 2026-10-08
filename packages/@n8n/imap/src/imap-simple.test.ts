/* eslint-disable @typescript-eslint/naming-convention -- keys mirror imapflow's export and MIME part numbers */
import { EventEmitter } from 'events';
import type { FetchMessageObject, MessageStructureObject } from 'imapflow';

import type { ImapConnectionOptions } from './connection-options';
import { ConnectionLostError } from './errors';
import { ImapSimple, type ReconnectOptions } from './imap-simple';

class FakeImapFlow extends EventEmitter {
	usable = true;

	connect = vi.fn().mockResolvedValue(undefined);

	search = vi.fn();

	fetch = vi.fn();

	download = vi.fn();

	downloadMany = vi.fn();

	messageFlagsAdd = vi.fn();

	list = vi.fn();

	mailboxOpen = vi.fn();

	logout = vi.fn().mockResolvedValue(true);

	close = vi.fn();
}

const { clients } = vi.hoisted(() => ({ clients: [] as unknown[] }));

vi.mock('imapflow', () => ({
	ImapFlow: vi.fn(function () {
		if (clients.length === 0) throw new Error('no fake transport queued');
		// A single queued transport is reused, so only tests that care about a swap queue more.
		return clients.length === 1 ? clients[0] : clients.shift();
	}),
}));

beforeEach(() => {
	clients.length = 0;
});

const CONNECTION_OPTIONS: ImapConnectionOptions = {
	host: 'imap.test.com',
	port: 993,
	secure: true,
	user: 'user',
	password: 'password',
};

/** Queues the transports `connect` will hand out, in order. */
const queueTransports = (...transports: FakeImapFlow[]) => clients.push(...transports);

const setup = async (reconnect?: ReconnectOptions) => {
	const client = new FakeImapFlow();
	queueTransports(client);
	const connection = await ImapSimple.connect(CONNECTION_OPTIONS, reconnect);
	return { client, connection };
};

function* yielding<T>(...values: T[]) {
	for (const value of values) yield value;
}

const aMessage = (uid: number, bodyStructure?: MessageStructureObject) =>
	({ uid, flags: new Set(), bodyStructure }) as unknown as FetchMessageObject;

describe('search', () => {
	it('hands back what the fetch yielded', async () => {
		const { client, connection } = await setup();
		const fetched = { uid: 7, flags: new Set(['\\Seen']) };
		client.search.mockResolvedValue([7]);
		client.fetch.mockReturnValue(yielding(fetched));

		const messages = await connection.search({ seen: false }, { uid: true });

		expect(client.search).toHaveBeenCalledWith({ seen: false }, { uid: true });
		expect(client.fetch).toHaveBeenCalledWith([7], { uid: true }, { uid: true });
		expect(messages).toEqual([fetched]);
	});

	it('fetches the oldest matches up to the limit', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue([1, 2, 3, 4]);
		client.fetch.mockReturnValue(yielding({ uid: 1 }, { uid: 2 }));

		await connection.search({ all: true }, {}, 2);

		expect(client.fetch).toHaveBeenCalledWith([1, 2], expect.anything(), { uid: true });
	});

	it.each([undefined, 0])('fetches every match when the limit is %s', async (limit) => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue([1, 2, 3]);
		client.fetch.mockReturnValue(yielding({ uid: 1 }, { uid: 2 }, { uid: 3 }));

		await connection.search({ all: true }, {}, limit);

		expect(client.fetch).toHaveBeenCalledWith([1, 2, 3], expect.anything(), { uid: true });
	});

	it('does not fetch when the search matched nothing', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue([]);

		await expect(connection.search({ all: true }, {})).resolves.toEqual([]);
		expect(client.fetch).not.toHaveBeenCalled();
	});

	it('returns nothing when the fetch yields nothing on a live connection', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue([1]);
		client.fetch.mockReturnValue(yielding());

		await expect(connection.search({ all: true }, {})).resolves.toEqual([]);
	});

	it('throws ConnectionLostError when the fetch yields nothing on a dead connection', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue([1]);
		client.fetch.mockReturnValue(yielding());
		client.usable = false;

		await expect(connection.search({ all: true }, {})).rejects.toThrow(ConnectionLostError);
	});

	it('throws ConnectionLostError when the search settles false on a dead connection', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue(false);
		client.usable = false;

		await expect(connection.search({ all: true }, {})).rejects.toThrow(ConnectionLostError);
	});

	it('names the command when the search settles false on a live connection', async () => {
		const { client, connection } = await setup();
		client.search.mockResolvedValue(false);

		await expect(connection.search({ all: true }, {})).rejects.toThrow(
			'IMAP SEARCH did not complete',
		);
	});
});

describe('downloadText', () => {
	const alternative = {
		type: 'multipart/alternative',
		childNodes: [
			{ type: 'text/plain', part: '1' },
			{ type: 'text/html', part: '2' },
		],
	} as MessageStructureObject;

	it('downloads the part of the requested subtype', async () => {
		const { client, connection } = await setup();
		client.download.mockResolvedValue({
			content: yielding(Buffer.from('<p>hello '), Buffer.from('world</p>')),
		});

		const text = await connection.downloadText(aMessage(42, alternative), 'html');

		expect(client.download).toHaveBeenCalledWith('42', '2', expect.objectContaining({ uid: true }));
		expect(text).toBe('<p>hello world</p>');
	});

	it('accepts string chunks', async () => {
		const { client, connection } = await setup();
		client.download.mockResolvedValue({ content: yielding('hello world') });

		expect(await connection.downloadText(aMessage(42, alternative), 'plain')).toBe('hello world');
	});

	it('returns nothing when the message has no such part', async () => {
		const { client, connection } = await setup();

		expect(await connection.downloadText(aMessage(42, alternative), 'calendar')).toBe('');
		expect(client.download).not.toHaveBeenCalled();
	});

	it('returns nothing when the message has no structure', async () => {
		const { connection } = await setup();

		expect(await connection.downloadText(aMessage(42), 'plain')).toBe('');
	});

	it('returns nothing when the part cannot be downloaded', async () => {
		const { client, connection } = await setup();
		client.download.mockRejectedValue(new Error('NO [SERVERBUG]'));

		expect(await connection.downloadText(aMessage(42, alternative), 'plain')).toBe('');
	});

	it('throws ConnectionLostError when the connection died under the download', async () => {
		const { client, connection } = await setup();
		client.download.mockRejectedValue(new Error('socket hang up'));
		client.usable = false;

		await expect(connection.downloadText(aMessage(42, alternative), 'plain')).rejects.toThrow(
			ConnectionLostError,
		);
	});

	it('throws ConnectionLostError when the stream ended because the connection went away', async () => {
		const { client, connection } = await setup();
		client.download.mockResolvedValue({ content: yielding(Buffer.from('<p>hello ')) });
		client.usable = false;

		await expect(connection.downloadText(aMessage(42, alternative), 'html')).rejects.toThrow(
			ConnectionLostError,
		);
	});

	it('propagates a ConnectionLostError raised by the download itself', async () => {
		const { client, connection } = await setup();
		client.download.mockRejectedValue(new ConnectionLostError());

		await expect(connection.downloadText(aMessage(42, alternative), 'plain')).rejects.toThrow(
			ConnectionLostError,
		);
	});
});

describe('downloadAttachments', () => {
	const withAttachments = {
		type: 'multipart/mixed',
		childNodes: [
			{ type: 'text/plain', part: '1' },
			{
				type: 'application/pdf',
				part: '2',
				disposition: 'attachment',
				dispositionParameters: { filename: 'invoice.pdf' },
			},
			{ type: 'image/png', part: '3', disposition: 'attachment' },
		],
	} as MessageStructureObject;

	it('fetches every attachment part at once, with the filename the server reported', async () => {
		const { client, connection } = await setup();
		client.downloadMany.mockResolvedValue({
			'2': {
				meta: { filename: 'invoice.pdf', contentType: 'application/pdf' },
				content: Buffer.from('pdf bytes'),
			},
			'3': { meta: {}, content: Buffer.from('png bytes') },
		});

		const attachments = await connection.downloadAttachments(aMessage(42, withAttachments));

		expect(client.downloadMany).toHaveBeenCalledWith('42', ['2', '3'], { uid: true });
		expect(attachments).toEqual([
			{
				filename: 'invoice.pdf',
				contentType: 'application/pdf',
				content: Buffer.from('pdf bytes'),
			},
			{
				filename: undefined,
				contentType: undefined,
				content: Buffer.from('png bytes'),
			},
		]);
	});

	// downloadMany would ask for BODY[1], which a server may answer with NIL - aborting the
	// whole batch before the UID watermark advances, so the message is retried forever.
	it('routes a message that is itself the attachment through download', async () => {
		const { client, connection } = await setup();
		const bareAttachment = {
			type: 'application/pdf',
			disposition: 'attachment',
		} as MessageStructureObject;
		client.download.mockResolvedValue({
			meta: { filename: 'scan.pdf', contentType: 'application/pdf' },
			content: yielding(Buffer.from('pdf bytes')),
		});

		const attachments = await connection.downloadAttachments(aMessage(42, bareAttachment));

		expect(client.downloadMany).not.toHaveBeenCalled();
		expect(client.download).toHaveBeenCalledWith('42', '1', expect.objectContaining({ uid: true }));
		expect(attachments).toEqual([
			{
				filename: 'scan.pdf',
				contentType: 'application/pdf',
				content: Buffer.from('pdf bytes'),
			},
		]);
	});

	it('returns nothing when the message has no structure', async () => {
		const { client, connection } = await setup();

		expect(await connection.downloadAttachments(aMessage(42))).toEqual([]);
		expect(client.downloadMany).not.toHaveBeenCalled();
	});

	it('returns nothing when the message has no attachment part', async () => {
		const { client, connection } = await setup();
		const inlineOnly = { type: 'text/plain' } as MessageStructureObject;

		expect(await connection.downloadAttachments(aMessage(42, inlineOnly))).toEqual([]);
		expect(client.downloadMany).not.toHaveBeenCalled();
	});

	it('throws ConnectionLostError when a part comes back empty on a dead connection', async () => {
		const { client, connection } = await setup();
		client.downloadMany.mockResolvedValue({ '2': { meta: {}, content: null } });
		client.usable = false;

		await expect(connection.downloadAttachments(aMessage(42, withAttachments))).rejects.toThrow(
			ConnectionLostError,
		);
	});

	it('names the command when a part comes back empty on a live connection', async () => {
		const { client, connection } = await setup();
		client.downloadMany.mockResolvedValue({});

		await expect(connection.downloadAttachments(aMessage(42, withAttachments))).rejects.toThrow(
			'IMAP FETCH did not complete',
		);
	});
});

describe('addFlags', () => {
	it('stores the flags against the uids as a sequence set', async () => {
		const { client, connection } = await setup();
		client.messageFlagsAdd.mockResolvedValue(true);

		await connection.addFlags([1, 2, 3], ['\\Seen']);

		expect(client.messageFlagsAdd).toHaveBeenCalledWith('1,2,3', ['\\Seen'], { uid: true });
	});

	it('does nothing without uids', async () => {
		const { client, connection } = await setup();

		await connection.addFlags([], ['\\Seen']);

		expect(client.messageFlagsAdd).not.toHaveBeenCalled();
	});

	it('reports a store the server refused, such as a read-only mailbox', async () => {
		const { client, connection } = await setup();
		client.messageFlagsAdd.mockResolvedValue(false);

		await expect(connection.addFlags([1], ['\\Seen'])).rejects.toThrow('STORE');
	});

	it('throws ConnectionLostError on a false result from a dead connection', async () => {
		const { client, connection } = await setup();
		client.messageFlagsAdd.mockResolvedValue(false);
		client.usable = false;

		await expect(connection.addFlags([1], ['\\Seen'])).rejects.toThrow(ConnectionLostError);
	});
});

describe('list', () => {
	it('lists the mailboxes', async () => {
		const { client, connection } = await setup();
		client.list.mockResolvedValue([{ path: 'INBOX' }]);

		await expect(connection.list()).resolves.toEqual([{ path: 'INBOX' }]);
	});
});

describe('openBox', () => {
	it('hands back the mailbox, backlog included', async () => {
		const { client, connection } = await setup();
		client.mailboxOpen.mockResolvedValue({ path: 'INBOX', exists: 3 });

		await expect(connection.openBox('INBOX')).resolves.toEqual({ path: 'INBOX', exists: 3 });
	});

	it('names the command when the select does not complete', async () => {
		const { client, connection } = await setup();
		client.mailboxOpen.mockResolvedValue(false);

		await expect(connection.openBox('INBOX')).rejects.toThrow('IMAP SELECT did not complete');
	});

	it('throws ConnectionLostError when the select does not complete on a dead connection', async () => {
		const { client, connection } = await setup();
		client.mailboxOpen.mockResolvedValue(false);
		client.usable = false;

		await expect(connection.openBox('INBOX')).rejects.toThrow(ConnectionLostError);
	});
});

describe('events', () => {
	it('forwards flag changes', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onFlags(listener);
		const event = { path: 'INBOX', seq: 1, flags: new Set(['\\Seen']) };

		client.emit('flags', event);

		expect(listener).toHaveBeenCalledWith(event);
	});

	it('forwards error', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onError(listener);

		client.emit('error', new Error('boom'));

		expect(listener).toHaveBeenCalled();
	});

	// This used to be an EventEmitter, where an error with no listener throws ERR_UNHANDLED_ERROR
	// — for a credential test that surfaced as an uncaughtException long after it had returned.
	it('drops an error nobody asked to hear about instead of throwing', async () => {
		const { client } = await setup();

		expect(() => client.emit('error', new Error('boom'))).not.toThrow();
	});

	it('forwards close', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onClose(listener);

		client.emit('close');

		expect(listener).toHaveBeenCalled();
	});

	it('reports a close nobody asked for as dropped', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onClose(listener);

		client.emit('close');

		expect(listener).toHaveBeenCalledWith('dropped', undefined);
	});

	it('reports a close that follows an error as its consequence', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onError(vi.fn());
		connection.onClose(listener);

		client.emit('error', new Error('read ECONNRESET'));
		client.emit('close');

		expect(listener).toHaveBeenCalledWith('error', undefined);
	});

	it('reports a close the caller asked for as ended', async () => {
		const { client, connection } = await setup();
		const listener = vi.fn();
		connection.onClose(listener);

		connection.end();
		client.emit('close');

		expect(listener).toHaveBeenCalledWith('ended', undefined);
		expect(connection.endedByCaller).toBe(true);
	});

	it('stays silent once it has closed', async () => {
		const { client, connection } = await setup();
		const onError = vi.fn();
		const onArrival = vi.fn().mockResolvedValue(undefined);
		const onClose = vi.fn();
		connection.onError(onError);
		connection.onClose(onClose);
		connection.onArrival(onArrival);

		client.emit('close');
		client.emit('close');
		client.emit('error', new Error('too late'));
		client.emit('exists', { path: 'INBOX', count: 1, prevCount: 0 });
		await Promise.resolve();

		expect(onClose).toHaveBeenCalledTimes(1);
		expect(onError).not.toHaveBeenCalled();
		expect(onArrival).not.toHaveBeenCalled();
	});
});

describe('arrivals', () => {
	const arrival = { path: 'INBOX', count: 2, prevCount: 1 };

	it('runs the handler when the mailbox grows', async () => {
		const { client, connection } = await setup();
		const handler = vi.fn().mockResolvedValue(undefined);
		connection.onArrival(handler);

		client.emit('exists', arrival);
		await vi.waitFor(() => expect(handler).toHaveBeenCalledWith({ count: 1 }));
	});

	it('ignores a report that only counts expunged messages', async () => {
		const { client, connection } = await setup();
		const handler = vi.fn().mockResolvedValue(undefined);
		connection.onArrival(handler);

		client.emit('exists', { path: 'INBOX', count: 1, prevCount: 3 });
		await Promise.resolve();

		expect(handler).not.toHaveBeenCalled();
	});

	it('runs one handler at a time, in the order the arrivals came', async () => {
		const { client, connection } = await setup();
		const order: string[] = [];
		connection.onArrival(async ({ count }) => {
			order.push(`${count}:start`);
			await Promise.resolve();
			order.push(`${count}:end`);
		});

		client.emit('exists', { path: 'INBOX', count: 1, prevCount: 0 });
		client.emit('exists', { path: 'INBOX', count: 3, prevCount: 1 });
		await vi.waitFor(() => expect(order).toHaveLength(4));

		expect(order).toEqual(['1:start', '1:end', '2:start', '2:end']);
	});

	it('reports a handler that throws, and keeps taking arrivals', async () => {
		const { client, connection } = await setup();
		const onError = vi.fn();
		connection.onError(onError);
		const handler = vi
			.fn()
			.mockRejectedValueOnce(new Error('boom'))
			.mockResolvedValueOnce(undefined);
		connection.onArrival(handler);

		client.emit('exists', arrival);
		await vi.waitFor(() =>
			expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'boom' })),
		);

		client.emit('exists', { path: 'INBOX', count: 3, prevCount: 2 });
		await vi.waitFor(() => expect(handler).toHaveBeenCalledTimes(2));
	});
});
