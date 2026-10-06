import {
	isRecord,
	list,
	OperationalError,
	path,
	readAs,
	t,
	type AnySchema,
	type Binaries,
	type Http,
	type Infer,
	type JsonSchema,
} from '@n8n/node-sdk';

import { parseMail } from './parse';

const label = t.obj({ id: t.str(), name: t.str() });

/** A message as the v2 node emits it with `simple: true`. */
export const simplifiedMessage = t
	.obj({
		id: t.str(),
		threadId: t.str(),
		snippet: t.str(),
		historyId: t.str(),
		internalDate: t.str().hint('Epoch milliseconds as a string'),
		sizeEstimate: t.int(),
		labels: t.arr(label).optional(),
		payload: t.obj({ mimeType: t.str() }).with({ additionalProperties: true }).optional(),
		From: t.str().hint('A string such as "Ada <ada@example.com>"').optional(),
		To: t.str().optional(),
		Cc: t.str().optional(),
		Bcc: t.str().optional(),
		Subject: t.str().optional(),
	})
	.with({ additionalProperties: true, 'x-n8n-hint': 'Metadata and snippet only; no body' });

const mailbox = t.obj({
	address: t.str().hint('The bare address, e.g. ada@example.com'),
	name: t.str().hint('The display name, or "" when the header has none'),
});

/** A To, Cc, Bcc or Reply-To entry. A group, e.g. "undisclosed-recipients:;", has no address. */
const addressEntry = t.obj({
	address: t.str().hint('The bare address, e.g. ada@example.com; a group has none').optional(),
	name: t.str().hint('The display name or group name, or ""'),
	group: t.arr(mailbox).hint('The members of a group').optional(),
});

/** An address header as mailparser parses it. */
const addressHeader = <S extends AnySchema>(entry: S) =>
	t.obj({
		value: t.arr(entry),
		text: t.str().hint('All addresses as one string, e.g. "Ada" <ada@example.com>'),
		html: t.str().hint('All addresses as HTML'),
	});

/** A message as the v2 node emits it with `simple: false`: the raw mail parsed by mailparser. */
export const fullMessage = t
	.obj({
		id: t.str(),
		threadId: t.str(),
		labelIds: t.arr(t.str()).hint('Label IDs, e.g. INBOX, UNREAD').optional(),
		sizeEstimate: t.int(),
		headers: t
			.record(t.str())
			.hint('Each raw header line by lowercase name, e.g. headers.subject is "Subject: Hi"'),
		html: t.union(t.str(), t.lit(false)).hint('The HTML body, or false when the mail has none'),
		text: t
			.str()
			.hint('The plain text body; made from the HTML when the mail has no text part')
			.optional(),
		textAsHtml: t.str().hint('The text body as HTML paragraphs').optional(),
		subject: t.str().optional(),
		date: t.str().hint('ISO 8601 date-time of the Date header').optional(),
		from: addressHeader(mailbox)
			.hint('The sender; from.value[0].address is the bare address')
			.optional(),
		to: addressHeader(addressEntry).optional(),
		cc: addressHeader(addressEntry).optional(),
		bcc: addressHeader(addressEntry).optional(),
		replyTo: addressHeader(addressEntry).optional(),
		messageId: t.str().hint('e.g. <abc@mail.example.com>').optional(),
		inReplyTo: t.str().hint('The Message-ID this mail answers').optional(),
		references: t
			.union(t.str(), t.arr(t.str()))
			.hint('One Message-ID, or a list when there are more')
			.optional(),
	})
	// mailparser gives these fields only, so the object is closed and a typo fails the build.
	.with({
		'x-n8n-hint': 'The parsed mail with its body; files are binaries with downloadAttachments',
	});

/** The full message and its files as `parseRawEmail` stores them: `<prefix>0`, `<prefix>1`, … */
const withAttachments = (prefix?: string) => t.indexedBinaries(fullMessage, prefix);

export const simplify = t
	.bool()
	.default(true)
	.title('Simplify')
	.hint('false: the full mail with from.value[0].address, text, html and headers');

export const downloadAttachments = t
	.bool()
	.default(false)
	.title('Download Attachments')
	.hint('Needs simplify: false; puts each file in binary.attachment_0, attachment_1, …');

