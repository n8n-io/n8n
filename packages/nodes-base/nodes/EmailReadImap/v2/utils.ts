import {
	getParts,
	type ImapSimple,
	type Message,
	type MessagePart,
	type SearchCriteria,
} from '@n8n/imap';
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

const EMAIL_BATCH_SIZE = 20;

export async function getNewEmails(
	this: ITriggerFunctions,
	{
		getAttachment,
		getText,
		onEmailBatch,
		imapConnection,
		postProcessAction,
		searchCriteria,
	}: {
		imapConnection: ImapSimple;
		searchCriteria: SearchCriteria[];
		postProcessAction: string;
		getText: (parts: MessagePart[], message: Message, subtype: string) => Promise<string>;
		getAttachment: (
			imapConnection: ImapSimple,
			parts: MessagePart[],
			message: Message,
		) => Promise<IBinaryData[]>;
		onEmailBatch: (data: INodeExecutionData[]) => Promise<void>;
	},
) {
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

	let results: Message[] = [];
	let maxUid = 0;

	const staticData = this.getWorkflowStaticData('node');
	const limit = this.getNode().typeVersion >= 2.1 ? EMAIL_BATCH_SIZE : undefined;

	do {
		if (maxUid) {
			searchCriteria = searchCriteria.filter((criteria: SearchCriteria) => {
				if (Array.isArray(criteria)) {
					return !['UID', 'SINCE'].includes(criteria[0]);
				}
				return true;
			});

			searchCriteria.push(['UID', `${maxUid}:*`]);
		}
		results = await imapConnection.search(searchCriteria, fetchOptions, limit);

		this.logger.debug(`Process ${results.length} new emails in node "EmailReadImap"`);

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
				const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid as number;
				if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
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

				parsedEmail.json.attributes = {
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
				const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid as number;
				if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
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
				const lastMessageUid = this.getWorkflowStaticData('node').lastMessageUid as number;
				if (lastMessageUid !== undefined && message.attributes.uid <= lastMessageUid) {
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

		await onEmailBatch(newEmails);
	} while (results.length >= EMAIL_BATCH_SIZE);

	// Update lastMessageUid after processing all messages
	if (maxUid > ((staticData.lastMessageUid as number) ?? 0)) {
		this.getWorkflowStaticData('node').lastMessageUid = maxUid;
	}
}
