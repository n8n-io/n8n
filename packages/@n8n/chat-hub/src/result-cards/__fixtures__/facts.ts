import { profileItems } from '../profile';
import type { NodeRunFacts } from '../types';

const workflow = {
	name: 'Leads log',
	description: 'Adds leads to the sheet and reports weekly totals',
};

export function makeFacts(
	overrides: Partial<NodeRunFacts> & Pick<NodeRunFacts, 'nodeName' | 'nodeType'>,
): NodeRunFacts {
	const items = overrides.items ?? [];
	return {
		typeVersion: 1,
		runIndex: 0,
		itemCount: items.length,
		items,
		binaryNames: [],
		params: {},
		fields: profileItems(items),
		isFinalOutput: false,
		workflow,
		...overrides,
	};
}

export const GMAIL_SEND = makeFacts({
	nodeName: 'Gmail',
	nodeType: 'n8n-nodes-base.gmail',
	typeVersion: 2.1,
	resource: 'message',
	operation: 'send',
	items: [{ id: '19a1', threadId: '19a1', labelIds: ['SENT'] }],
	params: {
		sendTo: 'anna.kowalski@allegro.pl',
		subject: 'Re: Invoice #1042',
		emailType: 'html',
		message: '<p>Hi Anna,</p><p>the invoice is <b>approved</b>.</p>',
		options: { ccList: 'finance@n8n.io' },
	},
});

export const SLACK_POST = makeFacts({
	nodeName: 'Slack',
	nodeType: 'n8n-nodes-base.slack',
	typeVersion: 2.3,
	resource: 'message',
	operation: 'post',
	items: [
		{
			ok: true,
			channel: 'C08514ZPKB8',
			message: { text: 'CTR nearly doubled this week.', bot_profile: { name: 'n8n' } },
			message_timestamp: '1734322671.726339',
		},
	],
	params: {
		select: 'channel',
		channelId: {
			__rl: true,
			mode: 'list',
			value: 'C08514ZPKB8',
			cachedResultName: 'marketing-feedback',
		},
		text: 'CTR nearly doubled this week.',
	},
});

export const TELEGRAM_SEND = makeFacts({
	nodeName: 'Telegram',
	nodeType: 'n8n-nodes-base.telegram',
	typeVersion: 1.2,
	resource: 'message',
	operation: 'sendMessage',
	items: [
		{
			ok: true,
			result: {
				message_id: 99,
				chat: { id: 1, first_name: 'Jan', type: 'private' },
				text: 'Match starts in 20 minutes',
			},
		},
	],
	params: { chatId: '123', text: 'Match starts in <b>20 minutes</b>' },
});

const leadRows = [
	{
		Name: 'Marta Nowak',
		Company: 'Allegro',
		Email: 'marta@allegro.pl',
		Source: 'LinkedIn',
		Status: 'New',
		Notes: 'Met at conference',
	},
	{
		Name: 'Jonas Weber',
		Company: 'Zalando',
		Email: 'jonas@zalando.de',
		Source: 'Referral',
		Status: 'Contacted',
		Notes: '',
	},
];

export const SHEETS_APPEND = makeFacts({
	nodeName: 'Google Sheets',
	nodeType: 'n8n-nodes-base.googleSheets',
	typeVersion: 4.6,
	resource: 'sheet',
	operation: 'append',
	items: leadRows,
	params: {
		documentId: { __rl: true, mode: 'list', value: '1abc', cachedResultName: 'CRM' },
		sheetName: { __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Leads 2026' },
		columns: { mappingMode: 'defineBelow', value: leadRows[0] },
	},
});

export const CODE_SUMMARY = makeFacts({
	nodeName: 'Weekly summary',
	nodeType: 'n8n-nodes-base.code',
	typeVersion: 2,
	isFinalOutput: true,
	items: [
		{
			total: 12,
			bySource: { LinkedIn: 7, Referral: 3, Website: 2 },
			topSource: 'LinkedIn',
			weekStart: '2026-09-21',
			trend: [3, 5, 4, 8, 6, 9, 12],
		},
	],
});

export const SET_TEXT_ONLY = makeFacts({
	nodeName: 'Reply',
	nodeType: 'n8n-nodes-base.set',
	typeVersion: 3.4,
	isFinalOutput: true,
	items: [{ output: 'Sent.' }],
});

export const HTTP_LIST = makeFacts({
	nodeName: 'Fetch ranking',
	nodeType: 'n8n-nodes-base.httpRequest',
	typeVersion: 4.2,
	isFinalOutput: true,
	items: [
		{ player: 'Zofia O.', rank: 184, points: 312, country: 'POL' },
		{ player: 'Eva M.', rank: 185, points: 310, country: 'CZE' },
		{ player: 'Lina K.', rank: 186, points: 305, country: 'GER' },
	],
});