export const attachmentPrefix = t
	.str()
	.default('attachment_')
	.title('Attachment Prefix')
	.hint('The binary key of each file is this prefix and its index from 0');

/** The full message for `simplify: false`, the simplified one otherwise. */
export const messageOutput = t.union(simplifiedMessage, withAttachments());

/** Like the legacy node, an empty prefix is the default. */
const prefixOf = (prefix: string | undefined) => prefix || 'attachment_';

export const messageOutputOf = ({
	simplify: value,
	downloadAttachments: download,
	attachmentPrefix: prefix,
}: {
	readonly simplify?: unknown;
	readonly downloadAttachments?: unknown;
	readonly attachmentPrefix?: unknown;
}): JsonSchema => {
	if (value === true || value === undefined) return simplifiedMessage.json;
	if (value !== false) return messageOutput.json;
	if (download === false || download === undefined) return fullMessage.json;
	const known = prefix === undefined || (typeof prefix === 'string' && !prefix.startsWith('='));
	return withAttachments(known ? prefixOf(prefix) : undefined).json;
};

type Label = Infer<typeof label>;

const METADATA = { format: 'metadata', metadataHeaders: ['From', 'To', 'Cc', 'Bcc', 'Subject'] };

export async function labelsOf(http: Http): Promise<Label[]> {
	const response = await http.request({ path: path`/labels` });
	return list(isRecord(response) ? response.labels : undefined).flatMap((entry) =>
		isRecord(entry) && typeof entry.id === 'string' && typeof entry.name === 'string'
			? [{ id: entry.id, name: entry.name }]
			: [],
	);
}

/** Mirrors `simplifyOutput` in nodes-base Gmail/GenericFunctions.ts. */
export function simplifyMessage(message: unknown, labels: readonly Label[]) {
	if (!isRecord(message)) return {};
	const { labelIds, payload, ...rest } = message;
	const { headers, ...payloadFields } = isRecord(payload) ? payload : {};
	return {
		...rest,
		...(Array.isArray(labelIds)
			? { labels: labels.filter((entry) => labelIds.includes(entry.id)) }
			: {}),
		...(payload === undefined ? {} : { payload: isRecord(payload) ? payloadFields : payload }),
		...Object.fromEntries(
			list(headers).flatMap((header) =>
				isRecord(header) && typeof header.name === 'string' ? [[header.name, header.value]] : [],
			),
		),
	};
}

export async function getMessage(
	http: Http,
	id: string,
	labels: readonly Label[],
): Promise<Infer<typeof simplifiedMessage>> {
	const message = await http.request({
		path: path`/messages/${id}`,
		query: METADATA,
	});
	// The message is the output, so the host warns about a field in another shape.
	return readAs(simplifiedMessage, simplifyMessage(message, labels), { path: 'message' }).value;
}

/** What `run()` needs to store the files of a mail. */
export interface AttachmentOptions {
	readonly downloadAttachments: boolean;
	readonly attachmentPrefix: string;
	readonly binary: Binaries;
}

/** Mirrors `parseRawEmail` in nodes-base Gmail/GenericFunctions.ts. */
export async function getFullMessage(
	http: Http,
	id: string,
	{ downloadAttachments: download, attachmentPrefix: prefix, binary }: AttachmentOptions,
): Promise<Infer<ReturnType<typeof withAttachments>>> {
	const message = await http.request({
		path: path`/messages/${id}`,
		query: { format: 'raw' },
	});
	if (!isRecord(message) || typeof message.raw !== 'string') {
		throw new OperationalError(`Gmail returned message ${id} without its raw content`);
	}
	const { threadId, labelIds, sizeEstimate } = message;
	const { mail, attachments } = parseMail(message.raw);
	const parsed = readAs(
		fullMessage,
		{ id: message.id, threadId, labelIds, sizeEstimate, ...mail },
		{ path: 'message' },
	).value;
	if (!download) return parsed;
	const files = await Promise.all(
		attachments().map(
			async ({ bytes, ...meta }, index) =>
				[`${prefixOf(prefix)}${index}`, await binary.create(meta, [bytes])] as const,
		),
	);
	return { ...parsed, ...Object.fromEntries(files) };
}
