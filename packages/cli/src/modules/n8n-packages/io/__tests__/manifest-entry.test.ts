import { createManifestEntry, entityIdOfSegment } from '../manifest-entry';

describe('createManifestEntry', () => {
	it.each(['nanoid_123', '42', '3f7c1e2a9b4d4e118a556d2f0c9b7e13'])('accepts the id %s', (id) => {
		expect(createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' })).toEqual({
			id,
			name: 'Daily Report',
			target: `workflows/daily-report-${id}`,
		});
	});

	it.each([
		['Equipo AI6401486', 'Equipo.20AI6401486'],
		['Ventas & Marketing', 'Ventas.20.26.20Marketing'],
		['Operación', 'Operaci.C3.B3n'],
		['a/b', 'a.2Fb'],
		['..', '.2E.2E'],
		['nanoid_-123', 'nanoid_.2D123'],
		['3f7c1e2a-9b4d', '3f7c1e2a.2D9b4d'],
		['rocket🚀', 'rocket.F0.9F.9A.80'],
	])('escapes the id %s in the target', (id, encoded) => {
		expect(createManifestEntry('projects', 'projects', { id, name: 'Equipo AI' })).toEqual({
			id,
			name: 'Equipo AI',
			target: `projects/equipo-ai-${encoded}`,
		});
	});

	it('gives ids that differ only in unsafe characters their own targets', () => {
		const targets = ['a b', 'a_b', 'a&b', 'a.20b', 'a-b'].map(
			(id) => createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' }).target,
		);

		expect(new Set(targets).size).toBe(targets.length);
	});

	it('blocks an export when the path segment exceeds 255 characters', () => {
		expect(() =>
			createManifestEntry('projects', 'projects', {
				id: 'projectid',
				name: 'a'.repeat(255),
			}),
		).toThrow('Shorten the entity name and retry the export.');
	});
});

describe('entityIdOfSegment', () => {
	it.each([
		'nanoid_123',
		'Equipo AI6401486',
		'Ventas & Marketing',
		'Operación',
		'a.20b',
		'3f7c1e2a-9b4d-4e11-8a55-6d2f0c9b7e13',
		'rocket🚀',
	])('reads the id %s back from its target', (id) => {
		const { target } = createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' });

		expect(entityIdOfSegment(target.split('/').at(-1)!)).toBe(id);
	});

	it('keeps text that is not a complete escape', () => {
		expect(entityIdOfSegment('daily-report-a.2')).toBe('a.2');
	});
});
