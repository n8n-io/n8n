import { QuotaExhaustedStreamError } from '../instance-ai.service';
import { isStreamTransportError } from '../stream-transport-error';

function withCause(error: Error, cause: unknown): Error {
	return Object.assign(error, { cause });
}

function socketError(code: string, message = 'socket failure'): Error {
	return Object.assign(new Error(message), { code });
}

describe('isStreamTransportError', () => {
	it('matches undici mid-stream termination with no cause attached', () => {
		expect(isStreamTransportError(new TypeError('terminated'))).toBe(true);
	});

	it('matches the production shape: TypeError terminated caused by ECONNRESET', () => {
		const error = withCause(
			new TypeError('terminated'),
			socketError('ECONNRESET', 'read ECONNRESET'),
		);
		expect(isStreamTransportError(error)).toBe(true);
	});

	it.each([
		'ECONNABORTED',
		'ECONNREFUSED',
		'ECONNRESET',
		'EHOSTUNREACH',
		'ENETDOWN',
		'ENETUNREACH',
		'EPIPE',
		'ETIMEDOUT',
		'UND_ERR_BODY_TIMEOUT',
		'UND_ERR_CONNECT_TIMEOUT',
		'UND_ERR_HEADERS_TIMEOUT',
		'UND_ERR_SOCKET',
	])('matches %s surfaced through the cause chain', (code) => {
		const error = withCause(new TypeError('fetch failed'), socketError(code));
		expect(isStreamTransportError(error)).toBe(true);
	});

	it('walks a nested cause chain, as the ai-sdk wraps transport errors', () => {
		const wrapped = withCause(
			new Error('AI_APICallError'),
			withCause(new TypeError('fetch failed'), socketError('UND_ERR_SOCKET', 'other side closed')),
		);
		expect(isStreamTransportError(wrapped)).toBe(true);
	});

	it('does not classify a quota-exhausted failure as transport, despite its transport cause', () => {
		const masked = withCause(new TypeError('terminated'), socketError('ECONNRESET'));
		expect(isStreamTransportError(new QuotaExhaustedStreamError(masked))).toBe(false);
	});

	it('leaves DNS failures unclassified so misconfigured base URLs stay visible', () => {
		const error = withCause(new TypeError('fetch failed'), socketError('ENOTFOUND'));
		expect(isStreamTransportError(error)).toBe(false);
	});

	it('does not match ordinary application errors', () => {
		expect(isStreamTransportError(new Error('kaboom'))).toBe(false);
		expect(isStreamTransportError(new Error('terminated'))).toBe(false);
		expect(isStreamTransportError(new TypeError('kaboom'))).toBe(false);
		expect(isStreamTransportError(undefined)).toBe(false);
		expect(isStreamTransportError('ECONNRESET')).toBe(false);
	});

	it('terminates on a self-referential cause chain', () => {
		const error: Error & { cause?: unknown } = new Error('loop');
		error.cause = error;
		expect(isStreamTransportError(error)).toBe(false);
	});

	it('terminates on a cyclic cause chain between two errors', () => {
		const first: Error & { cause?: unknown } = new Error('first');
		const second: Error & { cause?: unknown } = new Error('second');
		first.cause = second;
		second.cause = first;
		expect(isStreamTransportError(first)).toBe(false);
	});
});
