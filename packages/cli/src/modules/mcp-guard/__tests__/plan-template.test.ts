import { describe, expect, it } from 'vitest';

import {
	dropUnprovenIds,
	fillPointers,
	idsInArgs,
	knownText,
	missingIds,
	provenIds,
	removeUnprovenLiterals,
} from '../plan-template';

const UUID = '3f2a1b4c-5d6e-4f70-8a9b-0c1d2e3f4a5b';

describe('fillPointers', () => {
	const ctx = {
		result: { description: 'Real text', team: { id: 'team-1' }, items: ['a', 'b'] },
		reads: [{ title: 'First read' }],
	};

	it('replaces pointers to the result and to reads', () => {
		expect(
			fillPointers(
				{ body: '$result.description', team: '$result.team.id', title: '$reads[0].title' },
				ctx,
			),
		).toEqual({ body: 'Real text', team: 'team-1', title: 'First read' });
	});

	it('follows array indexes', () => {
		expect(fillPointers('$result.items[1]', ctx)).toBe('b');
	});

	it('drops keys and array items whose pointer names nothing', () => {
		expect(
			fillPointers({ a: '$result.missing', list: ['$result.missing', 'kept'], b: 'text' }, ctx),
		).toEqual({ list: ['kept'], b: 'text' });
	});

	it.each(['$result.constructor', '$result.__proto__', '$result.team.toString'])(
		'does not resolve the inherited property in %s',
		(pointer) => {
			expect(fillPointers({ value: pointer }, ctx)).toEqual({});
		},
	);

	it('leaves strings that are not whole pointers alone', () => {
		expect(fillPointers('see $result.description', ctx)).toBe('see $result.description');
	});
});

describe('idsInArgs and missingIds', () => {
	it('finds UUIDs inside urls and issue keys, without dashes and in lower case', () => {
		expect(idsInArgs({ url: `https://linear.app/x/${UUID}`, keys: ['TRUST-1209'] }).sort()).toEqual(
			[UUID.replace(/-/g, ''), 'trust1209'].sort(),
		);
	});

	it('matches an issue key only whole', () => {
		expect(missingIds(['trust120'], 'TRUST-1209 is open')).toEqual(['trust120']);
		expect(missingIds(['trust1209'], 'TRUST-1209 is open')).toEqual([]);
	});

	it('matches a 32-character issue key whole', () => {
		const key = `${'z'.repeat(30)}-12`;
		const id = key.replace('-', '');
		expect(missingIds([id], `${key}3 is open`)).toEqual([id]);
		expect(missingIds([id], `${key} is open`)).toEqual([]);
	});

	it('finds a dashless UUID inside text, also when it looks like an issue key', () => {
		const dashless = 'abcdef0123456789abcdef0123456789';
		expect(missingIds([dashless], `url/${dashless}`)).toEqual([]);
		expect(missingIds([dashless], 'nothing here')).toEqual([dashless]);
	});
});

describe('dropUnprovenIds', () => {
	it('keeps ids of the real data and drops invented ones', () => {
		const proven = provenIds({ id: UUID });
		expect(
			dropUnprovenIds(
				{ id: UUID, children: [{ id: 'made-up', name: 'x' }, { data_source_id: UUID }] },
				proven,
			),
		).toEqual({ id: UUID, children: [{ name: 'x' }, { data_source_id: UUID }] });
	});
});

describe('removeUnprovenLiterals', () => {
	const known = knownText({ title: 'Quarterly audit', assignee: 'Dana Smith', team: 'Finance' });

	it('keeps text of the real data and structure, and flags the rest', () => {
		const { cleaned, flagged } = removeUnprovenLiterals(
			{ title: 'Quarterly audit', type: 'select', ref: 'issue:1', body: 'Invented text' },
			known,
		);
		expect(cleaned).toEqual({ title: 'Quarterly audit', type: 'select', ref: 'issue:1' });
		expect(flagged).toEqual([{ path: 'body', value: 'Invented text' }]);
	});

	it('checks names of people and teams against the real data', () => {
		const { cleaned, flagged } = removeUnprovenLiterals(
			{ assignee: 'Dana Smith', lead: 'Invented Person', team: 'team:fin', labels: ['Ghost'] },
			known,
		);
		expect(cleaned).toEqual({ assignee: 'Dana Smith', team: 'team:fin', labels: [] });
		expect(flagged).toEqual([
			{ path: 'lead', value: 'Invented Person' },
			{ path: 'labels[0]', value: 'Ghost' },
		]);
	});
});
