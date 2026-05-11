import { validateRedirectUrl } from '../validate-redirect-url';

describe('validateRedirectUrl', () => {
	it.each([
		['/workflow/123', '/workflow/123'],
		['/workflows', '/workflows'],
		['/', '/'],
		['/path?query=1', '/path?query=1'],
		['/path#fragment', '/path#fragment'],
		['  /trimmed  ', '/trimmed'],
	])('allows valid relative path %s → %s', (input, expected) => {
		expect(validateRedirectUrl(input)).toBe(expected);
	});

	it.each([
		['', '/'],
		['   ', '/'],
		['https://evil.com/phishing', '/'],
		['//evil.com/phishing', '/'],
		['javascript:alert(1)', '/'],
		['%2F%2Fevil.com/phishing', '/'],
		['workflows/123', '/'],
		['data:text/html,<h1>hi</h1>', '/'],
	])('rejects unsafe redirect %s → %s', (input, expected) => {
		expect(validateRedirectUrl(input)).toBe(expected);
	});

	it('returns / for non-string input', () => {
		expect(validateRedirectUrl(undefined as unknown as string)).toBe('/');
		expect(validateRedirectUrl(null as unknown as string)).toBe('/');
		expect(validateRedirectUrl(123 as unknown as string)).toBe('/');
	});
});
