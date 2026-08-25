import Imap, { type ImapMessage } from 'imap';

import { toImapOptions, type ImapConnectionOptions } from './connection-options';
import {
	ConnectionClosedError,
	ConnectionEndedError,
	ConnectionLostError,
	ConnectionTimeoutError,
	ReconnectTimeoutError,
} from './errors';
import { getMessage } from './helpers/get-message';
import { attachmentParts, bodyPart, getParts } from './message';
import { PartData } from './part-data';
import type { Message, MessagePart, SearchCriteria } from './types';

/** The IMAP error codes worth reacting to arrive on the Error itself, not in its message. */
export const imapErrorCode = (error: Error): string =>
	'code' in error && typeof error.code === 'string' ? error.code.toUpperCase() : 'UNKNOWN';

const LOGOUT_GRACE_PERIOD = 2000;

const DEFAULT_RECONNECT_TIMEOUT = 45_000;

/** `ended`: the caller asked. `error`: a failure preceded it. `dropped`: neither, and unrecoverable. */
export type CloseReason = 'ended' | 'error' | 'dropped';

/** New mail worth looking at: what the server reported, or what a reconnect found waiting. */
export interface Arrival {
	count: number;
}

export interface FlagsEvent {
	seqNo: number;
	info: { num?: number | undefined; text: unknown };
}

/** The driver surface a connection runs on. The real client satisfies it; tests supply their own. */
export type ImapTransport = Pick<
	Imap,
	| 'connect'
	| 'end'
	| 'destroy'
	| 'on'
	| 'once'
	| 'removeListener'
	| 'removeAllListeners'
	| 'search'
	| 'fetch'
	| 'addFlags'
	| 'getBoxes'
	| 'openBox'
>;

export interface Attachment {
	/** As the disposition carries it; MIME encoding is the caller's to undo. */
	filename?: string;
	/** Transfer-encoding already decoded. */
	content: Buffer;
}

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

/** node-imap reports readiness through events, and a failed attempt through any of three others. */
const connectTransport = async (client: ImapTransport): Promise<void> => {
	await new Promise<void>((resolve, reject) => {
		const cleanUp = () => {
			client.removeListener('ready', onReady);
			client.removeListener('error', onError);
			client.removeListener('close', onClose);
			client.removeListener('end', onEnd);
		};

		const onReady = () => {
			cleanUp();
			resolve();
		};

		const onError = (error: Error & { source?: string }) => {
			cleanUp();
			reject(error.source === 'timeout-auth' ? new ConnectionTimeoutError() : error);
		};

		const onClose = () => {
			cleanUp();
			reject(new ConnectionClosedError());
		};

		const onEnd = () => {
			cleanUp();
			reject(new ConnectionEndedError());
		};

		client.once('ready', onReady);
		client.once('error', onError);
		client.once('close', onClose);
		client.once('end', onEnd);

		client.connect();
	});
};

const selectMailbox = async (client: ImapTransport, boxName: string): Promise<Imap.Box> =>
	await new Promise((resolve, reject) => {
		client.openBox(boxName, (error, box) => (error ? reject(error) : resolve(box)));
	});

/**
 * One long-lived IMAP connection. Configured with `reconnect` it restores itself after a drop and
 * can pre-empt one on a schedule, replacing the transport underneath while its own identity holds,
 * so a caller attaches its listeners once and never sees the swap.
 */
export class ImapSimple {
	static async connect(
		options: ImapConnectionOptions,
		reconnect?: ReconnectOptions,
		/** Called again for every reconnect, so a fake transport stays a fake. */
		createTransport: () => ImapTransport = () => new Imap(toImapOptions(options)),
	): Promise<ImapSimple> {
		const connection = new ImapSimple(createTransport, reconnect);
		await connection.open();
		if (reconnect?.interval !== undefined) connection.scheduleReplace(reconnect.interval);

		return connection;
	}

	private client!: ImapTransport;

	/** `end()` was called, so a close that follows is expected rather than a failure. */
	private ended = false;

	/** The error reported, if any; the close that follows is its consequence, not a separate event. */
	private failure: Error | undefined;

	/** Why an unrecoverable drop gave up, for the close it reports and for an `open` that raced it. */
	private dropCause: Error | undefined;

	/** `close` was emitted; the connection is spent and stays silent from here on. */
	private closed = false;

	private queue: Promise<unknown> = Promise.resolve();

	private readonly pending: Arrival[] = [];

	/** Bumped on every swap, so work cut short by one can be told apart from work that just failed. */
	private generation = 0;

	/** Distinguishes the attempt that is still wanted from one that timed out and kept running. */
	private attempt = 0;

