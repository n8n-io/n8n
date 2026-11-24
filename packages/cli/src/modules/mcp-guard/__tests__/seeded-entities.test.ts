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

	const linear = (collection: string, items: Array<Record<string, unknown>>) => ({
		world_version: 1,
		native: { linear: { [collection]: items } },
	});

	it('knows ids that it holds whatever their dashes and case', () => {
		const seeded = new SeededEntities();
		seeded.hold(['FIN-412']);
		expect(seeded.knows(['FIN-412'])).toBe(true);
		expect(seeded.knows(['fin412'])).toBe(true);
		expect(seeded.knows(['FIN-413'])).toBe(false);
	});

	it('writes references to an entity without a ref with its id as the gym received it', () => {
		const seeded = new SeededEntities();
		seeded.record(linear('teams', [{ id: 'Team-ABC', name: 'Finance' }]));

		const deduped = seeded.dedupe(
			linear('issues', [{ id: 'issue-1', ref: 'issue:1', team: 'team-abc' }]),
		);

		expect(deduped).toEqual(
			linear('issues', [{ id: 'issue-1', ref: 'issue:1', team: 'Team-ABC' }]),
		);
	});

	it('does not seed again an entity that a later result shows by its ref only', () => {
		const seeded = new SeededEntities();
		seeded.record(linear('teams', [{ id: 'team-uuid-1', ref: 'team:fin', name: 'Finance' }]));

		expect(seeded.dedupe(linear('teams', [{ ref: 'team:FIN', name: 'Finance' }]))).toEqual(
			linear('teams', []),
		);
	});

	it('keeps a parent with new children under the ref that the gym stored', () => {
		const seeded = new SeededEntities({ keepParents: true });
		seeded.record(linear('databases', [{ id: 'db-1', ref: 'db:tasks', title: 'Tasks' }]));

		const deduped = seeded.dedupe(
			linear('databases', [{ id: 'db-1', ref: 'db:alias', rows: [{ id: 'row-1', name: 'New' }] }]),
		);

		expect(deduped).toEqual(
			linear('databases', [{ id: 'db-1', ref: 'db:tasks', rows: [{ id: 'row-1', name: 'New' }] }]),
		);
	});
});
