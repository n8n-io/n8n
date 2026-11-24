import { getSanitizedCurrentPath, getSsoRedirectPath } from '@/app/utils/urlUtils';

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

describe('getSsoRedirectPath', () => {
	it.each([
		['%2Fhome%2Fcredentials', '/home/credentials'],
		['%2Fworkflow%2Fabc%3Ffoo%3Da%2526b', '/workflow/abc?foo=a%26b'],
		['/home/workflows', '/home/workflows'],
		['/workflow/abc?foo=a%26b', '/workflow/abc?foo=a%26b'],
	])('returns the in-app path for %s', (redirect, expected) => {
		expect(getSsoRedirectPath(redirect)).toBe(expected);
	});

	it('returns a path at the size limit', () => {
		const path = `/${'a'.repeat(2047)}`;
		expect(getSsoRedirectPath(path)).toBe(path);
	});

	it.each([
		['an absolute URL', 'https://n8n.local/form/x'],
		['a protocol-relative URL', '//example.com'],
		['an encoded protocol-relative URL', '%2F%2Fexample.com'],
		['a malformed encoding', '%E0%A4%A'],
		['an empty value', ''],
		['a missing value', undefined],
		['a repeated query parameter', ['/a', '/b']],
		['a path over the size limit', `/${'a'.repeat(2048)}`],
		['a path over the size limit in UTF-8 bytes', `/${'é'.repeat(1024)}`],
	])('returns an empty string for %s', (_, redirect) => {
		expect(getSsoRedirectPath(redirect)).toBe('');
	});
});
