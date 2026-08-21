import {
	ImapFlow,
	type FetchMessageObject,
	type FetchQueryObject,
	type FlagsEvent,
	type ListResponse,
	type MailboxObject,
	type SearchObject,
} from 'imapflow';

import { toImapFlowOptions, type ImapConnectionOptions } from './connection-options';
import { ConnectionLostError, ReconnectTimeoutError } from './errors';
import { attachmentPartIDs, bodyPartID } from './message';

const LOGOUT_GRACE_PERIOD = 2000;

/** How long one attempt at restoring the connection may take before it is abandoned. */
const DEFAULT_RECONNECT_TIMEOUT = 45_000;

/**
 * Why a connection stopped for good:
 * - `ended`  the caller asked for it, through `end()`
 * - `error`  an error was reported first, and the close is its consequence
 * - `dropped` the server or socket went away, and could not be restored
 */
export type CloseReason = 'ended' | 'error' | 'dropped';

export interface Arrival {
	count: number;
	prevCount: number;
}

/** The driver surface a connection runs on. The real client satisfies it; tests supply their own. */
export type ImapTransport = Pick<
	ImapFlow,
	| 'connect'
	| 'close'
	| 'logout'
	| 'on'
	| 'once'
	| 'removeAllListeners'
	| 'usable'
	| 'search'
	| 'fetch'
	| 'download'
	| 'downloadMany'
	| 'messageFlagsAdd'
	| 'list'
	| 'mailboxOpen'
>;

export interface ReconnectOptions {
	/** Reopened on every fresh connection, so a caller keeps watching the box it asked for. */
	mailbox: string;
	/** Replace the connection on this interval, pre-empting a server that drops long-lived ones. */
	interval?: number;
	timeout?: number;
}

const withTimeout = async <T>(operation: Promise<T>, ms: number): Promise<T> => {
	let timer: NodeJS.Timeout | undefined;
	// The race is settled by the timeout, so the attempt it abandons still needs a handler of
	// its own — without one, its later failure surfaces as an unhandled rejection.
	void operation.catch(() => {});
	try {
		return await Promise.race([
			operation,
			new Promise<never>((_, reject) => {
				timer = setTimeout(() => reject(new ReconnectTimeoutError()), ms);
			}),
		]);
	} finally {
		clearTimeout(timer);
	}
};

/** imapflow issues one sequential partial FETCH per chunk; its 64 KB default is a lot of round trips. */
const DOWNLOAD_CHUNK_SIZE = 1024 * 1024;

export interface Attachment {
	/** MIME-decoded, and falling back to the Content-Type name when the disposition carries none. */
	filename?: string;
	contentType?: string;
	/** Transfer-encoding already decoded. */
	content: Buffer;
}

/**
 * One long-lived IMAP connection. When `reconnect` is configured it restores itself after a drop
 * and can pre-empt one on a schedule, replacing the transport underneath while its own identity
 * holds — so a caller attaches its listeners once and never sees the swap. `close` then means the
 * connection is gone for good.
 */
export class ImapSimple {
	static async connect(
		options: ImapConnectionOptions,
		reconnect?: ReconnectOptions,
		/** Called again for every reconnect, so a fake transport stays a fake. */
		createTransport: () => ImapTransport = () => new ImapFlow(toImapFlowOptions(options)),
	): Promise<ImapSimple> {
		const connection = new ImapSimple(createTransport, reconnect);
		await connection.start();
		if (reconnect?.interval !== undefined) connection.scheduleReplace(reconnect.interval);

		return connection;
	}

	private client!: ImapTransport;

	/** `end()` was called, so a close that follows is expected rather than a failure. */
	private ended = false;

	/** The error reported, if any; the close that follows is its consequence, not a separate event. */
	private failure: Error | undefined;

	/** Why an unrecoverable drop gave up, for the close it reports and for a `start` that raced it. */
	private dropCause: Error | undefined;

	/** `close` was emitted; the connection is spent and stays silent from here on. */
	private closed = false;

	private queue: Promise<unknown> = Promise.resolve();

	/** Arrivals that landed before a handler was registered. */
	private readonly pending: Arrival[] = [];

	/** Bumped on every swap, so work cut short by one can be told apart from work that just failed. */
	private generation = 0;

	/** Distinguishes the attempt that is still wanted from one that timed out and kept running. */
	private attempt = 0;

