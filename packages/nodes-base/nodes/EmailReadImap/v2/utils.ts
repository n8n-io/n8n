import { getParts, type ImapSimple, type Message, type MessagePart } from '@n8n/imap';
import find from 'lodash/find';
import { simpleParser, type Source as ParserSource } from 'mailparser';
import {
	type IBinaryData,
	type INodeExecutionData,
	type IDataObject,
	type ITriggerFunctions,
	NodeOperationError,
	type IBinaryKeyData,
} from 'n8n-workflow';

async function parseRawEmail(
	this: ITriggerFunctions,
	messageEncoded: ParserSource,
	dataPropertyNameDownload: string,
): Promise<INodeExecutionData> {
	const responseData = await simpleParser(messageEncoded);
	const headers: IDataObject = {};
	const additionalData: IDataObject = {};

	for (const header of responseData.headerLines) {
		headers[header.key] = header.line;
	}

	additionalData.headers = headers;
	additionalData.headerLines = undefined;

	const binaryData: IBinaryKeyData = {};
	if (responseData.attachments) {
		for (let i = 0; i < responseData.attachments.length; i++) {
			const attachment = responseData.attachments[i];
			binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
				attachment.content,
				attachment.filename,
				attachment.contentType,
			);
		}

		additionalData.attachments = undefined;
	}

	return {
		json: { ...responseData, ...additionalData },
		binary: Object.keys(binaryData).length ? binaryData : undefined,
	} as INodeExecutionData;
}

export async function getNewEmails(
	this: ITriggerFunctions,
	imapConnection: ImapSimple,
	searchCriteria: Array<string | string[]>,
	staticData: IDataObject,
	postProcessAction: string,
	getText: (parts: MessagePart[], message: Message, subtype: string) => Promise<string>,
	getAttachment: (
		imapConnection: ImapSimple,
		parts: MessagePart[],
		message: Message,
	) => Promise<IBinaryData[]>,
	messageLimit?: number,
): Promise<INodeExecutionData[]> {
	const format = this.getNodeParameter('format', 0) as string;

	let fetchOptions = {};

	if (format === 'simple' || format === 'raw') {
		fetchOptions = {
			bodies: ['TEXT', 'HEADER'],
			markSeen: false,
			struct: true,
		};
	} else if (format === 'resolved') {
		fetchOptions = {
			bodies: [''],
			markSeen: false,
			struct: true,
		};
	}

	let results: Message[];

	// If messageLimit is specified and greater than 0, use sort to get the most recent messages
	if (messageLimit && messageLimit > 0) {
		try {
			// Use ARRIVAL for efficiency - it's based on internal date
			// '-ARRIVAL' means descending order (newest first)
			results = await imapConnection.sort(['-ARRIVAL'], searchCriteria, fetchOptions, messageLimit);
		} catch (error) {
			// Fallback to regular search if sort is not supported
			this.logger.debug(
				'IMAP SORT extension not supported, falling back to regular search with limit',
				{ error },
			);
			results = await imapConnection.search(searchCriteria, fetchOptions, messageLimit);
			// When using regular search with limit, we get the newest messages but in ascending order
			// Reverse them to show newest first
			results = results.reverse();
		}
	} else {
		results = await imapConnection.search(searchCriteria, fetchOptions);
	}

	const newEmails: INodeExecutionData[] = [];
	let newEmail: INodeExecutionData;
	let attachments: IBinaryData[];
	let propertyName: string;
	let maxUid = 0;

	// All properties get by default moved to metadata except the ones
	// which are defined here which get set on the top level.
	const topLevelProperties = ['cc', 'date', 'from', 'subject', 'to'];

	if (format === 'resolved') {
		const dataPropertyAttachmentsPrefixName = this.getNodeParameter(
			'dataPropertyAttachmentsPrefixName',
		) as string;

		for (const message of results) {
			if (
				staticData.lastMessageUid !== undefined &&
				message.attributes.uid <= (staticData.lastMessageUid as number)
			) {
				continue;
			}
			// Track the maximum UID to update staticData later
			if (message.attributes.uid > maxUid) {
				maxUid = message.attributes.uid;
			}
			const part = find(message.parts, { which: '' });

			if (part === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			const parsedEmail = await parseRawEmail.call(
				this,
				part.body as Buffer,
				dataPropertyAttachmentsPrefixName,
			);

			(parsedEmail.json as IDataObject).attributes = {
				uid: message.attributes.uid,
			};

			newEmails.push(parsedEmail);
		}
	} else if (format === 'simple') {
		const downloadAttachments = this.getNodeParameter('downloadAttachments') as boolean;

		let dataPropertyAttachmentsPrefixName = '';
		if (downloadAttachments) {
			dataPropertyAttachmentsPrefixName = this.getNodeParameter(
				'dataPropertyAttachmentsPrefixName',
			) as string;
		}

		for (const message of results) {
			if (
				staticData.lastMessageUid !== undefined &&
				message.attributes.uid <= (staticData.lastMessageUid as number)
			) {
				continue;
			}
			// Track the maximum UID to update staticData later
			if (message.attributes.uid > maxUid) {
				maxUid = message.attributes.uid;
			}
			const parts = getParts(message.attributes.struct as IDataObject[]);

			newEmail = {
				json: {
					textHtml: await getText(parts, message, 'html'),
					textPlain: await getText(parts, message, 'plain'),
					metadata: {} as IDataObject,
					attributes: {
						uid: message.attributes.uid,
					} as IDataObject,
				},
			};

			const messageHeader = message.parts.filter((part) => part.which === 'HEADER');

			const messageBody = messageHeader[0].body as Record<string, string[]>;
			for (propertyName of Object.keys(messageBody)) {
				if (messageBody[propertyName].length) {
					if (topLevelProperties.includes(propertyName)) {
						newEmail.json[propertyName] = messageBody[propertyName][0];
					} else {
						(newEmail.json.metadata as IDataObject)[propertyName] = messageBody[propertyName][0];
					}
				}
			}

			if (downloadAttachments) {
				// Get attachments and add them if any get found
				attachments = await getAttachment(imapConnection, parts, message);
				if (attachments.length) {
					newEmail.binary = {};
					for (let i = 0; i < attachments.length; i++) {
						newEmail.binary[`${dataPropertyAttachmentsPrefixName}${i}`] = attachments[i];
					}
				}
			}

			newEmails.push(newEmail);
		}
	} else if (format === 'raw') {
		for (const message of results) {
			if (
				staticData.lastMessageUid !== undefined &&
				message.attributes.uid <= (staticData.lastMessageUid as number)
			) {
				continue;
			}
			// Track the maximum UID to update staticData later
			if (message.attributes.uid > maxUid) {
				maxUid = message.attributes.uid;
			}
			const part = find(message.parts, { which: 'TEXT' });

			if (part === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			// Return base64 string
			newEmail = {
				json: {
					raw: part.body as string,
				},
			};

			newEmails.push(newEmail);
		}
	}

	// only mark messages as seen once processing has finished
	if (postProcessAction === 'read') {
		const uidList = results.map((e) => e.attributes.uid);
		if (uidList.length > 0) {
			await imapConnection.addFlags(uidList, '\\SEEN');
		}
	}
	// Update lastMessageUid after processing all messages
	if (maxUid > 0) {
		staticData.lastMessageUid = maxUid;
	}

	return newEmails;
}
