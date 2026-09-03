import { PackageExportBlockedError } from '../../entities/package-export.errors';
import { createManifestEntry } from '../manifest-entry';

describe('createManifestEntry', () => {
	it.each(['nanoid_-123', '42', '3f7c1e2a-9b4d-4e11-8a55-6d2f0c9b7e13'])(
		'accepts the id %s',
		(id) => {
			expect(createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' })).toEqual({
				id,
				name: 'Daily Report',
				target: `workflows/daily-report-${id}`,
			});
		},
	);

	it.each(['a/b', '..', 'with space'])('blocks the export for the id %s', (id) => {
		expect(() =>
			createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' }),
		).toThrow(PackageExportBlockedError);
	});

	it('blocks an export when the path segment exceeds 255 characters', () => {
		expect(() =>
			createManifestEntry('projects', 'projects', {
				id: 'project-id',
				name: 'a'.repeat(255),
			}),
		).toThrow('Shorten the entity name and retry the export.');
	});
});
