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
});
