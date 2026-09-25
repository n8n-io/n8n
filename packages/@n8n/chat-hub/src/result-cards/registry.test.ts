import { resultCardSchema } from '@n8n/api-types';

import { makeFacts } from './__fixtures__/facts';
import { buildCandidateSet } from './candidates';
import { baseNodeType, describeNodeRun, hasDescriber } from './registry';

describe('baseNodeType / hasDescriber', () => {
	it('strips the Tool suffix', () => {
		expect(baseNodeType('n8n-nodes-base.gmailTool')).toBe('n8n-nodes-base.gmail');
		expect(baseNodeType('n8n-nodes-base.gmail')).toBe('n8n-nodes-base.gmail');
	});

	it('knows which node types have a describer, including their Tool variants', () => {
		expect(hasDescriber('n8n-nodes-base.slackTool')).toBe(true);
		expect(hasDescriber('n8n-nodes-base.slack')).toBe(true);
		expect(hasDescriber('n8n-nodes-base.code')).toBe(false);
	});
});

describe('describeNodeRun', () => {
	it('maps Gmail reply to a sent email titled Reply sent', () => {
		const card = describeNodeRun(
			makeFacts({
				nodeName: 'Gmail',
				nodeType: 'n8n-nodes-base.gmail',
				resource: 'message',
				operation: 'reply',
				items: [{ id: '19a2', threadId: '19a1' }],
				params: { messageId: '19a1', message: '<p>Thanks, <b>approved</b>.</p>' },
			}),
		);
		expect(card).toMatchObject({
			type: 'email',
			direction: 'sent',
			title: 'Reply sent',
			eyebrow: 'Gmail · Reply sent',
			subject: 'Reply in thread',
			preview: 'Thanks, approved.',
			to: [],
		});
	});

	it('returns null for Gmail operations that do not send anything', () => {
		expect(
			describeNodeRun(
				makeFacts({
					nodeName: 'Gmail',
					nodeType: 'n8n-nodes-base.gmail',
					resource: 'message',
					operation: 'getAll',
					items: [{ id: '1' }, { id: '2' }],
				}),
			),
		).toBeNull();
	});

	it('maps Email Send using toEmail / fromEmail / subject / text or html', () => {
		const base = {
			nodeName: 'Send Email',
			nodeType: 'n8n-nodes-base.emailSend',
			items: [{ accepted: ['ops@n8n.io'] }],
		};
		const html = describeNodeRun(
			makeFacts({
				...base,
				params: {
					fromEmail: 'bot@n8n.io',
					toEmail: 'ops@n8n.io, lead@n8n.io',
					subject: 'Nightly report',
					emailFormat: 'html',
					html: '<h1>All green</h1><p>0 failures</p>',
					options: { ccEmail: 'cto@n8n.io' },
				},
			}),
		);
		expect(html).toMatchObject({
			type: 'email',
			eyebrow: 'Email · Email sent',
			title: 'Sent to ops@n8n.io, lead@n8n.io',
			to: ['ops@n8n.io', 'lead@n8n.io'],
			cc: ['cto@n8n.io'],
			from: 'bot@n8n.io',
			subject: 'Nightly report',
			preview: 'All green 0 failures',
		});

		const text = describeNodeRun(
			makeFacts({
				...base,
				params: {
					fromEmail: 'bot@n8n.io',
					toEmail: 'ops@n8n.io',
					subject: 'Nightly report',
					emailFormat: 'text',
					text: 'All green, 0 failures',
					html: '<p>ignored when emailFormat is text</p>',
				},
			}),
		);
		expect(text).toMatchObject({ type: 'email', preview: 'All green, 0 failures' });
	});

	it('maps Outlook send using toRecipients / subject / bodyContent / additionalFields.ccRecipients', () => {
		const card = describeNodeRun(
			makeFacts({
				nodeName: 'Outlook',
				nodeType: 'n8n-nodes-base.microsoftOutlook',
				resource: 'message',
				operation: 'send',
				items: [{ success: true }],
				params: {
					toRecipients: 'anna@contoso.com',
					subject: 'Q3 numbers',
					bodyContent: '<p>Attached are the <i>final</i> figures.</p>',
					additionalFields: { ccRecipients: 'finance@contoso.com' },
				},
			}),
		);
		expect(card).toMatchObject({
			type: 'email',
			eyebrow: 'Outlook · Email sent',
			to: ['anna@contoso.com'],
			cc: ['finance@contoso.com'],
			subject: 'Q3 numbers',
			preview: 'Attached are the final figures.',
		});
	});

	it('maps Sheets update to a records card with operation update', () => {
		const card = describeNodeRun(
			makeFacts({
				nodeName: 'Google Sheets',
				nodeType: 'n8n-nodes-base.googleSheets',
				resource: 'sheet',
				operation: 'update',
				items: [{ Name: 'Marta', Status: 'Won' }],
				params: {
					sheetName: { __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Leads 2026' },
				},
			}),
		);
		expect(card).toMatchObject({
			type: 'records',
			operation: 'update',
			eyebrow: 'Google Sheets · Rows updated',
			statusLabel: 'Updated',
			title: '1 row updated in Leads 2026',
			columns: ['Name', 'Status'],
			rows: [['Marta', 'Won']],
		});
	});

	it('returns null for Sheets read — reading rows is not an outcome worth a card', () => {
		const sheetsRead = {
			nodeName: 'Google Sheets',
			nodeType: 'n8n-nodes-base.googleSheets',
			resource: 'sheet',
			items: [{ Name: 'Marta' }, { Name: 'Jonas' }],
			params: {
				sheetName: { __rl: true, mode: 'list', value: 'gid=0', cachedResultName: 'Leads 2026' },
			},
		};
		expect(describeNodeRun(makeFacts({ ...sheetsRead, operation: 'read' }))).toBeNull();
		// `read` is the node's default operation, so omitted facts mean the same thing.
		expect(describeNodeRun(makeFacts(sheetsRead))).toBeNull();
	});

	it('still maps the Sheets write operations', () => {
		const base = {
			nodeName: 'Google Sheets',
			nodeType: 'n8n-nodes-base.googleSheets',
			resource: 'sheet',
			items: [{ Name: 'Marta' }],
		};
		expect(describeNodeRun(makeFacts({ ...base, operation: 'append' }))).toMatchObject({
			operation: 'append',
		});
		expect(describeNodeRun(makeFacts({ ...base, operation: 'appendOrUpdate' }))).toMatchObject({
			operation: 'upsert',
		});
		expect(describeNodeRun(makeFacts({ ...base, operation: 'delete' }))).toMatchObject({
			operation: 'delete',
			statusLabel: 'Deleted',
		});
		expect(describeNodeRun(makeFacts({ ...base, operation: 'clear' }))).toMatchObject({
			operation: 'delete',
			statusLabel: 'Cleared',
		});
	});
});

describe('describeNodeRun — schema limits', () => {
	it('truncates a 70-char Sheets header to 60 chars while keeping the row values', () => {
		const header = 'Customer feedback about onboarding, first week, verbatim from the survey';
		expect(header.length).toBeGreaterThan(60);
		const facts = makeFacts({
			nodeName: 'Google Sheets',
			nodeType: 'n8n-nodes-base.googleSheets',
			resource: 'sheet',
			operation: 'append',
			items: [{ Name: 'Marta', [header]: 'Great so far' }],
		});
		const set = buildCandidateSet(facts);
		expect(set).not.toBeNull();
		const card = set!.defaultCard;
		expect(card.type).toBe('records');
		if (card.type !== 'records') return;
		expect(card.columns).toHaveLength(2);
		expect(card.columns[0]).toBe('Name');
		expect(card.columns[1]).toHaveLength(60);
		expect(card.columns[1].endsWith('…')).toBe(true);
		expect(card.rows[0]).toEqual(['Marta', 'Great so far']);
	});

	it('drops empty Sheets headers instead of emitting an empty column name', () => {
		const set = buildCandidateSet(
			makeFacts({
				nodeName: 'Google Sheets',
				nodeType: 'n8n-nodes-base.googleSheets',
				resource: 'sheet',
				operation: 'append',
				items: [{ '': 'orphan', Name: 'Marta', '  ': 'blank' }],
			}),
		);
		expect(set?.defaultCard).toMatchObject({ type: 'records', columns: ['Name'] });
	});

	it('truncates envelope nodeName, recipients, author and from to the schema limits', () => {
		const longName = 'Very long node name '.repeat(8).trim();
		expect(longName.length).toBeGreaterThan(120);

		const email = describeNodeRun(
			makeFacts({
				nodeName: longName,
				nodeType: 'n8n-nodes-base.emailSend',
				binaryNames: ['', 'report.pdf', `${'x'.repeat(130)}.pdf`],
				items: [{ accepted: [] }],
				params: {
					fromEmail: `${'from'.repeat(40)}@n8n.io`,
					toEmail: `${'to'.repeat(70)}@n8n.io, ops@n8n.io`,
					subject: 'Hi',
					text: 'Body',
				},
			}),
		);
		expect(email?.type).toBe('email');
		if (email?.type !== 'email') return;
		expect(email.nodeName).toHaveLength(120);
		expect(email.to).toHaveLength(2);
		expect(email.to[0]).toHaveLength(120);
		expect(email.to[1]).toBe('ops@n8n.io');
		expect(email.from).toHaveLength(120);
		expect(email.attachments).toHaveLength(2);
		expect(email.attachments?.[0]).toBe('report.pdf');
		expect(email.attachments?.[1]).toHaveLength(120);
		expect(resultCardSchema.safeParse(email).success).toBe(true);

		const slack = describeNodeRun(
			makeFacts({
				nodeName: 'Slack',
				nodeType: 'n8n-nodes-base.slack',
				resource: 'message',
				operation: 'post',
				items: [{ ok: true, message: { text: 'hi', bot_profile: { name: 'b'.repeat(130) } } }],
				params: { channelId: 'general', text: 'hi' },
			}),
		);
		expect(slack?.type).toBe('message');
		if (slack?.type !== 'message') return;
		expect(slack.author).toHaveLength(120);
		expect(resultCardSchema.safeParse(slack).success).toBe(true);
	});
});
