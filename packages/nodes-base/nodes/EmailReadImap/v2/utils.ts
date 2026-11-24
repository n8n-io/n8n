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
	type IBinaryKeyData,
} from 'n8n-workflow';

import { toSearchObject, type SearchCriteria } from '../search-criteria';

const EMAIL_BATCH_SIZE = 20;

/** Most UIDs kept for a retry, so a mailbox full of unreadable messages cannot grow the list for ever. */
const MAX_PENDING_UIDS = 100;

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
		newMailWindow,
	}: {
		imapConnection: ImapSimple;
		searchCriteria: SearchCriteria[];
		newMailWindow?: SearchCriteria;
		postProcessAction: string;
		onEmailBatch: (data: INodeExecutionData[]) => Promise<void>;
	},
) {
	const format = this.getNodeParameter('format', 0) as string;
	const staticData = this.getWorkflowStaticData('node');
	const limit = this.getNode().typeVersion >= 2.1 ? EMAIL_BATCH_SIZE : undefined;

	const buildItem = itemBuilderFor.call(this, format, imapConnection);
	const fetchQuery = FETCH_QUERY[format] ?? {};

	const buildRetryItem: ItemBuilder = async (message) => {
		try {
			return await buildItem(message);
		} catch (error) {
			this.logger.warn(`Retrying email UID ${message.uid} failed, trying it again next time`, {
				error: error as Error,
			});
			return undefined;
		}
	};

	const processBatch = async (messages: FetchMessageObject[], build: ItemBuilder = buildItem) => {
		const items: INodeExecutionData[] = [];
		const emittedUids: number[] = [];
		const skippedUids: number[] = [];

		for (const message of messages) {
			const item = await build(message);
			if (item) {
				items.push(item);
				emittedUids.push(message.uid);
			} else {
				skippedUids.push(message.uid);
			}
		}

		// only mark messages as seen once processing has finished
		if (postProcessAction === 'read' && emittedUids.length > 0) {
			await imapConnection.addFlags(emittedUids, ['\\SEEN']);
		}

		return { items, skippedUids };
	};

	// A message that made no item sits below the watermark, so the UID window of every later
	// search hides it. Search the remembered UIDs explicitly and try them again. A UID the server
	// no longer returns has left the mailbox or stopped matching, so it leaves the list too.
	let pendingUids = (staticData.pendingMessageUids as number[] | undefined) ?? [];
	if (pendingUids.length > 0) {
		const results = await imapConnection.search(
			toSearchObject([...searchCriteria, ['UID', pendingUids.join(',')]]),
			fetchQuery,
		);
		const { items, skippedUids } = await processBatch(results, buildRetryItem);
		pendingUids = skippedUids;
		staticData.pendingMessageUids = pendingUids;
		await onEmailBatch(items);
	}

	let pageWindow = newMailWindow;
	let results: FetchMessageObject[] = [];
	let maxUid = 0;

	do {
		if (maxUid) pageWindow = ['UID', `${maxUid}:*`];
		const criteria = pageWindow ? [...searchCriteria, pageWindow] : searchCriteria;
		results = await imapConnection.search(toSearchObject(criteria), fetchQuery, limit);

		this.logger.debug(`Process ${results.length} new emails in node "EmailReadImap"`);

		// The UID window is inclusive, so the message at the watermark comes back in every search.
		const lastMessageUid = staticData.lastMessageUid as number | undefined;
		const newMessages = results.filter(
			(message) => lastMessageUid === undefined || message.uid > lastMessageUid,
		);
		for (const message of newMessages) {
			if (message.uid > maxUid) maxUid = message.uid;
		}

		const { items, skippedUids } = await processBatch(newMessages);

		// Set before emitting: n8n persists the static data as the emit goes out, so a watermark
		// advanced afterwards is only written by the next batch, and a lone message never at all.
		if (maxUid > (lastMessageUid ?? 0)) {
			staticData.lastMessageUid = maxUid;
		}
		if (skippedUids.length > 0) {
			pendingUids = [...pendingUids, ...skippedUids];
			if (pendingUids.length > MAX_PENDING_UIDS) {
				const dropped = pendingUids.slice(0, pendingUids.length - MAX_PENDING_UIDS);
				pendingUids = pendingUids.slice(-MAX_PENDING_UIDS);
				this.logger.warn(
					`Giving up on emails that made no item over the limit, UIDs ${dropped.join(',')}`,
				);
			}
			staticData.pendingMessageUids = pendingUids;
		}

		await onEmailBatch(items);
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
				this.logger.warn(`Skipping email UID ${message.uid}: message source missing`);
				return undefined;
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
				this.logger.warn(`Skipping email UID ${message.uid}: TEXT part missing`);
				return undefined;
			}
			return { json: { raw } };
		};
	}

	return async () => undefined;
}
