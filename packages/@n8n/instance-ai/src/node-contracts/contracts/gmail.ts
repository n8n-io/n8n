import { bool, compact, num, obj, openObj, record, str, strList, tagOf, variant } from '../helpers';
import type { ActionContract, ContractInput, JsonSchema } from '../types';

const CREDENTIALS = ['gmailOAuth2', 'googleApi'];

const address: JsonSchema = obj(
	{
		value: { type: 'array', items: obj({ address: str(), name: str() }) },
		text: str('Display text such as "Ada <ada@example.com>"'),
		html: str(),
	},
	[],
	{ 'x-n8n-hint': 'An object, not a string: read .value[0].address or .text' },
);

const simplifiedMessage = obj({
	id: str(),
	threadId: str(),
	snippet: str(),
	From: str('A string such as "Ada <ada@example.com>"'),
	To: str(),
	Cc: str(),
	Bcc: str(),
	Subject: str(),
	labels: { type: 'array', items: obj({ id: str(), name: str() }) },
	internalDate: str(),
	historyId: str(),
	sizeEstimate: num(),
	payload: obj({ mimeType: str() }),
});

const rawMessage = obj({
	id: str(),
	threadId: str(),
	labelIds: strList(),
	sizeEstimate: num(),
	messageId: str(),
	date: str(),
	subject: str(),
	from: address,
	to: address,
	cc: address,
	bcc: address,
	replyTo: address,
	inReplyTo: str(),
	references: { anyOf: [str(), strList()] },
	priority: str(),
	text: str('Plain-text body'),
	html: str('HTML body'),
	textAsHtml: str(),
	headers: openObj(),
});

const outputMode = variant(
	'mode',
	{
		simplified: {
			hint: 'Metadata and snippet only; no body',
			output: simplifiedMessage,
		},
		raw: {
			hint: 'Full parsed email with body; from/to are address objects',
			properties: {
				downloadAttachments: bool({ default: false }),
				attachmentPrefix: str('Binary property prefix, e.g. attachment_', {
					'x-n8n-literal': true,
				}),
			},
			output: rawMessage,
		},
	},
	{ default: { mode: 'simplified' } },
);

function compileOutput(input: ContractInput) {
	const output = record(input.output);
	const raw = tagOf(output, 'mode') === 'raw';
	return {
		simple: !raw,
		...(raw
			? {
					options: compact({
						downloadAttachments: output.downloadAttachments,
						dataPropertyAttachmentsPrefixName: output.attachmentPrefix,
					}),
				}
			: {}),
	};
}

export const gmailGetMany: ActionContract = {
	id: 'gmail.message.getAll',
	node: 'gmail',
	action: 'Get many messages',
	summary: 'List messages that match a Gmail search.',
	flow: { effect: 'read', cardinality: '1:N', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj(
		{
			filters: obj({
				q: str('Gmail search syntax, e.g. "is:unread from:ada@example.com"'),
				readStatus: { enum: ['both', 'unread', 'read'], default: 'both' },
				sender: str(),
				labelIds: strList('Label IDs, not names'),
				receivedAfter: str('ISO date'),
				receivedBefore: str('ISO date'),
				includeSpamTrash: bool(),
			}),
			paging: variant('mode', {
				all: {},
				limit: { properties: { max: num({ default: 50 }) }, required: ['max'] },
			}),
			output: outputMode,
		},
		['paging', 'output'],
	),
	output: simplifiedMessage,
	example: {
		filters: { readStatus: 'unread' },
		paging: { mode: 'limit', max: 1 },
		output: { mode: 'raw' },
	},
	compile: {
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		discriminators: { resource: 'message', operation: 'getAll' },
		parameters: (input) => {
			const paging = record(input.paging);
			return {
				resource: 'message',
				operation: 'getAll',
				returnAll: tagOf(paging, 'mode') === 'all',
				...(tagOf(paging, 'mode') === 'limit' ? { limit: paging.max } : {}),
				filters: record(input.filters),
				...compileOutput(input),
			};
		},
	},
};

export const gmailGet: ActionContract = {
	id: 'gmail.message.get',
	node: 'gmail',
	action: 'Get a message',
	summary: 'Get one message by ID.',
	flow: { effect: 'read', cardinality: 'per-item', passthrough: 'replace', idempotent: true },
	credentials: CREDENTIALS,
	input: obj({ messageId: str(), output: outputMode }, ['messageId', 'output']),
	output: simplifiedMessage,
	example: { messageId: '={{ $json.id }}', output: { mode: 'raw' } },
	compile: {
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		discriminators: { resource: 'message', operation: 'get' },
		parameters: (input) => ({
			resource: 'message',
			operation: 'get',
			messageId: input.messageId,
			...compileOutput(input),
		}),
	},
};

export const gmailSend: ActionContract = {
	id: 'gmail.message.send',
	node: 'gmail',
	action: 'Send a message',
	summary: 'Send an email.',
	flow: { effect: 'write', cardinality: 'per-item', passthrough: 'replace', idempotent: false },
	credentials: CREDENTIALS,
	input: obj(
		{
			to: str('Comma-separated addresses'),
			subject: str(),
			body: variant('format', {
				text: { properties: { text: str() }, required: ['text'] },
				html: { properties: { html: str() }, required: ['html'] },
			}),
			cc: str(),
			bcc: str(),
			senderName: str(),
			replyTo: str(),
			appendAttribution: bool({ default: true }),
			attachments: strList('Binary property names on the input item, e.g. ["data"]'),
		},
		['to', 'subject', 'body'],
	),
	output: obj({ id: str(), threadId: str(), labelIds: strList() }),
	example: {
		to: '={{ $json.email }}',
		subject: 'Welcome',
		body: { format: 'text', text: '=Hi {{ $json.name }}' },
	},
	compile: {
		type: 'n8n-nodes-base.gmail',
		typeVersion: 2.2,
		discriminators: { resource: 'message', operation: 'send' },
		parameters: (input) => {
			const body = record(input.body);
			const html = tagOf(body, 'format') === 'html';
			const attachments = Array.isArray(input.attachments) ? input.attachments : [];
			return {
				resource: 'message',
				operation: 'send',
				sendTo: input.to,
				subject: input.subject,
				emailType: html ? 'html' : 'text',
				message: html ? body.html : body.text,
				options: compact({
					ccList: input.cc,
					bccList: input.bcc,
					senderName: input.senderName,
					replyTo: input.replyTo,
					appendAttribution: input.appendAttribution,
					attachmentsUi: attachments.length
						? { attachmentsBinary: attachments.map((property) => ({ property })) }
						: undefined,
				}),
			};
		},
	},
};
