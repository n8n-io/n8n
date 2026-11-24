import { parseVersionedWorkspaceManifest } from '../workspace-manifest';

describe('parseVersionedWorkspaceManifest', () => {
	it('parses a valid manifest', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 1, contentHash: 'abc123' }), {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toEqual({
			schemaVersion: 1,
			hashField: 'contentHash',
			hash: 'abc123',
		});
	});

	it('returns null for invalid JSON', () => {
		expect(
			parseVersionedWorkspaceManifest('not-json', {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toBeNull();
	});

	it('returns null for schema version mismatch', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 2, contentHash: 'abc' }), {
				schemaVersion: 1,
				hashField: 'contentHash',
			}),
		).toBeNull();
	});

	it('returns null for empty hash values', () => {
		expect(
			parseVersionedWorkspaceManifest(JSON.stringify({ schemaVersion: 1, skillsHash: '' }), {
				schemaVersion: 1,
				hashField: 'skillsHash',
			}),
		).toBeNull();
	});
});
