/**
 * Compiled library node: a hand port of `n8n-nodes-base.emailSend` versions 2 and 2.1,
 * operation `send` (`nodes-base/nodes/EmailSend/v2/send.operation.ts`). The operation
 * `sendAndWait` waits for a webhook and stays in the fallback host.
 *
 * The node has no MIME code and no SMTP code. It gives the fields of the message to the
 * `smtp` effect. The runtime builds the message as nodemailer builds it and sends it as
 * nodemailer sends it (`workflow-runtime/docs/smtp-effect.md`). The node does what the v1
 * node does around nodemailer:
 * - `toMailAddressString` for the addresses, `toMailString` for the subject and the bodies;
 * - `text` for the formats `text` and `both`, `html` for `html` and `both`;
 * - the attribution, which the v1 node adds to the HTML or to the text;
 * - the files of the options `attachments` (inline, with the name of the binary field as
 *   the content id) and `fileAttachments`, only when the item has binary data;
 * - the result of v1: the `info` object of nodemailer as JSON. JSON has no `message` for
 *   an entry of `rejectedErrors`, because v1 gives Error objects there;
 * - the error of v1: `NodeApiError(node, error)` of the error of nodemailer. Its message
 *   is the message of nodemailer, or the text of n8n for a code of Node.js in the message
 *   (`COMMON_ERRORS`). Its HTTP code is the `code` of nodemailer.
 *
 * v1 makes one connection and sends one message for each item. The converter calls this
 * node once for each item.
 *
 * When the runtime cannot send the message as nodemailer does, the effect ends with
 * `(limit: smtp-host)` before it writes the MAIL command. The node then ends with the mark
 * of `RUNS_IN_HOST`, and the converted workflow runs the v1 node in the fallback host for
 * this item. The node ends with the same mark, before the effect, for an option that is not
 * the type that v1 reads without a failure of JavaScript.
 *
 * The converter adds `nodeVersion`, `instanceId` (the attribution link ends with it),
 * `itemIndex` (for the error texts of `assertBinaryData`) and `continues` (the node has a
 * continue setting: the item of v1 then has the message of nodemailer as it is).
 */
import {
	defineNode,
	operationError,
	type ApiError,
	type Item,
	type SmtpAttachment,
	type SmtpFailure,
	type SmtpRejected,
	type SmtpResult,
	type SmtpSent,
} from '@n8n/workflow-lang';

interface EmailSendOptions {
	appendAttribution?: unknown;
	allowUnauthorizedCerts?: unknown;
	attachments?: unknown;
	fileAttachments?: unknown;
	ccEmail?: unknown;
	bccEmail?: unknown;
	replyTo?: unknown;
}

interface EmailSendParameters {
	resource?: string;
	operation?: string;
	fromEmail?: unknown;
	toEmail?: unknown;
	subject?: unknown;
	emailFormat?: unknown;
	text?: unknown;
	html?: unknown;
	options?: EmailSendOptions;
	/** The version of the node. Set by the converter. */
	nodeVersion?: number;
	/** The id of the n8n instance, for the attribution link. Set by the converter. */
	instanceId?: string;
	/** The index of the input item. Set by the converter for a node with files. */
	itemIndex?: number;
	/** The node has a continue setting. Set by the converter. */
	continues?: boolean;
}

/** The runtime cannot send this message as nodemailer does: the end of the error of the effect. */
const SMTP_HOST_MARKER = '(limit: smtp-host)';
/** `RUNS_IN_HOST` of the converter: the workflow runs the host form of the node for the item. */
const RUNS_IN_HOST = '(no request to repeat: the fallback host runs the node)';

const ATTRIBUTION_TEXT = 'This email was sent automatically with ';
const ATTRIBUTION_LINK =
	'https://n8n.io/?utm_source=n8n-internal&utm_medium=powered_by&utm_campaign=n8n-nodes-base.emailSend';