	private abandon: ((error: Error) => void) | undefined;

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
		private readonly reconnectOptions: ReconnectOptions | undefined,
	) {}

	/** Serialised, because a handler that reads the mailbox and acts on it cannot overlap itself. */
	onArrival(handler: (arrival: Arrival) => Promise<void> | void): this {
		this.handlers.arrival = handler;

		// A connection is live from the moment `connect` hands it back, so mail can arrive before
		// the caller has said what to do with it.
		const waiting = this.pending.splice(0);
		for (const arrival of waiting) this.enqueue(arrival);

		return this;
	}

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

	/** The first transport. What the mailbox already holds is not an arrival; see `reopen`. */
	private async open(): Promise<void> {
		const attempt = this.attempt;
		const { client } = await this.dial();

		// A drop during the first SELECT starts a restore, which has either put its own transport in
		// place or given up; either way this one is stale.
		if (attempt !== this.attempt) {
			this.discard(client);
			if (this.closed) throw this.failure ?? this.dropCause ?? new ConnectionLostError();
			return;
		}

		this.install(client);
	}

	private async dial(): Promise<{ client: ImapTransport; total: number }> {
		const client = this.createTransport();
		await connectTransport(client);

		// Wired before the SELECT, so a transport that drops under it is still recovered from.
		client.on('error', (error: Error) => this.onTransportError(error));
		client.on('close', () => this.onTransportClose());

		const mailbox = this.reconnectOptions?.mailbox;
		if (mailbox === undefined) return { client, total: 0 };

		try {
			const box = await selectMailbox(client, mailbox);
			return { client, total: box.messages.total };
		} catch (error) {
			// Left connected it keeps the handlers wired above, and its later close would start a
			// restore of a connection that never came up.
			this.discard(client);
			throw error;
		}
	}

	private install(client: ImapTransport): void {
		this.client = client;

		client.on('mail', (count: number) => this.enqueue({ count }));
		client.on('update', (seqNo: number, info: FlagsEvent['info']) =>
			this.report('flags', (handler) => handler({ seqNo, info })),
		);
	}

	private onTransportError(error: Error): void {
		this.lose();
		// A connection that restores itself reports the failure it could not recover from, not
		// every one on the way there — `restore` reports if it runs out of road.
		if (this.canRestore()) return;
		this.reportError(error);
	}

	private onTransportClose(): void {
		this.lose();

		if (!this.canRestore()) {
			this.reportClose();
			return;
		}

		void this.restore();
	}

	/**
	 * Gives up on the current transport. A handler waiting on one of its commands is let go
	 * explicitly, because node-imap abandons its request queue on a close without calling back.
	 */
	private lose(): void {
		this.generation += 1;
		this.abandon?.(new ConnectionLostError());
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
		const { client, total } = await this.dial();

		// A timed-out attempt keeps running, so it discards the transport it built itself: reading
		// `this.client` would tear down whichever transport won the race instead.
		if (attempt !== this.attempt || this.ended || this.closed) {
			this.discard(client);
			return;
		}

		this.install(client);
		this.report('reconnect', (handler) => handler());

		// Mail that landed while the connection was down is already in the mailbox by the time it
		// is reopened, so the server never reports it as an arrival.
		if (total > 0) this.enqueue({ count: total });
	}

	/** Silences a transport being thrown away and tears it down; failing to close is immaterial. */
	private discard(client: ImapTransport | undefined): void {
		if (client === undefined) return;

		client.removeAllListeners();
		// node-imap emits ECONNRESET while disconnecting, and has no upstream fix:
		// https://github.com/mscdex/node-imap/issues/391
		client.on('error', () => {});
		try {
			client.end();
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
		this.queue = this.queue.then(async () => {
			if (this.generation !== queuedOn) return;

			const lost = new Promise<never>((_, reject) => (this.abandon = reject));
			try {
				await Promise.race([handler(arrival), lost]);
			} catch (error) {
				// Work a drop or a swap cut short belongs to a transport that no longer exists:
				// `restore` reports if it cannot recover, and reopening rescans what was missed.
				if (this.generation !== queuedOn) return;
				this.reportError(error);
			} finally {
				this.abandon = undefined;
			}
		});
	}

	/** Matching messages, with any `HEADER` part parsed into an object. */
	async search(searchCriteria: SearchCriteria[], fetchOptions: Imap.FetchOptions, limit?: number) {
		return await new Promise<Message[]>((resolve, reject) => {
			this.client.search(searchCriteria, (e, uids) => {
				if (e) {
					reject(e);
					return;
				}

				if (uids.length === 0) {
					resolve([]);
					return;
				}

				const uidsToFetch = limit && limit > 0 ? uids.slice(0, limit) : uids;

				const fetch = this.client.fetch(uidsToFetch, fetchOptions);
				let messagesRetrieved = 0;
				const messages: Message[] = [];

				const fetchOnMessage = async (message: Imap.ImapMessage, seqNo: number) => {
					const msg: Message = await getMessage(message);
					msg.seqNo = seqNo;
					messages.push(msg);

					messagesRetrieved++;
					if (messagesRetrieved === uidsToFetch.length) {
						resolve(messages.filter((m) => !!m));
					}
				};

				const fetchOnError = (error: Error) => {
					fetch.removeListener('message', fetchOnMessage);
					fetch.removeListener('end', fetchOnEnd);
					reject(error);
				};

				const fetchOnEnd = () => {
					fetch.removeListener('message', fetchOnMessage);
					fetch.removeListener('error', fetchOnError);
					// A fetch can still emit ECONNRESET after `end`, and an unhandled one is fatal.
					fetch.on('error', () => {});
				};

				fetch.on('message', fetchOnMessage);
				fetch.once('error', fetchOnError);
				fetch.once('end', fetchOnEnd);
			});
		});
	}

	/** One part of a message: a slice of the body, or an attachment. */
	private async getPartData(message: Message, part: MessagePart) {
		return await new Promise<PartData>((resolve, reject) => {
			const fetch = this.client.fetch(message.attributes.uid, {
				bodies: [part.partID],
				struct: true,
			});

			const fetchOnMessage = async (msg: ImapMessage) => {
				const result = await getMessage(msg);
				if (result.parts.length !== 1) {
					reject(new Error('Got ' + result.parts.length + ' parts, should get 1'));
					return;
				}

				const data = result.parts[0].body as string;
				// Some providers (e.g. iCloud) omit a part's encoding; 7BIT is the IMAP
				// default and leaves the body untransformed.
				const encoding = (part.encoding || '7BIT').toUpperCase();
				resolve(PartData.fromData(data, encoding, part.params?.charset));
			};

			const fetchOnError = (error: Error) => {
				fetch.removeListener('message', fetchOnMessage);
				fetch.removeListener('end', fetchOnEnd);
				reject(error);
			};

			const fetchOnEnd = () => {
				fetch.removeListener('message', fetchOnMessage);
				fetch.removeListener('error', fetchOnError);
				fetch.on('error', () => {});
			};

			fetch.once('message', fetchOnMessage);
			fetch.once('error', fetchOnError);
			fetch.once('end', fetchOnEnd);
		});
	}

	/** The message body in the wanted form, or an empty string when it holds none. */
	async downloadText(message: Message, subtype: string): Promise<string> {
		const struct = message.attributes.struct;
		if (!struct) return '';

		const part = bodyPart(getParts(struct), subtype);
		if (!part) return '';

		try {
			const data = await this.getPartData(message, part);
			return data.toString();
		} catch {
			// A body that cannot be fetched or decoded is reported as an absent one.
			return '';
		}
	}

	async downloadAttachments(message: Message): Promise<Attachment[]> {
		const struct = message.attributes.struct;
		if (!struct) return [];

		return await Promise.all(
			attachmentParts(getParts(struct)).map(async (part) => {
				const data = await this.getPartData(message, part);

				return {
					filename: part.disposition?.params?.filename,
					content: data.buffer,
				};
			}),
		);
	}

	async addFlags(uid: number[], flags: string | string[]) {
		return await new Promise<void>((resolve, reject) => {
			this.client.addFlags(uid, flags, (e) => (e ? reject(e) : resolve()));
		});
	}

	/** Returns a list of mailboxes (folders). */
	async getBoxes() {
		return await new Promise<Imap.MailBoxes>((resolve, reject) => {
			this.client.getBoxes((e, boxes) => (e ? reject(e) : resolve(boxes)));
		});
	}

	/** Open a mailbox */
	async openBox(boxName: string): Promise<Imap.Box> {
		return await selectMailbox(this.client, boxName);
	}

	/** Disconnects for good. Returns immediately; the connection is gone shortly after. */
	end(): void {
		this.ended = true;
		clearTimeout(this.timer);
		this.lose();

		const client = this.client;
		client.removeAllListeners();

		// LOGOUT goes unanswered on a half-open socket, so the wait for `close` is bounded.
		const teardown = setTimeout(() => client.destroy(), LOGOUT_GRACE_PERIOD);
		teardown.unref();

		client.once('close', () => {
			clearTimeout(teardown);
			this.reportClose();
		});
		// node-imap emits ECONNRESET while disconnecting, and has no upstream fix:
		// https://github.com/mscdex/node-imap/issues/391
		client.on('error', () => {});

		client.end();
	}
}
