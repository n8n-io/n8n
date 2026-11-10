import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import { InvalidActionTokenError, verifyActionToken } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import type { EngineTlsMaterial } from '../engine-tls-material';

const authSecret = 'a'.repeat(32);
const tls = { cert: Buffer.from('cert'), key: Buffer.from('key'), ca: Buffer.from('ca') };
/** A plain object: a deep mock would wrap the buffers, which TLS cannot read. */
const tlsMaterialWith = (value: EngineTlsMaterial['tls']) =>
	({
		tls: value,
		reloadingClient: (build) => build(value),
	}) as Pick<EngineTlsMaterial, 'tls' | 'reloadingClient'> as EngineTlsMaterial;

describe('EngineControlPlaneTransport', () => {
	let http: HttpRequestClient;
	let clientOptions: HttpRequestClientOptions | undefined;

	let engineConfig: EngineConfig;

	/** Rebuilds the transport so each test can vary the config. */
	const newTransport = (
		overrides: Partial<EngineConfig> = {},
		tlsMaterial = tlsMaterialWith(undefined),
	) => {
		http = mock<HttpRequestClient>();
		const outboundHttp = mock<OutboundHttp>({
			requests: vi.fn((options?: HttpRequestClientOptions) => {
				clientOptions = options;
				return http;
			}),
		});
		engineConfig = mock<EngineConfig>({
			controlPlaneBaseUrl: '',
			authSecret,
			controlPlanePort: 3001,
			...overrides,
		});

		return new EngineControlPlaneTransport(engineConfig, outboundHttp, tlsMaterial);
	};

	/** Resolves the authorization header the way the HTTP client does per request. */
	const mintedToken = () => {
		const headers = clientOptions?.headers;
		const resolved = typeof headers === 'function' ? headers() : headers;
		const authorization = resolved?.authorization ?? '';

		expect(authorization).toMatch(/^Bearer .+/);

		return authorization.replace('Bearer ', '');
	};

	describe('forScope', () => {
		it('dials the control plane server on the loopback, not n8n main', () => {
			newTransport().forScope('credentials:read');

			expect(clientOptions?.baseURL).toBe('http://127.0.0.1:3001');
		});

		it('dials the configured base URL when the control plane answers elsewhere', () => {
			newTransport({ controlPlaneBaseUrl: 'https://cp.internal:8443' }).forScope(
				'credentials:read',
			);

			expect(clientOptions?.baseURL).toBe('https://cp.internal:8443');
		});

		it('presents the client certificate and verifies the control plane against the engine CA alone when TLS is on', () => {
			newTransport({}, tlsMaterialWith(tls)).forScope('credentials:read');

			expect(clientOptions?.connectionPool).toEqual({
				agentOptions: { ...tls, rejectUnauthorized: true },
			});
		});

		it('uses no connection pool over plain HTTP', () => {
			newTransport().forScope('credentials:read');

			expect(clientOptions?.connectionPool).toBeUndefined();
		});

		it('opts out of SSRF protection for the n8n-controlled host', () => {
			newTransport().forScope('credentials:read');

			expect(clientOptions?.useDefaultSsrfPolicy).toBe('unsafe');
		});

		it('sets no client timeout, so the caller owns the deadline', () => {
			newTransport().forScope('credentials:read');

			expect(clientOptions?.timeout).toBeUndefined();
		});

		it('mints a fresh token per request', () => {
			newTransport().forScope('credentials:read');

			expect(typeof clientOptions?.headers).toBe('function');
		});

		it('mints a token with the requested scope', () => {
			newTransport().forScope('credentials:read');

			expect(() => verifyActionToken(authSecret, mintedToken(), 'credentials:read')).not.toThrow();
		});

		it('signs the token with the configured secret', () => {
			newTransport().forScope('credentials:read');
			const token = mintedToken();

			expect(() => verifyActionToken('b'.repeat(32), token, 'credentials:read')).toThrow(
				InvalidActionTokenError,
			);
		});

		it('reads the secret at request time, after the module generated it', () => {
			newTransport({ authSecret: '' }).forScope('credentials:read');

			engineConfig.authSecret = authSecret;

			expect(() => verifyActionToken(authSecret, mintedToken(), 'credentials:read')).not.toThrow();
		});
	});
});
