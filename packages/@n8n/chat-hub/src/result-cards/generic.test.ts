import { resultCardSchema } from '@n8n/api-types';

import { makeFacts } from './__fixtures__/facts';
import { buildCandidateSet } from './candidates';
import { breakdownFromValue, candidateColumns, tableFromRows } from './generic';

describe('breakdownFromValue', () => {
	it('keeps negative entries but clamps every share into [0, 1]', () => {
		const breakdown = breakdownFromValue({ Won: 7, Lost: -3, Open: 2 })!;
		expect(breakdown.map((row) => row.label)).toEqual(['Won', 'Open', 'Lost']);
		expect(breakdown.map((row) => row.value)).toEqual([7, 2, -3]);
		for (const row of breakdown) {
			expect(row.share).toBeGreaterThanOrEqual(0);
			expect(row.share).toBeLessThanOrEqual(1);
		}
		// Shares are computed over the non-negative values only (7 + 2 = 9).
		expect(breakdown[0].share).toBeCloseTo(7 / 9, 2);
		expect(breakdown[1].share).toBeCloseTo(2 / 9, 2);
		expect(breakdown[2].share).toBe(0);
	});

	it('does not exceed 1 when the total is dragged down by negatives', () => {
		const breakdown = breakdownFromValue({ A: 10, B: -9 })!;
		expect(breakdown[0]).toMatchObject({ label: 'A', value: 10, share: 1 });
		expect(breakdown[1]).toMatchObject({ label: 'B', value: -9, share: 0 });
	});

	it('ignores non-finite values, which the card schema cannot carry', () => {
		const breakdown = breakdownFromValue({ A: 4, B: Number.NaN, C: Number.POSITIVE_INFINITY })!;
		expect(breakdown).toEqual([{ label: 'A', value: 4, share: 1 }]);
		expect(breakdownFromValue({ B: Number.NaN })).toBeUndefined();
	});

	it('yields a schema-valid metric card for a breakdown with a negative value', () => {
		const set = buildCandidateSet(
			makeFacts({
				nodeName: 'Net change',
				nodeType: 'n8n-nodes-base.code',
				isFinalOutput: true,
				items: [{ total: 6, byTeam: { Sales: 9, Support: -3 } }],
			}),
		);
		expect(set?.defaultCard).toMatchObject({ type: 'metric', value: '6' });
		if (set?.defaultCard.type !== 'metric') return;
		for (const row of set.defaultCard.breakdown ?? []) {
			expect(row.share).toBeGreaterThanOrEqual(0);
			expect(row.share).toBeLessThanOrEqual(1);
		}
		expect(resultCardSchema.safeParse(set.defaultCard).success).toBe(true);
	});
});

describe('candidateColumns / tableFromRows', () => {
	it('drops empty column names and skips non-object rows', () => {
		const rows = [
			{ '': 1, Name: 'Marta', '   ': 'x', nested: { a: 1 } },
			null,
			'text',
			42,
			{ Name: 'Jonas', Score: 3 },
		] as unknown as Array<Record<string, unknown>>;
		expect(candidateColumns(rows)).toEqual(['Name', 'Score']);
	});

	it('truncates displayed column names to 60 chars while looking rows up by the full key', () => {
		const long = 'k'.repeat(70);
		const table = tableFromRows([{ [long]: 'v1', b: 'v2' }, null as never], 2, [long, 'b']);
		expect(table.columns[0]).toHaveLength(60);
		expect(table.columns[0].endsWith('…')).toBe(true);
		expect(table.columns[1]).toBe('b');
		expect(table.rows).toEqual([['v1', 'v2']]);
		expect(table.total).toBe(2);
	});
});

describe('buildGenericCard — schema limits', () => {
	it('truncates the generic envelope and target to the schema limits', () => {
		const longName = 'Fetch ranking for the regional table of every club in the league '.repeat(3);
		expect(longName.length).toBeGreaterThan(120);
		const set = buildCandidateSet(
			makeFacts({
				nodeName: longName,
				nodeType: 'n8n-nodes-base.httpRequest',
				isFinalOutput: true,
				items: [
					{ player: 'Zofia O.', rank: 184 },
					{ player: 'Eva M.', rank: 185 },
				],
			}),
		);
		expect(set).not.toBeNull();
		const card = set!.defaultCard;
		expect(card.type).toBe('records');
		if (card.type !== 'records') return;
		expect(card.title.length).toBeLessThanOrEqual(80);
		expect(card.title.endsWith('…')).toBe(true);
		// `truncate` trims a trailing space before the ellipsis, so the length may be 119 or 120.
		expect(card.nodeName?.length).toBeLessThanOrEqual(120);
		expect(card.nodeName?.endsWith('…')).toBe(true);
		expect(card.target.length).toBeLessThanOrEqual(120);
		expect(card.target.endsWith('…')).toBe(true);
		expect(resultCardSchema.safeParse(card).success).toBe(true);
	});

	it('truncates a long metric label derived from the field name', () => {
		const longKey = 'totalNumberOfQualifiedLeadsCollectedFromEveryMarketingChannelThisWeek';
		expect(longKey.length).toBeGreaterThan(60);
		const set = buildCandidateSet(
			makeFacts({
				nodeName: 'Summary',
				nodeType: 'n8n-nodes-base.code',
				isFinalOutput: true,
				items: [{ [longKey]: 42 }],
			}),
		);
		expect(set?.defaultCard).toMatchObject({ type: 'metric', value: '42' });
		if (set?.defaultCard.type !== 'metric') return;
		expect(set.defaultCard.label).toHaveLength(60);
		expect(set.defaultCard.label.endsWith('…')).toBe(true);
	});
});
