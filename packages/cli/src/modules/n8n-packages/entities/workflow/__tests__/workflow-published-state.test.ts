import { derivePublishedState } from '../workflow-published-state';

describe('derivePublishedState', () => {
	it('reports published when the lifecycle file names the exported version', () => {
		const lifecycle = { publishedVersionId: 'version-1', isArchived: false };

		expect(derivePublishedState(lifecycle, 'version-1')).toBe(true);
	});

	it('reports unpublished when the source publishes nothing', () => {
		const lifecycle = { publishedVersionId: null, isArchived: false };

		expect(derivePublishedState(lifecycle, 'version-1')).toBe(false);
	});

	it('says nothing when the published version is not the exported one', () => {
		const lifecycle = { publishedVersionId: 'version-1', isArchived: false };

		expect(derivePublishedState(lifecycle, 'version-2')).toBeUndefined();
	});
});
