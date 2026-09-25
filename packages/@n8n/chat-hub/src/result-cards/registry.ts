import type { ResultCard } from '@n8n/api-types';

import {
	asRecord,
	asStringList,
	firstString,
	plural,
	rlcLabel,
	str,
	stripHtml,
	truncate,
} from './format';
import { candidateColumns, objectItems, tableFromRows } from './generic';
import type { NodeRunFacts } from './types';

export type Describer = (facts: NodeRunFacts) => ResultCard | null;

/** Shown as a message card's `text` when the node sent nothing we can quote. */
export const NO_TEXT_PLACEHOLDER = '(no text)';

/** `resultCardSchema` limit shared by `nodeName`, `to`/`cc`/`attachments` entries, `author`, `from`. */
const MAX_NAME = 120;

function mapped(facts: NodeRunFacts) {
	return {
		status: 'success' as const,
		nodeType: facts.nodeType,
		nodeName: truncate(facts.nodeName, MAX_NAME),
		itemCount: facts.itemCount,
		source: 'mapped' as const,
	};
}

/** Schema-safe list entries: trimmed, non-empty, ≤ 120 chars, at most five. */
function nameList(values: string[]): string[] {
	return values
		.map((value) => truncate(value.trim(), MAX_NAME))
		.filter((value) => value.length > 0)
		.slice(0, 5);
}

function optionalList(values: string[]): string[] | undefined {
	const list = nameList(values);
	return list.length > 0 ? list : undefined;
}

function optionalName(value: string | undefined): string | undefined {
	return value === undefined ? undefined : truncate(value, MAX_NAME);
}

function emailCard(
	facts: NodeRunFacts,
	service: string,
	to: string[],
	subject: string,
	body: string,
	cc: string[],
): ResultCard {
	const preview = truncate(stripHtml(body), 240);
	const recipients = nameList(to);
	return {
		type: 'email',
		...mapped(facts),
		direction: 'sent',
		title: truncate(recipients.length > 0 ? `Sent to ${recipients.join(', ')}` : 'Email sent', 80),
		eyebrow: `${service} · Email sent`,
		statusLabel: 'Sent',
		to: recipients,
		cc: optionalList(cc),
		subject: truncate(subject, 200) || 'Email',
		preview: preview || undefined,
		attachments: optionalList(facts.binaryNames),
	};
}

const describeGmail: Describer = (facts) => {
	if (facts.resource && facts.resource !== 'message') return null;
	const p = facts.params;
	const options = asRecord(p.options);
	if (facts.operation === 'send') {
		return emailCard(
			facts,
			'Gmail',
			asStringList(p.sendTo),
			str(p.subject),
			str(p.message),
			asStringList(options.ccList),
		);
	}
	if (facts.operation === 'reply') {
		const card = emailCard(
			facts,
			'Gmail',
			[],
			'Reply in thread',
			str(p.message),
			asStringList(options.ccList),
		);
		return { ...card, title: 'Reply sent', eyebrow: 'Gmail · Reply sent' };
	}
	return null;
};

const describeEmailSend: Describer = (facts) => {
	const p = facts.params;
	const options = asRecord(p.options);
	const body = str(p.emailFormat) === 'text' ? str(p.text) : (firstString(p.html, p.text) ?? '');
	const card = emailCard(
		facts,
		'Email',
		asStringList(p.toEmail),
		str(p.subject),
		body,
		asStringList(options.ccEmail),
	);
	return { ...card, from: optionalName(firstString(p.fromEmail)) };
};

const describeOutlook: Describer = (facts) => {
	if (facts.resource && facts.resource !== 'message') return null;
	if (facts.operation !== 'send') return null;
	const p = facts.params;
	const extra = asRecord(p.additionalFields);
	return emailCard(
		facts,
		'Outlook',
		asStringList(p.toRecipients),
		str(p.subject),
		str(p.bodyContent),
		asStringList(extra.ccRecipients),
	);
};