/** `COMMON_ERRORS` of n8n-workflow (`errors/abstract/node.error.ts`), in its order. */
const COMMON_ERRORS: string[][] = [
	['ECONNREFUSED', 'The service refused the connection - perhaps it is offline'],
	[
		'ECONNRESET',
		'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
	],
	[
		'ENOTFOUND',
		'The connection cannot be established, this usually occurs due to an incorrect host (domain) value',
	],
	[
		'ETIMEDOUT',
		"The connection timed out, consider setting the 'Retry on Fail' option in the node settings",
	],
	[
		'ERRADDRINUSE',
		'The port is already occupied by some other application, if possible change the port or kill the application that is using it',
	],
	['EADDRNOTAVAIL', 'The address is not available, ensure that you have the right IP address'],
	['ECONNABORTED', 'The connection was aborted, perhaps the server is offline'],
	['EHOSTUNREACH', 'The host is unreachable, perhaps the server is offline'],
	['EAI_AGAIN', 'The DNS server returned an error, perhaps the server is offline'],
	['ENOENT', 'The file or directory does not exist'],
	['EISDIR', 'The file path was expected but the given path is a directory'],
	['ENOTDIR', 'The directory path was expected but the given path is a file'],
	['EACCES', 'Forbidden by access permissions, make sure you have the right permissions'],
	['EEXIST', 'The file or directory already exists'],
	['EPERM', 'Operation not permitted, make sure you have the right permissions'],
	['GETADDRINFO', 'The server closed the connection unexpectedly'],
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function messageOf(error: unknown): string {
	return typeof error === 'object' && error !== null && 'message' in error
		? String(error.message)
		: String(error);
}

/** The error that sends the item to the fallback host. No message was sent for the item. */
function inHost(reason: string): Error {
	return new Error(`Send Email: ${reason}. The fallback host runs the node ${RUNS_IN_HOST}`);
}

/** `toMailString` of the v1 node (`nodes/EmailSend/utils.ts`) for a JSON value. */
function mailString(value: unknown): string | undefined {
	if (value === null || value === undefined) return undefined;
	if (typeof value === 'string') return value;
	if (typeof value === 'number' || typeof value === 'boolean') return String(value);
	return JSON.stringify(value);
}

/** `toMailAddressString` of the v1 node: a list is joined, without its empty entries. */
function mailAddress(value: unknown): string | undefined {
	if (!Array.isArray(value)) return mailString(value);
	const parts: string[] = [];
	for (const member of value) {
		const text = mailAddress(member);
		if (text) parts.push(text);
	}
	return parts.join(', ');
}

/** The value as a template literal of JavaScript writes it, for the two texts of v1. */
function shown(value: string | undefined): string {
	return value === undefined ? 'undefined' : value;
}

/** `prepareBinariesDataList` of n8n for a text: the names between the commas. */
function fieldNames(given: unknown): string[] {
	if (typeof given !== 'string') {
		throw inHost('an attachments option is not a text');
	}
	const names: string[] = [];
	for (const part of given.split(',')) names.push(part.trim());
	return names;
}

/** The entry of the binary field `name`, with the errors of n8n-core's `assertBinaryData`. */
function fileOf(item: Item, name: string, index: number): Record<string, unknown> {
	const files = item.$binary;
	if (!isRecord(files)) {
		throw operationError(
			`This operation expects the node's input data to contain a binary file '${name}', but none was found [item ${index}]`,
			'Make sure that the previous node outputs a binary file',
		);
	}
	const file = files[name];
	if (file === undefined) {
		throw operationError(
			`The item has no binary field '${name}' [item ${index}]`,
			'Check that the parameter where you specified the input binary field name is correct, and that it matches a field in the binary input',
		);
	}
	if (!isRecord(file)) throw inHost('a binary field is not a binary entry');
	return file;
}

/** One file of the message: the content of the binary field, with the file name of v1. */
function attachmentOf(file: Record<string, unknown>, cid: string | undefined): SmtpAttachment {
	const given = file.fileName;
	if (given !== undefined && given !== null && typeof given !== 'string') {
		throw inHost('the file name of a binary field is not a text');
	}
	if (typeof file.data !== 'string') throw inHost('a binary field has no content');
	const attachment: SmtpAttachment = { filename: given ? given : 'unknown', data: file.data };
	if (cid !== undefined) attachment.cid = cid;
	if (typeof file.id === 'string') attachment.id = file.id;
	return attachment;
}

/**
 * The message of the NodeApiError of n8n-workflow for the message of nodemailer
 * (`setDescriptiveErrorMessage`): the text of the first code of `COMMON_ERRORS` that the
 * message has, in any case of the letters.
 */
function describedMessage(message: string, code: string): string {
	for (const entry of COMMON_ERRORS) {
		if (code === entry[0]) return entry[1];
	}
	const upper = message.toUpperCase();
	for (const entry of COMMON_ERRORS) {
		if (upper.includes(entry[0])) return entry[1];
	}
	return message;
}

/** The error of v1 for an error of nodemailer. */
function sendError(failure: SmtpFailure, continues: boolean): Error {
	const raw = failure.error.message;
	// Under a continue setting the v1 node gives `{ error: error.message }` itself.
	if (continues) return new Error(raw);
	const error: ApiError = new Error(describedMessage(raw, failure.error.code));
	error.name = 'NodeApiError';
	error.httpCode = failure.error.code;
	return error;
}

/** An entry of `rejectedErrors` as the JSON of the Error object of nodemailer has it. */
function rejectedEntry(given: SmtpRejected): Item {
	const entry: Item = { code: given.code, response: given.response };
	if (given.responseCode !== undefined) entry.responseCode = given.responseCode;
	entry.command = given.command;
	entry.recipient = given.recipient;
	return entry;
}

/** The `info` of nodemailer as the JSON of the output item of v1, in the order of v1. */
function infoItem(info: SmtpSent): Item {
	const item: Item = { accepted: info.accepted, rejected: info.rejected };
	if (info.ehlo !== undefined) item.ehlo = info.ehlo;
	if (info.rejectedErrors !== undefined) {
		const entries: Item[] = [];
		for (const entry of info.rejectedErrors) entries.push(rejectedEntry(entry));
		item.rejectedErrors = entries;
	}
	item.envelopeTime = info.envelopeTime;
	item.messageTime = info.messageTime;
	item.messageSize = info.messageSize;
	item.response = info.response;
	item.envelope = info.envelope;
	item.messageId = info.messageId;
	return item;
}

export default defineNode<EmailSendParameters>({
	type: 'n8n-nodes-base.emailSend',
	version: 2.1,
	supports: {
		resource: 'email',
		operation: { email: 'send' },
		operations: {
			'email.send': [
				'fromEmail',
				'toEmail',
				'subject',
				'emailFormat',
				'text',
				'html',
				'options',
				'options.appendAttribution',
				'options.allowUnauthorizedCerts',
				'options.attachments',
				'options.fileAttachments',
				'options.ccEmail',
				'options.bccEmail',
				'options.replyTo',
				'nodeVersion',
				'instanceId',
				'itemIndex',
				'continues',
			],
		},
	},
	async run(ctx, parameters, items, credential) {
		const resource = parameters.resource ?? 'email';
		const operation = parameters.operation ?? 'send';
		if (resource !== 'email' || operation !== 'send') {
			throw new Error(`Send Email: ${resource}.${operation} is not in the compiled library`);
		}
		if (credential === undefined) throw inHost('the node has no credential');
		const version = parameters.nodeVersion ?? 2.1;
		const continues = parameters.continues === true;
		const index = parameters.itemIndex ?? 0;
		const item: Item = items !== undefined && items.length > 0 ? items[0] : {};
		const given: unknown = parameters.options;
		if (given !== undefined && !isRecord(given)) throw inHost('the options are not a collection');
		const options: EmailSendOptions = parameters.options ?? {};
		const format = parameters.emailFormat;

		const from = mailAddress(parameters.fromEmail);
		const to = mailAddress(parameters.toEmail);
		const cc = mailAddress(options.ccEmail);
		const bcc = mailAddress(options.bccEmail);
		const subject = mailString(parameters.subject);
		const replyTo = mailAddress(options.replyTo);
		let text: string | undefined;
		let html: string | undefined;
		let hasText = false;
		let hasHtml = false;
		if (format === 'text' || format === 'both') {
			text = mailString(parameters.text);
			hasText = true;
		}
		if (format === 'html' || format === 'both') {
			html = mailString(parameters.html);
			hasHtml = true;
		}

		let append: unknown = options.appendAttribution;
		if (append === undefined) append = version >= 2.1;
		if (append) {
			const link = parameters.instanceId
				? `${ATTRIBUTION_LINK}_${parameters.instanceId}`
				: ATTRIBUTION_LINK;
			if (format === 'html' || (format === 'both' && html)) {
				html = `\n\t\t\t\t\t${shown(html)}\n\t\t\t\t\t<br>\n\t\t\t\t\t<br>\n\t\t\t\t\t---\n\t\t\t\t\t<br>\n\t\t\t\t\t<em>${ATTRIBUTION_TEXT}<a href="${link}" target="_blank">n8n</a></em>\n\t\t\t\t\t`;
				hasHtml = true;
			} else {
				text = `${shown(text)}\n\n---\n${ATTRIBUTION_TEXT}n8n\nhttps://n8n.io`;
				hasText = true;
			}
		}

		const attachments: SmtpAttachment[] = [];
		if ((options.attachments || options.fileAttachments) && item.$binary) {
			if (options.attachments) {
				for (const name of fieldNames(options.attachments)) {
					attachments.push(attachmentOf(fileOf(item, name, index), name));
				}
			}
			if (options.fileAttachments) {
				for (const name of fieldNames(options.fileAttachments)) {
					attachments.push(attachmentOf(fileOf(item, name, index), undefined));
				}
			}
		}

		let result: SmtpResult;
		try {
			// A field without a value is a field that is not set.
			result = await ctx.smtp({
				credential,
				from,
				to,
				cc,
				bcc,
				replyTo,
				subject,
				text: hasText ? text : undefined,
				html: hasHtml ? html : undefined,
				attachments: attachments.length > 0 ? attachments : undefined,
				allowUnauthorizedCerts: options.allowUnauthorizedCerts === true ? true : undefined,
			});
		} catch (error) {
			const message = messageOf(error);
			// The runtime wrote no MAIL command: the v1 node sends the message of this item.
			if (message.includes(SMTP_HOST_MARKER)) throw new Error(`${message} ${RUNS_IN_HOST}`);
			throw error;
		}
		if ('error' in result) throw sendError(result, continues);
		return [infoItem(result)];
	},
});