	private timer: NodeJS.Timeout | undefined;

	private readonly handlers: {
		arrival?: (arrival: Arrival) => Promise<void> | void;
		error?: (error: Error) => void;
		close?: (reason: CloseReason, cause?: Error) => void;
		reconnect?: () => void;
		flags?: (event: FlagsEvent) => void;
	} = {};

	private constructor(
		private readonly createTransport: () => ImapTransport,
		private readonly reconnectOptions?: ReconnectOptions,
	) {}

	/**
	 * Handles new mail. Runs are serialised, because a handler that reads the mailbox and then
	 * acts on what it read cannot overlap with itself.
	 */
	onArrival(handler: (arrival: Arrival) => Promise<void> | void): this {
		this.handlers.arrival = handler;

		// A connection is live from the moment `connect` hands it back, so mail can arrive before
		// the caller has said what to do with it.
		const waiting = this.pending.splice(0);
		for (const arrival of waiting) this.enqueue(arrival);

		return this;
	}

	/** Handles a failure the connection could not recover from. */
	onError(handler: (error: Error) => void): this {
		this.handlers.error = handler;
		return this;
	}

	/** Handles the connection going for good. Nothing is reported after it. */
	onClose(handler: (reason: CloseReason, cause?: Error) => void): this {
		this.handlers.close = handler;
		return this;
	}

	/** Handles the transport having been replaced under a connection that carried on regardless. */
	onReconnect(handler: () => void): this {
		this.handlers.reconnect = handler;
		return this;
	}

	catchUp(): void {
		this.enqueue({ count: 0, prevCount: 0 });
	}

	onFlags(handler: (event: FlagsEvent) => void): this {
		this.handlers.flags = handler;
		return this;
	}

	/** A spent connection stays silent: `close` is the last thing a caller hears. */
	private report<K extends keyof typeof this.handlers>(
		event: K,
		run: (handler: NonNullable<(typeof this.handlers)[K]>) => void,
	): void {
		if (this.closed && event !== 'close') return;
		const handler = this.handlers[event];
		if (handler !== undefined) run(handler as NonNullable<(typeof this.handlers)[K]>);
	}

	private reportError(error: unknown): void {
		this.failure = error instanceof Error ? error : new Error(String(error));
		this.report('error', (handler) => handler(this.failure as Error));
	}

	private reportClose(): void {
		if (this.closed) return;
		this.closed = true;
		// An armed replace would otherwise still fire and log in to the server.
		clearTimeout(this.timer);
		this.report('close', (handler) => handler(this.closeReason(), this.dropCause));
	}

	get endedByCaller(): boolean {
		return this.ended;
	}

	private get reconnectTimeout(): number {
		return this.reconnectOptions?.timeout ?? DEFAULT_RECONNECT_TIMEOUT;
	}

	private closeReason(): CloseReason {
		if (this.ended) return 'ended';
		// A restore that gave up is a drop, even if an unrelated handler failed earlier.
		if (this.dropCause) return 'dropped';
		return this.failure ? 'error' : 'dropped';
	}

	private async start(): Promise<void> {
		const attempt = this.attempt;
		const client = await this.open();

		// A drop during the first SELECT starts a restore, which has either put its own transport in
		// place or given up; either way this one is stale.
		if (attempt !== this.attempt) {
			this.discard(client);
			if (this.closed) throw this.failure ?? this.dropCause ?? new ConnectionLostError();
			return;
		}

		this.install(client);
	}

	private async open(): Promise<ImapTransport> {
		const client = this.createTransport();
		await client.connect();

		// Wired before the SELECT, so a transport that drops under it is still recovered from.
		client.on('error', (error: Error) => this.onTransportError(error));
		client.on('close', () => this.onTransportClose(client));

		const mailbox = this.reconnectOptions?.mailbox;
		if (mailbox !== undefined) {
			this.assertRan(await client.mailboxOpen(mailbox), 'SELECT', client);
		}

		return client;
	}

	private install(client: ImapTransport): void {
		this.client = client;

		// An `exists` that only reports expunged messages is not an arrival.
		client.on('exists', ({ count, prevCount }) => {
			if (count > prevCount) this.enqueue({ count, prevCount });
		});
		client.on('flags', (data) => this.report('flags', (handler) => handler(data)));
	}

