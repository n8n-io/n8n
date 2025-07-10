import { EventEmitter } from 'events';
import type Imap from 'imap';
import { type ImapMessage } from 'imap';

import { getMessage } from './helpers/get-message';
import { PartData } from './part-data';
import type { Message, MessagePart, SearchCriteria } from './types';

const IMAP_EVENTS = ['alert', 'mail', 'expunge', 'uidvalidity', 'update', 'close', 'end'] as const;

export class ImapSimple extends EventEmitter {
	/** flag to determine whether we should suppress ECONNRESET from bubbling up to listener */
	private ending = false;

	constructor(private readonly imap: Imap) {
		super();

		// pass most node-imap `Connection` events through 1:1
		IMAP_EVENTS.forEach((event) => {
			this.imap.on(event, this.emit.bind(this, event));
		});

		// special handling for `error` event
		this.imap.on('error', (e: Error & { code?: string }) => {
			// if .end() has been called and an 'ECONNRESET' error is received, don't bubble
			if (e && this.ending && e.code?.toUpperCase() === 'ECONNRESET') {
				return;
			}
			this.emit('error', e);
		});
	}

	/** disconnect from the imap server */
	end(): void {
		// set state flag to suppress 'ECONNRESET' errors that are triggered when .end() is called.
		// it is a known issue that has no known fix. This just temporarily ignores that error.
		// https://github.com/mscdex/node-imap/issues/391
		// https://github.com/mscdex/node-imap/issues/395
		this.ending = true;

		// using 'close' event to unbind ECONNRESET error handler, because the node-imap
		// maintainer claims it is the more reliable event between 'end' and 'close'.
		// https://github.com/mscdex/node-imap/issues/394
		this.imap.once('close', () => {
			this.ending = false;
		});

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
