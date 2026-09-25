import {
	CODE_SUMMARY,
	GMAIL_SEND,
	HTTP_LIST,
	SET_TEXT_ONLY,
	SHEETS_APPEND,
	SLACK_POST,
	TELEGRAM_SEND,
	makeFacts,
} from './__fixtures__/facts';
import { buildCandidateSet } from './candidates';

describe('buildCandidateSet', () => {
	it('maps Gmail send to an email card with no questions', () => {
		const set = buildCandidateSet(GMAIL_SEND)!;
		expect(set.defaultCard).toMatchObject({
			type: 'email',
			direction: 'sent',
			title: 'Sent to anna.kowalski@allegro.pl',
			eyebrow: 'Gmail · Email sent',
			statusLabel: 'Sent',
			to: ['anna.kowalski@allegro.pl'],
			cc: ['finance@n8n.io'],
			subject: 'Re: Invoice #1042',
			preview: 'Hi Anna, the invoice is approved.',
			nodeType: 'n8n-nodes-base.gmail',
			source: 'mapped',
		});
		expect(set.questions).toEqual({});
		expect(set.apply(undefined)).toEqual(set.defaultCard);
	});

	it('maps Slack post to a message card addressed to the channel', () => {
		const set = buildCandidateSet(SLACK_POST)!;
		expect(set.defaultCard).toMatchObject({
			type: 'message',
			channel: 'slack',
			to: '#marketing-feedback',
			text: 'CTR nearly doubled this week.',
			author: 'n8n',
			title: 'Posted to #marketing-feedback',
		});
		expect(Object.keys(set.questions)).toEqual(['message_emphasis']);
		expect(set.apply({ message_emphasis: { choice: 'text', confidence: 0.9 } })).toMatchObject({
			title: 'CTR nearly doubled this week.',
			source: 'jev',
		});
	});

	it('maps Telegram sendMessage and strips html from the text', () => {
		const set = buildCandidateSet(TELEGRAM_SEND)!;
		expect(set.defaultCard).toMatchObject({
			type: 'message',
			channel: 'telegram',
			to: 'Jan',
			text: 'Match starts in 20 minutes',
		});
	});

	it('maps Sheets append to records and asks Jev to score columns when there are more than four', () => {
		const set = buildCandidateSet(SHEETS_APPEND)!;
		expect(set.defaultCard).toMatchObject({
			type: 'records',
			target: 'Leads 2026',
			operation: 'append',
			title: '2 rows added to Leads 2026',
			columns: ['Name', 'Company', 'Email', 'Source'],
			total: 2,
		});
		expect(Object.keys(set.questions)).toEqual([
			'col_0',
			'col_1',
			'col_2',
			'col_3',
			'col_4',
			'col_5',
		]);
		const chosen = set.apply({
			col_0: { score: 0.9 },
			col_1: { score: 0.8 },
			col_2: { score: 0.2 },
			col_3: { score: 0.7 },
			col_4: { score: 0.6 },
			col_5: { score: 0.1 },
		})!;
		expect(chosen).toMatchObject({
			type: 'records',
			columns: ['Name', 'Company', 'Source', 'Status'],
			source: 'jev',
		});
		expect((chosen as { rows: string[][] }).rows[0]).toEqual([
			'Marta Nowak',
			'Allegro',
			'LinkedIn',
			'New',
		]);
	});

	it('builds a metric default for an aggregated final output and lets Jev choose', () => {
		const set = buildCandidateSet(CODE_SUMMARY)!;
		expect(set.archetypes).toEqual(['metric', 'keyValue']);
		expect(set.defaultCard).toMatchObject({
			type: 'metric',
			value: '12',
			label: 'Total',
			title: 'Weekly summary',
			breakdown: [
				{ label: 'LinkedIn', value: 7 },
				{ label: 'Referral', value: 3 },
				{ label: 'Website', value: 2 },
			],
			trend: [3, 5, 4, 8, 6, 9, 12],
		});
		expect(Object.keys(set.questions)).toEqual(
			expect.arrayContaining(['include', 'archetype', 'title', 'metric_label']),
		);
		expect(set.questions.title).toMatchObject({
			type: 'choice',
			criteria: expect.objectContaining({
				node: 'Weekly summary',
				workflow: 'Leads log',
				'field:topSource': 'LinkedIn',
			}),
		});

		expect(set.apply({ include: { noul: 0.2 } })).toBeNull();
		expect(
			set.apply({
				include: { noul: 0.9 },
				archetype: { choice: 'keyValue', confidence: 0.8 },
			}),
		).toMatchObject({
			type: 'keyValue',
			source: 'jev',
			pairs: expect.arrayContaining([{ key: 'Total', value: '12' }]),
		});
		expect(set.apply({ archetype: { choice: 'keyValue', confidence: 0.1 } })).toMatchObject({
			type: 'metric',
		});
		expect(
			set.apply({ metric_label: { choice: 'field:topSource', confidence: 0.9 } }),
		).toMatchObject({ type: 'metric', label: 'LinkedIn' });
	});

	it('offers records and list for an array of objects', () => {
		const set = buildCandidateSet(HTTP_LIST)!;
		expect(set.archetypes).toEqual(['records', 'list', 'keyValue']);
		expect(set.defaultCard).toMatchObject({
			type: 'records',
			columns: ['player', 'rank', 'points', 'country'],
			total: 3,
		});
		expect(
			set.apply({
				archetype: { choice: 'list', confidence: 0.9 },
				list_title: { choice: 'player', confidence: 0.9 },
				list_meta: { choice: 'rank', confidence: 0.9 },
			}),
		).toMatchObject({
			type: 'list',
			items: [
				{ title: 'Zofia O.', meta: '184' },
				{ title: 'Eva M.', meta: '185' },
				{ title: 'Lina K.', meta: '186' },
			],
		});
	});

	it('returns null for text-only or non-final unknown nodes', () => {
		expect(buildCandidateSet(SET_TEXT_ONLY)).toBeNull();
		expect(buildCandidateSet({ ...HTTP_LIST, isFinalOutput: false })).toBeNull();
	});

	it('hashes by shape, not by values', () => {
		const a = buildCandidateSet(HTTP_LIST)!.schemaHash;
		const b = buildCandidateSet({
			...HTTP_LIST,
			items: HTTP_LIST.items.slice(0, 1),
			itemCount: 1,
		})!.schemaHash;
		const c = buildCandidateSet(CODE_SUMMARY)!.schemaHash;
		expect(a).toBe(b);
		expect(a).not.toBe(c);
		expect(a).toMatch(/^[0-9a-f]{8}$/);
	});

	it('sends only field metadata to Jev', () => {
		const state = buildCandidateSet(CODE_SUMMARY)!.buildState();
		expect(state).toEqual({
			workflow: {
				name: 'Leads log',
				description: 'Adds leads to the sheet and reports weekly totals',
			},
			node: {
				type: 'n8n-nodes-base.code',
				name: 'Weekly summary',
				resource: undefined,
				operation: undefined,
			},
			itemCount: 1,
			fields: expect.arrayContaining([{ path: 'total', type: 'number', sample: '12' }]),
		});
		expect(
			buildCandidateSet(CODE_SUMMARY)!.buildState({ includeSamples: false }).fields[0],
		).toEqual({ path: 'total', type: 'number' });
	});

	it('ignores non-object items instead of throwing', () => {
		const items = [null, 'text', 42, { total: 12, topSource: 'LinkedIn' }] as unknown as Array<
			Record<string, unknown>
		>;
		let set: ReturnType<typeof buildCandidateSet> = null;
		expect(() => {
			set = buildCandidateSet(
				makeFacts({
					nodeName: 'Weekly summary',
					nodeType: 'n8n-nodes-base.code',
					isFinalOutput: true,
					items,
				}),
			);
		}).not.toThrow();
		expect(set).not.toBeNull();
		expect(set!.defaultCard).toMatchObject({
			type: 'metric',
			value: '12',
			label: 'Total',
			itemCount: 4,
		});
		expect(set!.questions.title).toMatchObject({
			criteria: expect.objectContaining({ 'field:topSource': 'LinkedIn' }),
		});
		expect(() =>
			set!.apply({
				archetype: { choice: 'keyValue', confidence: 0.9 },
				title: { choice: 'field:topSource', confidence: 0.9 },
			}),
		).not.toThrow();

		// A registry describer with only non-object items must not throw either.
		expect(() =>
			buildCandidateSet(
				makeFacts({
					nodeName: 'Google Sheets',
					nodeType: 'n8n-nodes-base.googleSheets',
					resource: 'sheet',
					operation: 'append',
					items: [null, 'row'] as unknown as Array<Record<string, unknown>>,
				}),
			),
		).not.toThrow();
	});

	it('does not ask message_emphasis when the message text is only the placeholder', () => {
		const set = buildCandidateSet(
			makeFacts({
				nodeName: 'Slack',
				nodeType: 'n8n-nodes-base.slack',
				resource: 'message',
				operation: 'post',
				items: [{ ok: true }],
				params: { channelId: 'general' },
			}),
		)!;
		expect(set.defaultCard).toMatchObject({ type: 'message', text: '(no text)' });
		expect(set.questions).toEqual({});
		expect(set.apply({ message_emphasis: { choice: 'text', confidence: 1 } })).toEqual(
			set.defaultCard,
		);
	});
});