	private onTransportError(error: Error): void {
		// imapflow rejects its in-flight commands as the connection dies, and that reaches a
		// handler before the `close` does, so the transport is spent from this first error.
		this.lose();

		// A connection that restores itself reports the failure it could not recover from, not
		// every one on the way there — `restore` reports if it runs out of road.
		if (this.canRestore()) return;
		this.reportError(error);
	}

	private onTransportClose(client: ImapTransport): void {
		// A transport still being dialled is let go by the SELECT its drop interrupted; only the
		// one in service may start a restore, or a dial failing this way would spawn one with a
		// fresh budget on every try, and the running loop would never spend its own.
		if (this.installed && client !== this.client) return;

		this.lose();

		if (!this.canRestore()) {
			this.reportClose();
			return;
		}

		void this.restore();
	}

	/** Gives up on the current transport, so work still running against it counts as stale. */
	private lose(): void {
		this.generation += 1;
	}

	private canRestore(): boolean {
		return this.reconnectOptions !== undefined && !this.ended && !this.closed;
	}

	/**
	 * Puts a fresh transport in place of the current one. Reports and closes if it cannot, because
	 * a caller that is never told has no way to know its mail stopped arriving.
	 */
	private async restore(): Promise<void> {
		this.attempt += 1;
		const attempt = this.attempt;

		try {
			await withTimeout(this.reopen(attempt), this.reconnectTimeout);
		} catch (error) {
			if (attempt !== this.attempt || !this.canRestore()) return;
			// A drop nothing could be done about, so the close carries `dropped` and the attempt
			// that failed. Reporting an error first would relabel it as one the caller can read.
			this.dropCause = error instanceof Error ? error : new Error(String(error));
			this.reportClose();
		}
	}

	private async reopen(attempt: number): Promise<void> {
		// A scheduled replacement tears the transport down itself, so no `close` reaches us.
		this.lose();
		this.discard(this.client);
		const client = await this.open();

		// A timed-out attempt keeps running, so it discards the transport it built itself: reading
		// `this.client` would tear down whichever transport won the race instead.
		if (attempt !== this.attempt || this.ended || this.closed) {
			this.discard(client);
			return;
		}

		this.install(client);
		this.report('reconnect', (handler) => handler());
		this.catchUp();
	}

	/** Silences a transport being thrown away and tears it down; failing to close is immaterial. */
	private discard(client: ImapTransport | undefined): void {
		if (client === undefined) return;

		client.removeAllListeners();
		client.on('error', () => {});
		try {
			client.close();
		} catch {
			// The transport is being abandoned either way.
		}
	}

	/** Rearmed only once an attempt has settled, so a slow one can never stack up behind the next. */
	private scheduleReplace(interval: number): void {
		this.timer = setTimeout(() => {
			void this.restore().then(() => {
				if (this.canRestore()) this.scheduleReplace(interval);
			});
		}, interval);
	}

	/** Serialises handler runs; the chain survives a rejection so one failure strands no others. */
	private enqueue(arrival: Arrival): void {
		// A spent connection stays silent, arrivals included.
		if (this.closed || this.ended) return;

		const handler = this.handlers.arrival;
		if (handler === undefined) {
			this.pending.push(arrival);
			return;
		}

		const queuedOn = this.generation;
		const done = this.queue.then(async () => {
			if (this.generation !== queuedOn) return;

			try {
				await handler(arrival);
			} catch (error) {
				// Work a swap cut short belongs to a transport that no longer exists, and the
				// reconnect is reported on its own; there is nothing here worth repeating.
				if (this.generation !== queuedOn) return;
				this.reportError(error);
			}
		});
		this.queue = done;
	}

	/**
	 * imapflow settles some commands with a falsy value rather than rejecting when
	 * the connection dies under them, which would otherwise read as an empty result.
	 */
	private assertRan<T>(
		result: T | false | null | undefined,
		command: string,
		/** The transport the command ran on, which during `open` is not yet `this.client`. */
		client: ImapTransport = this.client,
	): T {
		if (result === false || result === null || result === undefined) {
			if (!client.usable) throw new ConnectionLostError();
			throw new Error(`IMAP ${command} did not complete`);
		}
		return result;
	}

