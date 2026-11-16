import { normalizeEndpoint } from './normalizeEndpoint';

describe('normalizeEndpoint', () => {
	it.each([
		['  https://gateway.example.com/v1  ', 'https://gateway.example.com/v1'],
		['https://gateway.example.com/v1/', 'https://gateway.example.com/v1'],
		['https://gateway.example.com/v1///', 'https://gateway.example.com/v1'],
		['https://gateway.example.com/v1', 'https://gateway.example.com/v1'],
		['   ', ''],
	])('turns %j into %j', (endpoint, expected) => {
		expect(normalizeEndpoint(endpoint)).toBe(expected);
	});

	it('keeps a missing endpoint missing', () => {
		expect(normalizeEndpoint(undefined)).toBeUndefined();
	});
});
