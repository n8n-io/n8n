/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import Imap from 'imap';

import { ConnectionClosedError, ConnectionEndedError, ConnectionTimeoutError } from './errors';
import { ImapSimple } from './imap-simple';
import type { ImapSimpleOptions, MessagePart } from './types';

/**
 * Connect to an Imap server, returning an ImapSimple instance, which is a wrapper over node-imap to simplify it's api for common use cases.
 */
export async function connect(options: ImapSimpleOptions): Promise<ImapSimple> {
	const authTimeout = options.imap.authTimeout ?? 2000;
	options.imap.authTimeout = authTimeout;

	const imap = new Imap(options.imap);

	return await new Promise<ImapSimple>((resolve, reject) => {
		const cleanUp = () => {
			imap.removeListener('ready', imapOnReady);
			imap.removeListener('error', imapOnError);
			imap.removeListener('close', imapOnClose);
			imap.removeListener('end', imapOnEnd);
		};

		const imapOnReady = () => {
			cleanUp();
			resolve(new ImapSimple(imap));
		};

		const imapOnError = (e: Error & { source?: string }) => {
			if (e.source === 'timeout-auth') {
				e = new ConnectionTimeoutError(authTimeout);
			}

			cleanUp();
			reject(e);
		};

		const imapOnEnd = () => {
			cleanUp();
			reject(new ConnectionEndedError());
		};

		const imapOnClose = () => {
			cleanUp();
			reject(new ConnectionClosedError());
		};

		imap.once('ready', imapOnReady);
		imap.once('error', imapOnError);
		imap.once('close', imapOnClose);
		imap.once('end', imapOnEnd);

		if (options.onMail) {
			imap.on('mail', options.onMail);
		}

		if (options.onExpunge) {
			imap.on('expunge', options.onExpunge);
		}

		if (options.onUpdate) {
			imap.on('update', options.onUpdate);
		}

		imap.connect();
	});
}

/**
 * Given the `message.attributes.struct`, retrieve a flattened array of `parts` objects that describe the structure of
 * the different parts of the message's body. Useful for getting a simple list to iterate for the purposes of,
 * for example, finding all attachments.
 *
 * Code taken from http://stackoverflow.com/questions/25247207/how-to-read-and-save-attachments-using-node-imap
 *
 * @returns {Array} a flattened array of `parts` objects that describe the structure of the different parts of the
 *  message's body
 */
export function getParts(
	/** The `message.attributes.struct` value from the message you wish to retrieve parts for. */
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	struct: any,
	/** The list of parts to push to. */
	parts: MessagePart[] = [],
): MessagePart[] {
	for (let i = 0; i < struct.length; i++) {
		if (Array.isArray(struct[i])) {
			getParts(struct[i], parts);
		} else if (struct[i].partID) {
			parts.push(struct[i] as MessagePart);
		}
	}
	return parts;
}

export * from './imap-simple';
export * from './errors';
export * from './types';
