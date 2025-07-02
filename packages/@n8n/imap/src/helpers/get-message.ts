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
	console.log('===getmessage');
	return await new Promise((resolve) => {
		let attributes: ImapMessageAttributes;
		const parts: MessageBodyPart[] = [];

		const messageOnBody = (stream: NodeJS.ReadableStream, info: ImapMessageBodyInfo) => {
			console.log('===onbody');
			let body: string = '';

			const streamOnData = (chunk: Buffer) => {
				console.log('data');
				body += chunk.toString('utf8');
			};

			stream.on('data', streamOnData);
			stream.once('end', () => {
				console.log('stream end');
				stream.removeListener('data', streamOnData);

				parts.push({
					which: info.which,
					size: info.size,
					body: /^HEADER/g.test(info.which) ? parseHeader(body) : body,
				});
			});
		};

		const messageOnAttributes = (attrs: ImapMessageAttributes) => {
			console.log('===onattr');
			attributes = attrs;
		};

		const messageOnEnd = () => {
			console.log('===onend');
			message.removeListener('body', messageOnBody);
			message.removeListener('attributes', messageOnAttributes);
			resolve({ attributes, parts });
		};

		message.on('body', messageOnBody);
		message.once('attributes', messageOnAttributes);
		message.once('end', messageOnEnd);
	});
}
