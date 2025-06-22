import {
	parseHeader,
	type ImapMessage,
	type ImapMessageBodyInfo,
	type ImapMessageAttributes,
} from 'imap';

import type { Message, MessageBodyPart } from '../types';

/**
 * Given an 'ImapMessage' from the node-imap library, retrieves the `Message`
 */
export async function getMessage(
	/** an ImapMessage from the node-imap library */
	message: ImapMessage,
): Promise<Message> {
	return await new Promise((resolve) => {
		let attributes: ImapMessageAttributes;
		const parts: MessageBodyPart[] = [];

		const messageOnBody = (stream: NodeJS.ReadableStream, info: ImapMessageBodyInfo) => {
			let body: string = '';

			const streamOnData = (chunk: Buffer) => {
				body += chunk.toString('utf8');
			};

			stream.on('data', streamOnData);
			stream.once('end', () => {
				stream.removeListener('data', streamOnData);

				parts.push({
					which: info.which,
					size: info.size,
					body: /^HEADER/g.test(info.which) ? parseHeader(body) : body,
				});
			});
		};

		const messageOnAttributes = (attrs: ImapMessageAttributes) => {
			attributes = attrs;
		};

		const messageOnEnd = () => {
			message.removeListener('body', messageOnBody);
			message.removeListener('attributes', messageOnAttributes);
			resolve({ attributes, parts });
		};

		message.on('body', messageOnBody);
		message.once('attributes', messageOnAttributes);
		message.once('end', messageOnEnd);
	});
}
