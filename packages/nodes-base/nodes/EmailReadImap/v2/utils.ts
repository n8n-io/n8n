import { getParts, ImapSimple, Message, MessagePart } from '@n8n/imap';

import { IBinaryData, IDataObject, ITriggerFunctions, NodeOperationError } from 'n8n-workflow';
import { find } from 'lodash';
import { INodeExecutionData } from 'n8n-workflow';
import { parseRawEmail } from './EmailReadImapV2.node';

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

	const results = await imapConnection.search(searchCriteria, fetchOptions);

	const newEmails: INodeExecutionData[] = [];
	let newEmail: INodeExecutionData;
	let attachments: IBinaryData[];
	let propertyName: string;

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
			if (
				staticData.lastMessageUid === undefined ||
				(staticData.lastMessageUid as number) < message.attributes.uid
			) {
				staticData.lastMessageUid = message.attributes.uid;
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
			if (
				staticData.lastMessageUid === undefined ||
				(staticData.lastMessageUid as number) < message.attributes.uid
			) {
				staticData.lastMessageUid = message.attributes.uid;
			}
			const parts = getParts(message.attributes.struct as IDataObject[]);

			newEmail = {
				json: {
					textHtml: await getText(parts, message, 'html'),
					textPlain: await getText(parts, message, 'plain'),
					metadata: {} as IDataObject,
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
			if (
				staticData.lastMessageUid === undefined ||
				(staticData.lastMessageUid as number) < message.attributes.uid
			) {
				staticData.lastMessageUid = message.attributes.uid;
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
	return newEmails;
}
