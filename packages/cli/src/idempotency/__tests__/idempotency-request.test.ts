import {
	fingerprintParts,
	honorsIdempotencyKey,
	parseIdempotencyKey,
} from '@/idempotency/idempotency-request';

describe('parseIdempotencyKey', () => {
	it('treats a missing, empty, or whitespace-only header as absent', () => {
		expect(parseIdempotencyKey(undefined)).toEqual({ kind: 'absent' });
		expect(parseIdempotencyKey('')).toEqual({ kind: 'absent' });
		expect(parseIdempotencyKey('   ')).toEqual({ kind: 'absent' });
	});

	it('trims a valid key and keeps the remaining characters', () => {
		expect(parseIdempotencyKey('  abc-123  ')).toEqual({ kind: 'present', value: 'abc-123' });
	});

	it('rejects a key that is too long, has a space, or is not a single value', () => {
		expect(parseIdempotencyKey('a'.repeat(129))).toEqual({ kind: 'invalid' });
		expect(parseIdempotencyKey('bad key')).toEqual({ kind: 'invalid' });
		expect(parseIdempotencyKey('café')).toEqual({ kind: 'invalid' });
		expect(parseIdempotencyKey(['one', 'two'])).toEqual({ kind: 'invalid' });
	});
});

describe('honorsIdempotencyKey', () => {
	it.each(['GET', 'HEAD', 'PUT', 'PATCH', 'DELETE'])('ignores %s', (method) => {
		expect(honorsIdempotencyKey(method, '/api/v1/workflows')).toBe(false);
	});

	it('honors a create and a retry', () => {
		expect(honorsIdempotencyKey('POST', '/api/v1/workflows')).toBe(true);
		expect(honorsIdempotencyKey('POST', '/api/v1/executions/15/retry')).toBe(true);
		expect(honorsIdempotencyKey('POST', '/api/v1/workflows/abc/test-runs')).toBe(true);
	});

	it.each([
		'/api/v1/workflows/abc/activate',
		'/api/v1/workflows/abc/deactivate',
		'/api/v1/workflows/abc/publish',
		'/api/v1/workflows/abc/unpublish',
		'/api/v1/workflows/abc/archive',
		'/api/v1/workflows/abc/unarchive',
		'/api/v1/workflows/abc/transfer',
		'/api/v1/credentials/abc/test',
		'/api/v1/settings/otel/test-trace',
	])('ignores %s', (path) => {
		expect(honorsIdempotencyKey('POST', path)).toBe(false);
	});
});

describe('fingerprintParts', () => {
	const base = {
		method: 'POST',
		path: '/api/v1/workflows',
		query: 'source=api',
		body: '{"name":"Hello"}',
	};

	it('returns the same hash for the same request', () => {
		expect(fingerprintParts(base)).toBe(fingerprintParts({ ...base, method: 'post' }));
	});

	it('changes when the body, query, or path changes', () => {
		const original = fingerprintParts(base);

		expect(fingerprintParts({ ...base, body: '{"name":"Other"}' })).not.toBe(original);
		expect(fingerprintParts({ ...base, query: '' })).not.toBe(original);
		expect(fingerprintParts({ ...base, path: '/api/v1/credentials' })).not.toBe(original);
	});
});
