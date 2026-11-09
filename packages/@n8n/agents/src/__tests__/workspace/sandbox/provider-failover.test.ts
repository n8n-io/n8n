import {
	SandboxAcquisitionError,
	SandboxNameConflictError,
	SandboxNotReadyError,
} from '../../../workspace/sandbox/errors';
import {
	getSandboxFailureClass,
	isSandboxProviderUnavailableError,
	SandboxProviderHealth,
} from '../../../workspace/sandbox/provider-failover';

function withFields(error: Error, fields: Record<string, unknown>): Error {
	return Object.assign(error, fields);
}

function namedError(name: string, message = name): Error {
	const error = new Error(message);
	error.name = name;
	return error;
}

describe('isSandboxProviderUnavailableError', () => {
	it.each([
		['a refused connection', withFields(new Error('connect failed'), { code: 'ECONNREFUSED' })],
		['an unknown host', withFields(new Error('getaddrinfo failed'), { code: 'ENOTFOUND' })],
		['a 502 response', withFields(new Error('Bad Gateway'), { statusCode: 502 })],
		['a 503 response', withFields(new Error('Service Unavailable'), { status: 503 })],
		['a 429 response', withFields(new Error('Too Many Requests'), { status: 429 })],
		['a request without a response', withFields(new Error('socket hang up'), { status: 0 })],
		['a timeout', namedError('TimeoutError')],
		['a Daytona connection error', namedError('DaytonaConnectionError')],
		[
			'a generic acquisition error with an unavailable cause',
			new SandboxAcquisitionError('Failed to acquire Daytona sandbox', 'DaytonaError:502', {
				cause: withFields(new Error('Bad Gateway'), { statusCode: 502 }),
			}),
		],
		[
			'a generic acquisition error without a cause',
			new SandboxAcquisitionError('Failed to acquire Daytona sandbox', 'DaytonaError:503'),
		],
		[
			'a wrapped network failure',
			new Error('fetch failed', {
				cause: withFields(new Error('connect failed'), { code: 'ECONNRESET' }),
			}),
		],
	])('returns true for %s', (_label, error) => {
		expect(isSandboxProviderUnavailableError(error)).toBe(true);
	});

	it.each([
		['a 401 response', withFields(new Error('Unauthorized'), { statusCode: 401 })],
		['a 403 response', withFields(new Error('Forbidden'), { status: 403 })],
		['a 404 response', withFields(new Error('Not Found'), { status: 404 })],
		['a user abort', namedError('AbortError', 'This operation was aborted')],
		['a configuration error', new Error('Sandbox service URL is not configured')],
		['a sandbox that is not ready', new SandboxNotReadyError('not ready')],
		['a name conflict', new SandboxNameConflictError('conflict')],
		[
			'a generic acquisition error with an auth cause',
			new SandboxAcquisitionError('Failed to acquire Daytona sandbox', 'DaytonaError:401', {
				cause: withFields(new Error('Unauthorized'), { statusCode: 401 }),
			}),
		],
		['a non-error value', 'boom'],
	])('returns false for %s', (_label, error) => {
		expect(isSandboxProviderUnavailableError(error)).toBe(false);
	});
});

describe('getSandboxFailureClass', () => {
	it('uses the failure class of an acquisition error', () => {
		expect(getSandboxFailureClass(new SandboxAcquisitionError('failed', 'DaytonaError:502'))).toBe(
			'DaytonaError:502',
		);
	});

	it('uses the network error code', () => {
		expect(
			getSandboxFailureClass(withFields(new Error('connect failed'), { code: 'ECONNREFUSED' })),
		).toBe('ECONNREFUSED');
	});

	it('uses the error name and status code', () => {
		expect(getSandboxFailureClass(withFields(new Error('Bad Gateway'), { status: 502 }))).toBe(
			'Error:502',
		);
	});
});

describe('SandboxProviderHealth', () => {
	function createHealth() {
		let now = 0;
		const health = new SandboxProviderHealth({
			failureThreshold: 2,
			baseCooldownMs: 1_000,
			maxCooldownMs: 3_000,
			now: () => now,
		});
		return {
			health,
			advance: (ms: number) => {
				now += ms;
			},
		};
	}

	it('keeps a provider available below the failure threshold', () => {
		const { health } = createHealth();

		expect(health.recordUnavailable('daytona')).toBe(false);

		expect(health.isAvailable('daytona')).toBe(true);
		expect(health.isOpen('daytona')).toBe(false);
	});

	it('opens the circuit at the failure threshold and skips the provider during the cooldown', () => {
		const { health, advance } = createHealth();

		health.recordUnavailable('n8n-sandbox');
		expect(health.recordUnavailable('n8n-sandbox')).toBe(true);

		expect(health.isOpen('n8n-sandbox')).toBe(true);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
		expect(health.isAvailable('daytona')).toBe(true);
		advance(999);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
	});

	it('lets one test request through after the cooldown', () => {
		const { health, advance } = createHealth();
		health.recordUnavailable('n8n-sandbox');
		health.recordUnavailable('n8n-sandbox');

		advance(1_000);

		expect(health.isAvailable('n8n-sandbox')).toBe(true);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
	});

	it('closes the circuit when the test request succeeds', () => {
		const { health, advance } = createHealth();
		health.recordUnavailable('n8n-sandbox');
		health.recordUnavailable('n8n-sandbox');
		advance(1_000);
		health.isAvailable('n8n-sandbox');

		health.recordAvailable('n8n-sandbox');

		expect(health.isOpen('n8n-sandbox')).toBe(false);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);
		expect(health.recordUnavailable('n8n-sandbox')).toBe(false);
	});

	it('doubles the cooldown up to the limit when test requests fail', () => {
		const { health, advance } = createHealth();
		health.recordUnavailable('n8n-sandbox');
		health.recordUnavailable('n8n-sandbox');

		advance(1_000);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);
		expect(health.recordUnavailable('n8n-sandbox')).toBe(false);
		advance(1_999);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
		advance(1);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);

		health.recordUnavailable('n8n-sandbox');
		advance(2_999);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
		advance(1);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);
	});

	it('keeps the cooldown when a failure is not from the test request', () => {
		const { health, advance } = createHealth();
		health.recordUnavailable('n8n-sandbox');
		health.recordUnavailable('n8n-sandbox');

		// Requests that started before the circuit opened fail later.
		advance(500);
		expect(health.recordUnavailable('n8n-sandbox')).toBe(false);
		expect(health.recordUnavailable('n8n-sandbox')).toBe(false);

		advance(499);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
		advance(1);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);

		health.recordUnavailable('n8n-sandbox');
		// A later failure that is not the test request does not double the cooldown again.
		health.recordUnavailable('n8n-sandbox');
		advance(1_999);
		expect(health.isAvailable('n8n-sandbox')).toBe(false);
		advance(1);
		expect(health.isAvailable('n8n-sandbox')).toBe(true);
	});
});
