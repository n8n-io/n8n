import { buildResumeUrlSuffix } from '../signature-helpers';

describe('buildResumeUrlSuffix', () => {
	it('should leave a uuid node id unchanged', () => {
		expect(buildResumeUrlSuffix('123', 'dddd2020-0000-4000-8000-000000002099')).toBe(
			'/123/dddd2020-0000-4000-8000-000000002099',
		);
	});

	it('should confine a node id to a single path segment', () => {
		expect(buildResumeUrlSuffix('123', '../43/other')).toBe('/123/..%2F43%2Fother');
	});

	it('should confine a node id that opens a query string', () => {
		expect(buildResumeUrlSuffix('123', 'x?approved=true')).toBe('/123/x%3Fapproved%3Dtrue');
	});

	describe('when the node id is a bare dot segment', () => {
		// Encoding leaves `.` and `..` untouched, so the documented outcome is a link that
		// collapses on parsing and no longer resolves. Pinned so the limitation stays visible.
		it.each([
			{ nodeId: '.', suffix: '/123/.', pathname: '/waiting-webhook/123/' },
			{ nodeId: '..', suffix: '/123/..', pathname: '/waiting-webhook/' },
		])('should collapse the path for a node id of "$nodeId"', ({ nodeId, suffix, pathname }) => {
			expect(buildResumeUrlSuffix('123', nodeId)).toBe(suffix);

			expect(new URL(`http://localhost/waiting-webhook${suffix}`).pathname).toBe(pathname);
		});
	});
});
