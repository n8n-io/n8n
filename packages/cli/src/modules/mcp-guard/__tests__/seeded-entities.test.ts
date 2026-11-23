import { SeededEntities } from '../seeded-entities';

const team = { ref: 'team:LHO', id: 'team-1', key: 'LHO' };

describe('SeededEntities', () => {
	it('keeps everything while nothing is seeded', () => {
		const overlay = { world_version: 1, native: { linear: { teams: [team] } } };
		expect(new SeededEntities().dedupe(overlay)).toBe(overlay);
	});

	it('removes an entity that was seeded, by id', () => {
		const seeded = new SeededEntities();
		seeded.record({ native: { linear: { teams: [team] } } });
		const left = seeded.dedupe({
			world_version: 1,
			native: {
				linear: {
					teams: [
						{ ...team, ref: 'other' },
						{ ref: 'team:new', id: 'team-2' },
					],
				},
			},
		});
		expect(left).toEqual({
			world_version: 1,
			native: { linear: { teams: [{ ref: 'team:new', id: 'team-2' }] } },
		});
	});

	it('writes a reference with the stored letter case', () => {
		const seeded = new SeededEntities();
		seeded.record({ native: { linear: { teams: [team] } } });
		const left = seeded.dedupe({
			native: { linear: { projects: [{ ref: 'project:p', id: 'p-1', team: 'team:lho' }] } },
		});
		expect(left).toEqual({
			native: { linear: { projects: [{ ref: 'project:p', id: 'p-1', team: 'team:LHO' }] } },
		});
	});

	it('does not change the input', () => {
		const seeded = new SeededEntities();
		seeded.record({ native: { linear: { teams: [team] } } });
		const overlay = { native: { linear: { teams: [team] } } };
		seeded.dedupe(overlay);
		expect(overlay.native.linear.teams).toHaveLength(1);
	});

	it('knows an overlay with no entity is empty', () => {
		expect(SeededEntities.isEmpty({ world_version: 1, native: { linear: { teams: [] } } })).toBe(
			true,
		);
		expect(
			SeededEntities.isEmpty({ world_version: 1, native: { linear: { teams: [team] } } }),
		).toBe(false);
		expect(SeededEntities.isEmpty({ world_version: 1, persona: { name: 'x' } })).toBe(false);
	});

	it('removes an entity under the id of an object that the gym holds', () => {
		const seeded = new SeededEntities();
		seeded.hold(['TRUST-1']);
		const left = seeded.dedupe({
			native: {
				linear: { issues: [{ ref: 'issue:TRUST-1', number: 1 }, { ref: 'issue:TRUST-9' }] },
			},
		});
		expect(left).toEqual({ native: { linear: { issues: [{ ref: 'issue:TRUST-9' }] } } });
	});

	it('removes a team with a key that the tenant has, and points its references at the stored ref', () => {
		const seeded = new SeededEntities();
		seeded.record({ native: { linear: { teams: [team] } } });
		const left = seeded.dedupe({
			native: {
				linear: {
					teams: [{ ref: 'team:trust', key: 'LHO' }],
					projects: [{ ref: 'project:p', team: 'team:trust' }],
				},
			},
		});
		expect(left).toEqual({
			native: { linear: { teams: [], projects: [{ ref: 'project:p', team: 'team:LHO' }] } },
		});
	});

	it('removes a nested entity that the tenant has', () => {
		const seeded = new SeededEntities();
		seeded.hold(['c-1']);
		const left = seeded.dedupe({
			native: {
				linear: { issues: [{ ref: 'issue:a', comments: [{ id: 'c-1' }, { id: 'c-2' }] }] },
			},
		});
		expect(left).toEqual({
			native: { linear: { issues: [{ ref: 'issue:a', comments: [{ id: 'c-2' }] }] } },
		});
	});

	it('knows when it holds every id', () => {
		const seeded = new SeededEntities();
		seeded.hold(['91f85091-a3fe-4d7d-a6ba-e43b5805ec12']);
		expect(seeded.knows(['91f85091a3fe4d7da6bae43b5805ec12'])).toBe(true);
		expect(seeded.knows(['91f85091a3fe4d7da6bae43b5805ec12', 'trust1'])).toBe(false);
	});

	describe('an entity that the tenant has and that brings new children', () => {
		const db = { ref: 'db:a', id: 'db-1' };
		const again = {
			native: {
				notion: {
					databases: [
						{
							...db,
							rows: [
								{ ref: 'row:1', id: 'r-1' },
								{ ref: 'row:2', id: 'r-2' },
							],
						},
					],
				},
			},
		};
		const first = {
			native: { notion: { databases: [{ ...db, rows: [{ ref: 'row:1', id: 'r-1' }] }] } },
		};

		it('is dropped with its children by default', () => {
			const seeded = new SeededEntities();
			seeded.record(first);
			expect(seeded.dedupe(again)).toEqual({ native: { notion: { databases: [] } } });
		});

		it('stays with the new children only when the parents are kept', () => {
			const seeded = new SeededEntities({ keepParents: true });
			seeded.record(first);
			expect(seeded.dedupe(again)).toEqual({
				native: { notion: { databases: [{ ...db, rows: [{ ref: 'row:2', id: 'r-2' }] }] } },
			});
		});

		it('goes when no new child is left', () => {
			const seeded = new SeededEntities({ keepParents: true });
			seeded.record(again);
			expect(seeded.dedupe(again)).toEqual({ native: { notion: { databases: [] } } });
		});
	});

	describe('entities that a list seeded', () => {
		const issue = { id: 'i-1', ref: 'issue:a', title: 'T', description: 'short' };
		const full = { ...issue, ref: 'issue:other', description: 'the whole text' };
		const overlay = { world_version: 1, native: { linear: { issues: [full] } } };

		it('lets a detail call seed the entity again, under the stored ref', () => {
			const seeded = new SeededEntities();
			seeded.record({ native: { linear: { issues: [issue] } } }, true);
			expect(seeded.dedupe(overlay, true)).toEqual({
				world_version: 1,
				native: { linear: { issues: [{ ...full, ref: 'issue:a' }] } },
			});
		});

		it('drops the entity again for another list', () => {
			const seeded = new SeededEntities();
			seeded.record({ native: { linear: { issues: [issue] } } }, true);
			expect(seeded.dedupe(overlay, false)).toEqual({
				world_version: 1,
				native: { linear: { issues: [] } },
			});
		});

		it('drops the entity once a detail call has seeded it', () => {
			const seeded = new SeededEntities();
			seeded.record({ native: { linear: { issues: [issue] } } }, true);
			seeded.record(overlay, false);
			expect(seeded.dedupe(overlay, true)).toEqual({
				world_version: 1,
				native: { linear: { issues: [] } },
			});
		});
	});
});