const describeSlack: Describer = (facts) => {
	if (facts.resource && facts.resource !== 'message') return null;
	if (facts.operation !== 'post') return null;
	const p = facts.params;
	const select = str(p.select) || 'channel';
	const rawTarget = rlcLabel(select === 'user' ? p.user : p.channelId);
	const looksLikeId = /^[CGDU][A-Z0-9]{8,}$/.test(rawTarget);
	const target =
		select === 'channel' && rawTarget && !rawTarget.startsWith('#') && !looksLikeId
			? `#${rawTarget}`
			: rawTarget || 'Slack';
	const message = asRecord(objectItems(facts)[0]?.message);
	const text = truncate(firstString(p.text, message.text) ?? '', 400) || NO_TEXT_PLACEHOLDER;
	return {
		type: 'message',
		...mapped(facts),
		title: truncate(`Posted to ${target}`, 80),
		eyebrow: 'Slack · Message posted',
		statusLabel: 'Posted',
		channel: 'slack',
		to: truncate(target, MAX_NAME),
		text,
		author: optionalName(firstString(asRecord(message.bot_profile).name)),
	};
};

const describeTelegram: Describer = (facts) => {
	if (facts.resource && facts.resource !== 'message') return null;
	if (facts.operation !== 'sendMessage') return null;
	const p = facts.params;
	const result = asRecord(objectItems(facts)[0]?.result);
	const chat = asRecord(result.chat);
	const to = truncate(
		firstString(chat.title, chat.first_name, chat.username, p.chatId) ?? 'Telegram',
		MAX_NAME,
	);
	const text =
		truncate(stripHtml(firstString(p.text, result.text) ?? ''), 400) || NO_TEXT_PLACEHOLDER;
	return {
		type: 'message',
		...mapped(facts),
		title: truncate(`Sent to ${to}`, 80),
		eyebrow: 'Telegram · Message sent',
		statusLabel: 'Sent',
		channel: 'telegram',
		to,
		text,
	};
};

/**
 * Write operations only: reading rows is an input to whatever the workflow does next, not an
 * outcome a reader wants a card for. `read` is also the node's default, so an omitted
 * `operation` means the same thing and falls through to `null`.
 */
const SHEETS_OPERATIONS: Record<
	string,
	{
		operation: 'append' | 'update' | 'upsert' | 'delete';
		verb: string;
		action: string;
		label: string;
	}
> = {
	append: { operation: 'append', verb: 'added to', action: 'Rows added', label: 'Added' },
	update: { operation: 'update', verb: 'updated in', action: 'Rows updated', label: 'Updated' },
	appendOrUpdate: {
		operation: 'upsert',
		verb: 'synced to',
		action: 'Rows synced',
		label: 'Synced',
	},
	delete: { operation: 'delete', verb: 'deleted from', action: 'Rows deleted', label: 'Deleted' },
	clear: { operation: 'delete', verb: 'cleared from', action: 'Rows cleared', label: 'Cleared' },
};

const describeGoogleSheets: Describer = (facts) => {
	if (facts.resource && facts.resource !== 'sheet') return null;
	const op = facts.operation === undefined ? undefined : SHEETS_OPERATIONS[facts.operation];
	if (!op) return null;
	const p = facts.params;
	const target = truncate(rlcLabel(p.sheetName) || rlcLabel(p.documentId) || 'Google Sheet', 120);
	const rows = objectItems(facts);
	const columns = candidateColumns(rows);
	if (columns.length === 0) return null;
	return {
		type: 'records',
		...mapped(facts),
		title: truncate(`${plural(facts.itemCount, 'row')} ${op.verb} ${target}`, 80),
		eyebrow: `Google Sheets · ${op.action}`,
		statusLabel: op.label,
		target,
		operation: op.operation,
		...tableFromRows(rows, facts.itemCount, columns),
	};
};

const REGISTRY: Record<string, Describer> = {
	'n8n-nodes-base.gmail': describeGmail,
	'n8n-nodes-base.emailSend': describeEmailSend,
	'n8n-nodes-base.microsoftOutlook': describeOutlook,
	'n8n-nodes-base.slack': describeSlack,
	'n8n-nodes-base.telegram': describeTelegram,
	'n8n-nodes-base.googleSheets': describeGoogleSheets,
};

/** `n8n-nodes-base.gmailTool` → `n8n-nodes-base.gmail` */
export function baseNodeType(nodeType: string): string {
	return nodeType.replace(/Tool$/, '');
}

export function hasDescriber(nodeType: string): boolean {
	return baseNodeType(nodeType) in REGISTRY;
}

export function describeNodeRun(facts: NodeRunFacts): ResultCard | null {
	const describer = REGISTRY[baseNodeType(facts.nodeType)];
	return describer ? describer(facts) : null;
}
