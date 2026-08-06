import type { INodeExecutionData } from 'n8n-workflow';

import { extractBearerToken } from '../extract-bearer-token';

function triggerItem(headers: Record<string, unknown> | undefined): INodeExecutionData[] {
	return [{ json: { headers } }];
}

describe('extractBearerToken', () => {
	it('returns the token from a well-formed Authorization header', () => {
		expect(extractBearerToken(triggerItem({ authorization: 'Bearer abc.def.ghi' }))).toBe(
			'abc.def.ghi',
		);
	});

	it('is case-insensitive on the Bearer scheme', () => {
		expect(extractBearerToken(triggerItem({ authorization: 'bearer abc' }))).toBe('abc');
	});

	it('returns null when triggerItems is null', () => {
		expect(extractBearerToken(null)).toBeNull();
	});

	it('returns null when triggerItems is empty', () => {
		expect(extractBearerToken([])).toBeNull();
	});

	it('returns null when there is no headers object', () => {
		expect(extractBearerToken(triggerItem(undefined))).toBeNull();
	});

	it('returns null when headers is not an object', () => {
		expect(extractBearerToken([{ json: { headers: 'not-an-object' } }])).toBeNull();
	});

	it('returns null when headers is an array', () => {
		expect(extractBearerToken([{ json: { headers: ['a', 'b'] } }])).toBeNull();
	});

	it('returns null when there is no authorization header', () => {
		expect(extractBearerToken(triggerItem({ 'x-other': 'value' }))).toBeNull();
	});

	it('returns null for a non-Bearer scheme', () => {
		expect(extractBearerToken(triggerItem({ authorization: 'Basic abc' }))).toBeNull();
	});

	it('returns null when the authorization header is not a string', () => {
		expect(extractBearerToken([{ json: { headers: { authorization: 12345 } } }])).toBeNull();
	});

	it('returns null when the Bearer value is only whitespace', () => {
		expect(extractBearerToken(triggerItem({ authorization: 'Bearer    ' }))).toBeNull();
	});

	it('truncates and never throws on an extremely long header value', () => {
		const longValue = `Bearer ${'a'.repeat(20000)}`;
		expect(() => extractBearerToken(triggerItem({ authorization: longValue }))).not.toThrow();
		const result = extractBearerToken(triggerItem({ authorization: longValue }));
		expect(result).not.toBeNull();
		expect(result!.length).toBeLessThanOrEqual(8192);
	});
});
