import { describe, expect, it } from 'vitest';

import { SeededEntities } from '../seeded-entities';

describe('SeededEntities', () => {
	it('drops entities already recorded by id and rewrites sibling refs to the stored ref', () => {
		const seeded = new SeededEntities();
		seeded.record({
			world_version: 1,
			native: {
				linear: {
					teams: [{ id: 'team-uuid-1', key: 'FIN', ref: 'team:fin', name: 'Finance' }],
				},
			},
		});

		const deduped = seeded.dedupe({
			world_version: 1,
			native: {
				linear: {
					teams: [{ id: 'team-uuid-1', key: 'FIN', ref: 'team:finance', name: 'Finance' }],
					issues: [{ id: 'issue-uuid-1', ref: 'issue:1', title: 'Audit', team: 'team:finance' }],
				},
			},
		});

		expect(deduped).toEqual({
			world_version: 1,
			native: {
				linear: {
					teams: [],
					issues: [{ id: 'issue-uuid-1', ref: 'issue:1', title: 'Audit', team: 'team:fin' }],
				},
			},
		});
	});

	it('drops entities matched by collection key even when the id differs and aliases the ref', () => {
		const seeded = new SeededEntities();
		seeded.record({
			native: {
				linear: {
					teams: [{ id: 'team-uuid-1', key: 'ENG', ref: 'team:eng' }],
				},
			},
		});

		const deduped = seeded.dedupe({
			native: {
				linear: {
					teams: [{ id: 'team-uuid-other', key: 'eng', ref: 'team:engineering' }],
					issues: [{ id: 'issue-1', title: 'Fix', team: 'team:engineering' }],
				},
			},
		});

		expect(deduped).toEqual({
			native: {
				linear: {
					teams: [],
					issues: [{ id: 'issue-1', title: 'Fix', team: 'team:eng' }],
				},
			},
		});
	});

	it('assigns the stored ref on detail refresh of a shallow entity even when ref is omitted', () => {
		const seeded = new SeededEntities();
		seeded.record(
			{
				native: {
					linear: {
						issues: [{ id: 'issue-uuid-1', ref: 'issue:fin-412', title: 'Short' }],
					},
				},
			},
			true,
		);

		const deduped = seeded.dedupe(
			{
				native: {
					linear: {
						issues: [{ id: 'issue-uuid-1', title: 'Full title', description: 'Details' }],
					},
				},
			},
			true,
		);

		expect(deduped).toEqual({
			native: {
				linear: {
					issues: [
						{
							id: 'issue-uuid-1',
							ref: 'issue:fin-412',
							title: 'Full title',
							description: 'Details',
						},
					],
				},
			},
		});
	});

	it('tracks held ids and reports empty overlays', () => {
		const seeded = new SeededEntities();
		seeded.hold(['FIN-412']);
		expect(seeded.knows(['fin412'])).toBe(true);
		expect(seeded.knows(['fin999'])).toBe(false);

		const deduped = seeded.dedupe({
			world_version: 1,
			native: {
				linear: {
					issues: [{ id: 'FIN-412', title: 'Created in gym' }],
				},
			},
		});

		expect(SeededEntities.isEmpty(deduped)).toBe(true);
	});
});
