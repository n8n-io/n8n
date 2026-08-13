import {
	ProjectFilePreviewableMimeTypes,
	ViewableMimeTypes,
	isProjectFilePreviewable,
} from '../binary-data.schema';

describe('ProjectFilePreviewableMimeTypes', () => {
	it('is a strict subset of ViewableMimeTypes', () => {
		// The guardrail for this whole feature: project file preview can never grant
		// inline rendering to a type the instance-wide policy rejects. If someone
		// widens this list, that has to be a deliberate change to ViewableMimeTypes
		// and the security reasoning behind it.
		const notViewable = ProjectFilePreviewableMimeTypes.filter(
			(mimeType) => !ViewableMimeTypes.includes(mimeType),
		);

		expect(notViewable).toEqual([]);
		expect(ProjectFilePreviewableMimeTypes.length).toBeLessThan(ViewableMimeTypes.length);
	});

	it.each(['text/html', 'image/svg+xml', 'application/pdf'])('never previews %s', (mimeType) => {
		expect(isProjectFilePreviewable(mimeType)).toBe(false);
	});

	it('does not treat every text/* type as previewable', () => {
		// A `startsWith('text/')` rule would let text/html through.
		expect(isProjectFilePreviewable('text/plain')).toBe(true);
		expect(isProjectFilePreviewable('text/html')).toBe(false);
	});

	it('matches case-insensitively, since the MIME type is client-declared', () => {
		expect(isProjectFilePreviewable('IMAGE/PNG')).toBe(true);
	});

	it.each(['audio/mpeg', 'video/mp4', 'image/tiff'])(
		'defers %s until the content route supports it',
		(mimeType) => {
			expect(ViewableMimeTypes).toContain(mimeType);
			expect(isProjectFilePreviewable(mimeType)).toBe(false);
		},
	);
});
