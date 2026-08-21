import {
	parseHeaders,
	type FetchMessageObject,
	type FetchQueryObject,
	type ImapSimple,
} from '@n8n/imap';
import { simpleParser, type Source as ParserSource } from 'mailparser';
import {
	type INodeExecutionData,
	type IDataObject,
	type ITriggerFunctions,
	deepCopy,
	NodeOperationError,
	type IBinaryKeyData,
} from 'n8n-workflow';

import { toSearchObject, type SearchCriteria } from '../search-criteria';

const EMAIL_BATCH_SIZE = 20;

/** imapflow answers with the UID whether or not it is asked for, so no entry requests it. */
const FETCH_QUERY: Record<string, FetchQueryObject> = {
	resolved: { source: true },
	simple: { headers: true, bodyStructure: true },
	raw: { bodyParts: ['text'] },
};

/** Headers a `simple` item carries at the top level; every other header goes under `metadata`. */
const TOP_LEVEL_HEADERS = ['cc', 'date', 'from', 'subject', 'to'];

async function parseRawEmail(
	this: ITriggerFunctions,
	messageEncoded: ParserSource,
	dataPropertyNameDownload: string,
): Promise<INodeExecutionData> {
	const responseData = await simpleParser(messageEncoded);
	const headers: IDataObject = {};

	for (const header of responseData.headerLines) {
		headers[header.key] = header.line;
	}

	const binaryData: IBinaryKeyData = {};
	for (const [i, attachment] of (responseData.attachments ?? []).entries()) {
		binaryData[`${dataPropertyNameDownload}${i}`] = await this.helpers.prepareBinaryData(
			attachment.content,
			attachment.filename,
			attachment.contentType,
		);
	}

	const json: IDataObject = {
		...responseData,
		headers,
		headerLines: undefined,
		attachments: undefined,
	};

	return {
		// v2.2+ deep-serializes the mail so the Date and any other non-JSON values stay JSON-safe
		json: this.getNode().typeVersion >= 2.2 ? deepCopy(json) : json,
		binary: Object.keys(binaryData).length ? binaryData : undefined,
	};
}

/** Turns one message into an item, or into nothing when it holds no usable mail. */
type ItemBuilder = (message: FetchMessageObject) => Promise<INodeExecutionData | undefined>;

export async function getNewEmails(
	this: ITriggerFunctions,
	{
		onEmailBatch,
		imapConnection,
		postProcessAction,
		searchCriteria,
	}: {
		imapConnection: ImapSimple;
		searchCriteria: SearchCriteria[];
		postProcessAction: string;
		onEmailBatch: (data: INodeExecutionData[]) => Promise<void>;
	},
) {
	const format = this.getNodeParameter('format', 0) as string;
	const staticData = this.getWorkflowStaticData('node');
	const limit = this.getNode().typeVersion >= 2.1 ? EMAIL_BATCH_SIZE : undefined;

	const buildItem = itemBuilderFor.call(this, format, imapConnection);

	let criteria = searchCriteria;
	let results: FetchMessageObject[] = [];
	let maxUid = 0;

	do {
		if (maxUid) {
			criteria = criteria.filter(
				(criterion) => !Array.isArray(criterion) || !['UID', 'SINCE'].includes(criterion[0]),
			);
			criteria.push(['UID', `${maxUid}:*`]);
		}
		results = await imapConnection.search(
			toSearchObject(criteria),
			FETCH_QUERY[format] ?? {},
			limit,
		);

		this.logger.debug(`Process ${results.length} new emails in node "EmailReadImap"`);

		const newEmails: INodeExecutionData[] = [];
		const processedUids: number[] = [];

		for (const message of results) {
			const lastMessageUid = staticData.lastMessageUid as number | undefined;
			if (lastMessageUid !== undefined && message.uid <= lastMessageUid) continue;
			if (message.uid > maxUid) maxUid = message.uid;

			const item = await buildItem(message);
			if (!item) continue;

			newEmails.push(item);
			processedUids.push(message.uid);
		}

		// only mark messages as seen once processing has finished
		if (postProcessAction === 'read' && processedUids.length > 0) {
			await imapConnection.addFlags(processedUids, ['\\SEEN']);
		}

		// Set before emitting: n8n persists the static data as the emit goes out, so a watermark
		// advanced afterwards is only written by the next batch, and a lone message never at all.
		if (maxUid > ((staticData.lastMessageUid as number) ?? 0)) {
			staticData.lastMessageUid = maxUid;
		}

		await onEmailBatch(newEmails);
	} while (results.length >= EMAIL_BATCH_SIZE);
}

function itemBuilderFor(
	this: ITriggerFunctions,
	format: string,
	imapConnection: ImapSimple,
): ItemBuilder {
	const attachmentPrefix = () =>
		this.getNodeParameter('dataPropertyAttachmentsPrefixName') as string;

	if (format === 'resolved') {
		const prefix = attachmentPrefix();

		return async (message) => {
			if (message.source === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			const item = await parseRawEmail.call(this, message.source, prefix);
			item.json.attributes = { uid: message.uid };
			return item;
		};
	}

	if (format === 'simple') {
		const downloadAttachments = this.getNodeParameter('downloadAttachments') as boolean;
		const prefix = downloadAttachments ? attachmentPrefix() : '';

		return async (message) => {
			const headers = message.headers && parseHeaders(message.headers);
			if (!headers) {
				this.logger.warn(`Skipping email UID ${message.uid}: HEADER part missing or empty`);
				return undefined;
			}

			const json: IDataObject = {
				textHtml: await imapConnection.downloadText(message, 'html'),
				textPlain: await imapConnection.downloadText(message, 'plain'),
				metadata: {} as IDataObject,
				attributes: { uid: message.uid },
			};

			for (const [name, values] of Object.entries(headers)) {
				if (!values.length) continue;
				if (TOP_LEVEL_HEADERS.includes(name)) json[name] = values[0];
				else (json.metadata as IDataObject)[name] = values[0];
			}

			const item: INodeExecutionData = { json };

			if (downloadAttachments) {
				const attachments = await imapConnection.downloadAttachments(message);
				const binaries = await Promise.all(
					attachments.map(
						async ({ content, filename, contentType }) =>
							await this.helpers.prepareBinaryData(content, filename, contentType),
					),
				);

				if (binaries.length) {
					item.binary = Object.fromEntries(binaries.map((binary, i) => [`${prefix}${i}`, binary]));
				}
			}

			return item;
		};
	}

	if (format === 'raw') {
		return async (message) => {
			const raw = message.bodyParts?.get('text')?.toString('utf8');
			if (raw === undefined) {
				throw new NodeOperationError(this.getNode(), 'Email part could not be parsed.');
			}
			return { json: { raw } };
		};
	}

	return async () => undefined;
}
