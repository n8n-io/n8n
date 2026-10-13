import { derivePublishedState } from '../workflow-published-state';

describe('derivePublishedState', () => {
	it('reports published when the metadata file names the exported version as live', () => {
		expect(derivePublishedState({ versionId: 'version-1', publishedVersionId: 'version-1' })).toBe(
			true,
		);
	});

	it('reports unpublished when the source publishes nothing', () => {
		expect(derivePublishedState({ versionId: 'version-1', publishedVersionId: null })).toBe(false);
	});

	it('says nothing when the source publishes a version this package does not carry', () => {
		expect(
			derivePublishedState({ versionId: 'version-2', publishedVersionId: 'version-1' }),
		).toBeUndefined();
	});
});
