import { getSanitizedCurrentPath } from '@/app/utils/urlUtils';

describe('getSanitizedCurrentPath', () => {
	it('returns the path and query as-is when there is no redirect param', () => {
		expect(getSanitizedCurrentPath({ fullPath: '/workflow/1?tab=settings' })).toBe(
			'/workflow/1?tab=settings',
		);
	});

	it('strips an existing redirect param to avoid infinite-redirect nesting', () => {
		expect(
			getSanitizedCurrentPath({
				fullPath: '/signin?redirect=%2Fworkflow%2F1&sessionExpired=true',
			}),
		).toBe('/signin?sessionExpired=true');
	});

	it('returns just the path when there is no query string', () => {
		expect(getSanitizedCurrentPath({ fullPath: '/workflow/1' })).toBe('/workflow/1');
	});
});
