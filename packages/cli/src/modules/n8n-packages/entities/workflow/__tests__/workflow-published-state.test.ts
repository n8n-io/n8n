import { derivePublishedState } from '../workflow-published-state';

describe('derivePublishedState', () => {
	it('reports published when the metadata file names the exported version', () => {
		expect(derivePublishedState({ publishedVersionId: 'version-1' }, 'version-1')).toBe(true);
	});

	it('reports unpublished when the source publishes nothing', () => {
		expect(derivePublishedState({ publishedVersionId: null }, 'version-1')).toBe(false);
	});

	it('says nothing when the source publishes a version this package does not carry', () => {
		expect(derivePublishedState({ publishedVersionId: 'version-1' }, 'version-2')).toBeUndefined();
	});
});
