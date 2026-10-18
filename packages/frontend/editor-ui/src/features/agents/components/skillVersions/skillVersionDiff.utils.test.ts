import type { SkillVersionSummary } from '@n8n/api-types';

import type { AgentSkill } from '../../types';
import {
	countLineChanges,
	countSkillDiff,
	getSkillDiffSections,
	groupSkillTimeline,
	skillUserName,
} from './skillVersionDiff.utils';

const base: AgentSkill = {
	name: 'Refund policy',
	description: 'How to answer refund requests',
	instructions: '# Refund policy\n\nRefunds are possible within 14 days.',
};

function version(versionNumber: number, label: string | null = null): SkillVersionSummary {
	return {
		id: `v${versionNumber}`,
		version: versionNumber,
		label,
		createdBy: null,
		createdAt: '2026-10-01T00:00:00.000Z',
		sourceCommitSha: null,
	};
}

describe('countLineChanges', () => {
	it('counts nothing for equal texts', () => {
		expect(countLineChanges('a\nb', 'a\nb')).toEqual({ added: 0, removed: 0 });
	});

	it('counts an added line', () => {
		expect(countLineChanges('a\nb', 'a\nx\nb')).toEqual({ added: 1, removed: 0 });
	});

	it('counts a changed line as one removed and one added', () => {
		expect(countLineChanges('a\nb\nc', 'a\nB\nc')).toEqual({ added: 1, removed: 1 });
	});

	it('counts every line of a new text, and none of an empty one', () => {
		expect(countLineChanges('', 'a\nb')).toEqual({ added: 2, removed: 0 });
		expect(countLineChanges('a\nb', '')).toEqual({ added: 0, removed: 2 });
	});

	it('finds the common lines when lines move', () => {
		expect(countLineChanges('a\nb\nc\nd', 'b\nc\nd\na')).toEqual({ added: 1, removed: 1 });
	});
});

describe('getSkillDiffSections', () => {
	it('lists name, description, instructions and each reference file', () => {
		const from: AgentSkill = { ...base, references: [{ path: 'a.md', content: 'one' }] };
		const to: AgentSkill = {
			...base,
			description: 'How to answer refund requests in the EU',
			references: [
				{ path: 'a.md', content: 'one' },
				{ path: 'b.md', content: 'two\nthree' },
			],
		};

		const sections = getSkillDiffSections(from, to);

		expect(sections.map(({ key }) => key)).toEqual([
			'name',
			'description',
			'instructions',
			'reference:a.md',
			'reference:b.md',
		]);
		expect(sections.map(({ changed }) => changed)).toEqual([false, true, false, false, true]);
		expect(sections[4]).toMatchObject({ path: 'b.md', from: '', added: 2, removed: 0 });
	});

	it('compares a deleted reference file with an empty file', () => {
		const from: AgentSkill = { ...base, references: [{ path: 'a.md', content: 'one' }] };

		expect(getSkillDiffSections(from, base)[3]).toMatchObject({
			path: 'a.md',
			to: '',
			added: 0,
			removed: 1,
		});
	});
});

describe('countSkillDiff', () => {
	it('adds up the lines of every section', () => {
		const to: AgentSkill = {
			...base,
			name: 'Refunds',
			instructions: `${base.instructions}\nAsk for the order number first.`,
			references: [{ path: 'a.md', content: 'one\ntwo' }],
		};

		expect(countSkillDiff(base, to)).toEqual({ added: 4, removed: 1 });
		expect(countSkillDiff(base, base)).toEqual({ added: 0, removed: 0 });
	});
});

describe('skillUserName', () => {
	it('prefers the full name, then the email', () => {
		expect(
			skillUserName({ id: '1', email: 'a@acme.test', firstName: 'Ada', lastName: 'Lovelace' }),
		).toBe('Ada Lovelace');
		expect(skillUserName({ id: '1', email: 'a@acme.test', firstName: null, lastName: null })).toBe(
			'a@acme.test',
		);
		expect(skillUserName(null)).toBeUndefined();
	});
});

describe('groupSkillTimeline', () => {
	it('folds runs of two or more unnamed versions', () => {
		const versions = [
			version(6),
			version(5),
			version(4),
			version(3, 'EU rules'),
			version(2),
			version(1),
		];

		const entries = groupSkillTimeline(versions, ({ version: n }) => n === 6);

		expect(
			entries.map((entry) =>
				entry.type === 'version'
					? entry.version.version
					: entry.versions.map(({ version: n }) => n),
			),
		).toEqual([6, [5, 4], 3, [2, 1]]);
	});

	it('keeps a single unnamed version as its own row', () => {
		const entries = groupSkillTimeline([version(3), version(2), version(1, 'First')], () => false);

		expect(entries.map((entry) => entry.type)).toEqual(['unnamed', 'version']);
		const kept = groupSkillTimeline([version(2, 'Second'), version(1)], () => false);
		expect(kept.map((entry) => entry.type)).toEqual(['version', 'version']);
	});

	it('keeps the versions that have agents on them', () => {
		const entries = groupSkillTimeline(
			[version(3), version(2), version(1)],
			({ version: n }) => n === 2,
		);

		expect(entries.map((entry) => entry.type)).toEqual(['version', 'version', 'version']);
	});
});