	async search(
		criteria: SearchObject,
		query: FetchQueryObject,
		/** Fetch at most this many of the oldest matches. */
		limit?: number,
	): Promise<FetchMessageObject[]> {
		const found = await this.client.search(criteria, { uid: true });
		const uids = this.assertRan(Array.isArray(found) ? found : undefined, 'SEARCH');
		if (uids.length === 0) return [];

		// oldest first, because imapflow returns SEARCH results in ascending UID order
		const wanted = limit && limit > 0 ? uids.slice(0, limit) : uids;
		const messages: FetchMessageObject[] = [];

		for await (const fetched of this.client.fetch(wanted, query, { uid: true })) {
			messages.push(fetched);
		}

		// `fetch` yields nothing at all when the mailbox went away under it, which
		// would otherwise read as "no new mail" and lose the batch silently.
		if (messages.length === 0 && !this.client.usable) throw new ConnectionLostError();

		return messages;
	}

	/** The `text/<subtype>` body, or `''` when the message has none the server will hand over. */
	async downloadText(message: FetchMessageObject, subtype: string): Promise<string> {
		const partID = message.bodyStructure && bodyPartID(message.bodyStructure, subtype);
		if (!partID) return '';

		try {
			return (await this.downloadPart(message.uid, partID)).content.toString('utf8');
		} catch (error) {
			if (error instanceof ConnectionLostError) throw error;
			if (!this.client.usable) throw new ConnectionLostError();
			return '';
		}
	}

	/** In canonical part-number order. */
	async downloadAttachments(message: FetchMessageObject): Promise<Attachment[]> {
		const structure = message.bodyStructure;
		const partIDs = structure ? attachmentPartIDs(structure) : [];
		if (!structure || partIDs.length === 0) return [];

		// A message that is itself the attachment has no part number of its own, so `partIDOf`
		// supplied one. Only `download` resolves that to TEXT; `downloadMany` would ask for
		// BODY[1] and can come back empty, aborting the batch instead of yielding the attachment.
		if (structure.childNodes === undefined) {
			return [await this.downloadPart(message.uid, partIDs[0])];
		}

		const downloaded = await this.client.downloadMany(String(message.uid), partIDs, { uid: true });

		return partIDs.map((partID) => {
			const part = downloaded[partID];
			return {
				filename: part?.meta?.filename,
				contentType: part?.meta?.contentType,
				content: this.assertRan(part?.content, 'FETCH'),
			};
		});
	}

	/**
	 * One part at a time, because it is `download` rather than `downloadMany` that converts the
	 * charset to UTF-8, resolves `format=flowed`, and knows a single-part message answers on
	 * TEXT rather than on part 1. imapflow decodes the transfer-encoding as it streams.
	 */
	private async downloadPart(
		uid: number,
		partID: string,
	): Promise<{ content: Buffer; filename?: string; contentType?: string }> {
		const downloaded = await this.client.download(String(uid), partID, {
			uid: true,
			chunkSize: DOWNLOAD_CHUNK_SIZE,
		});

		const content = this.assertRan(downloaded?.content, 'FETCH');

		const chunks: Buffer[] = [];
		for await (const chunk of content) {
			chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
		}

		return {
			content: Buffer.concat(chunks),
			filename: downloaded?.meta?.filename,
			contentType: downloaded?.meta?.contentType,
		};
	}

	async addFlags(uids: number[], flags: string[]): Promise<void> {
		if (uids.length === 0) return;

		const applied = await this.client.messageFlagsAdd(uids.join(','), flags, { uid: true });

		// A matching-nothing STORE still reports true, so `false` is always a refusal —
		// a read-only mailbox, or one whose PERMANENTFLAGS omits the flag.
		this.assertRan(applied || undefined, 'STORE');
	}

	async openBox(boxName: string): Promise<MailboxObject> {
		const opened = await this.client.mailboxOpen(boxName);
		return this.assertRan(opened || undefined, 'SELECT');
	}

	async list(): Promise<ListResponse[]> {
		const boxes = await this.client.list();
		if (boxes.length === 0 && !this.client.usable) throw new ConnectionLostError();
		return boxes;
	}

	/** Disconnects for good. Returns immediately; the connection is gone shortly after. */
	end(): void {
		this.ended = true;
		clearTimeout(this.timer);
		this.lose();

		const client = this.client;
		client.removeAllListeners();

		client.once('close', () => this.reportClose());
		client.on('error', () => {});

		const teardown = setTimeout(() => client.close(), LOGOUT_GRACE_PERIOD);
		teardown.unref();

		void client
			.logout()
			.catch(() => client.close())
			.finally(() => clearTimeout(teardown));
	}
}
