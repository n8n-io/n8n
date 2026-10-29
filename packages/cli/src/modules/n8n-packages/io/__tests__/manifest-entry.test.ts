import { PackageExportBlockedError } from '../../entities/package-export.errors';
import { createManifestEntry } from '../manifest-entry';

describe('createManifestEntry', () => {
	it.each(['nanoid_123', '42', '3f7c1e2a9b4d4e118a556d2f0c9b7e13'])('accepts the id %s', (id) => {
		expect(createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' })).toEqual({
			id,
			name: 'Daily Report',
			target: `workflows/daily-report-${id}`,
		});
	});

	it.each(['a/b', '..', 'with space', 'nanoid_-123', '3f7c1e2a-9b4d-4e11-8a55-6d2f0c9b7e13'])(
		'blocks the export for the id %s',
		(id) => {
			expect(() =>
				createManifestEntry('workflows', 'workflows', { id, name: 'Daily Report' }),
			).toThrow(PackageExportBlockedError);
		},
	);

	it('accepts a skill id with hyphens and still blocks a path separator', () => {
		expect(createManifestEntry('skills', 'skills', { id: 'release-notes', name: 'Notes' })).toEqual(
			{ id: 'release-notes', name: 'Notes', target: 'skills/notes-release-notes' },
		);
		expect(() => createManifestEntry('skills', 'skills', { id: 'a/b', name: 'Notes' })).toThrow(
			PackageExportBlockedError,
		);
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
