import { EventEmitter } from 'events';
import type Imap from 'imap';
import { type ImapMessage } from 'imap';

import { getMessage } from './helpers/get-message';
import { PartData } from './part-data';
import type { Message, MessagePart, SearchCriteria } from './types';

const IMAP_EVENTS = ['alert', 'mail', 'expunge', 'uidvalidity', 'update', 'close', 'end'] as const;

export class ImapSimple extends EventEmitter {
	constructor(private readonly imap: Imap) {
		super();

		// pass most node-imap `Connection` events through 1:1
		IMAP_EVENTS.forEach((event) => {
			this.imap.on(event, this.emit.bind(this, event));
		});

		// forward error events from the underlying connection
		this.imap.on('error', (e: Error) => {
			this.emit('error', e);
		});
	}

	/** disconnect from the imap server */
	end(): void {
		// Remove all forwarding listeners to prevent leaks on reconnect
		this.imap.removeAllListeners();

		// Suppress errors emitted during disconnect (e.g. ECONNRESET).
		// This is a known node-imap issue with no upstream fix:
		// https://github.com/mscdex/node-imap/issues/391
		// https://github.com/mscdex/node-imap/issues/395
		this.imap.on('error', () => {});

		// Forward the final 'close' event so callers can still react
		// (e.g. EmailReadImapV2 logs reconnect/shutdown status on close)
		this.imap.once('close', (...args: unknown[]) => this.emit('close', ...args));

		this.imap.end();
	}

	/**
	 * Search the currently open mailbox, and retrieve the results
	 *
	 * Results are in the form:
	 *
	 * [{
	 *   attributes: object,
	 *   parts: [ { which: string, size: number, body: string }, ... ]
	 * }, ...]
	 *
	 * See node-imap's ImapMessage signature for information about `attributes`, `which`, `size`, and `body`.
	 * For any message part that is a `HEADER`, the body is automatically parsed into an object.
	 */
	async search(
		/** Criteria to use to search. Passed to node-imap's .search() 1:1 */
		searchCriteria: SearchCriteria[],
		/** Criteria to use to fetch the search results. Passed to node-imap's .fetch() 1:1 */
		fetchOptions: Imap.FetchOptions,
		/** Optional limit to restrict the number of messages fetched */
		limit?: number,
	) {
		return await new Promise<Message[]>((resolve, reject) => {
			this.imap.search(searchCriteria, (e, uids) => {
				if (e) {
					reject(e);
					return;
				}

				if (uids.length === 0) {
					resolve([]);
					return;
				}

				// If limit is specified, take only the first N UIDs
				let uidsToFetch = uids;
				if (limit && limit > 0 && uids.length > limit) {
					uidsToFetch = uids.slice(0, limit);
				}

				const fetch = this.imap.fetch(uidsToFetch, fetchOptions);
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
				};

				fetch.on('message', fetchOnMessage);
				fetch.once('error', fetchOnError);
				fetch.once('end', fetchOnEnd);
			});
		});
	}

	/** Download a "part" (either a portion of the message body, or an attachment) */
	async getPartData(
		/** The message returned from `search()` */
		message: Message,
		/** The message part to be downloaded, from the `message.attributes.struct` Array */
		part: MessagePart,
	) {
		return await new Promise<PartData>((resolve, reject) => {
			const fetch = this.imap.fetch(message.attributes.uid, {
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
				const encoding = part.encoding.toUpperCase();
				resolve(PartData.fromData(data, encoding));
			};

			const fetchOnError = (error: Error) => {
				fetch.removeListener('message', fetchOnMessage);
				fetch.removeListener('end', fetchOnEnd);
				reject(error);
			};

			const fetchOnEnd = () => {
				fetch.removeListener('message', fetchOnMessage);
				fetch.removeListener('error', fetchOnError);
			};

			fetch.once('message', fetchOnMessage);
			fetch.once('error', fetchOnError);
			fetch.once('end', fetchOnEnd);
		});
	}

	/** Adds the provided flag(s) to the specified message(s). */
	async addFlags(
		/** The messages uid */
		uid: number[],
		/** The flags to add to the message(s). */
		flags: string | string[],
	) {
		return await new Promise<void>((resolve, reject) => {
			this.imap.addFlags(uid, flags, (e) => (e ? reject(e) : resolve()));
		});
	}

	/** Returns a list of mailboxes (folders). */
	async getBoxes() {
		return await new Promise<Imap.MailBoxes>((resolve, reject) => {
			this.imap.getBoxes((e, boxes) => (e ? reject(e) : resolve(boxes)));
		});
	}

	/** Open a mailbox */
	async openBox(
		/** The name of the box to open */
		boxName: string,
	): Promise<Imap.Box> {
		return await new Promise((resolve, reject) => {
			this.imap.openBox(boxName, (e, result) => (e ? reject(e) : resolve(result)));
		});
	}

	/** Close a mailbox */
	async closeBox(
		/** If autoExpunge is true, any messages marked as Deleted in the currently open mailbox will be removed @default true */
		autoExpunge = true,
	) {
		return await new Promise<void>((resolve, reject) => {
			this.imap.closeBox(autoExpunge, (e) => (e ? reject(e) : resolve()));
		});
	}
}
