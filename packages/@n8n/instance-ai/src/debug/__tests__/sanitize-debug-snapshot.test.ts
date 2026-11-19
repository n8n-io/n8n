import {
	sanitizeDebugSnapshotRecord,
	sanitizeDebugSnapshotValue,
} from '../sanitize-debug-snapshot';

describe('sanitizeDebugSnapshotValue', () => {
	it('redacts secrets and omits runtime-only payloads', () => {
		expect(
			sanitizeDebugSnapshotRecord({
				apiKey: 'plain-value',
				message: 'token sk-abcdefghijklmnop',
				abortSignal: new AbortController().signal,
				response: { body: 'raw provider response', status: 500 },
			}),
		).toEqual({
			apiKey: '[redacted]',
			message: '[REDACTED]',
			response: { status: 500 },
		});
	});

	it('scrubs error messages', () => {
		expect(sanitizeDebugSnapshotValue(new Error('failed with sk-abcdefghijklmnop'))).toEqual({
			name: 'Error',
			message: 'failed with [REDACTED]',
		});
	});

	it('handles circular values', () => {
		const value: Record<string, unknown> = {};
		value.self = value;

		expect(sanitizeDebugSnapshotValue(value)).toEqual({ self: '[Circular]' });
	});

	it('serializes a shared reference in each place it appears', () => {
		const shared = { anthropic: { eagerInputStreaming: false } };

		expect(
			sanitizeDebugSnapshotValue({
				first: { providerOptions: shared },
				second: [{ providerOptions: shared }],
			}),
		).toEqual({
			first: { providerOptions: shared },
			second: [{ providerOptions: shared }],
		});
	});
});
