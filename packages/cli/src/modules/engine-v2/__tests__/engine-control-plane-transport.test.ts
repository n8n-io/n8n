import type {
	HttpRequestClient,
	HttpRequestClientOptions,
	OutboundHttp,
} from '@n8n/backend-network';
import type { EngineConfig } from '@n8n/config';
import type { ActionScope } from '@n8n/engine';
import { InvalidActionTokenError, verifyActionToken } from '@n8n/engine';
import { mock } from 'vitest-mock-extended';

import { EngineControlPlaneTransport } from '../engine-control-plane-transport';
import type { EngineTlsMaterial } from '../engine-tls-material';

const authSecret = 'a'.repeat(32);
const tls = { cert: Buffer.from('cert'), key: Buffer.from('key'), ca: Buffer.from('ca') };

describe('EngineControlPlaneTransport', () => {
	let http: HttpRequestClient;
	let clientOptions: HttpRequestClientOptions | undefined;

	let engineConfig: EngineConfig;

	/** Rebuilds the transport so each test can vary the config. */
	const newTransport = (
		overrides: Partial<EngineConfig> = {},
		tlsMaterial: Pick<EngineTlsMaterial, 'tls'> = { tls: undefined },
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

		return new EngineControlPlaneTransport(
			engineConfig,
			outboundHttp,
			tlsMaterial as EngineTlsMaterial,
		);
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
			newTransport().forScope('lifecycle-events:write');

			expect(clientOptions?.baseURL).toBe('http://127.0.0.1:3001');
		});

		it('dials the configured base URL when the control plane answers elsewhere', () => {
			newTransport({ controlPlaneBaseUrl: 'https://cp.internal:8443' }).forScope(
				'lifecycle-events:write',
			);

			expect(clientOptions?.baseURL).toBe('https://cp.internal:8443');
		});

		it('presents the client certificate and trusts only the engine CA when TLS is on', () => {
			newTransport({}, { tls }).forScope('lifecycle-events:write');

			expect(clientOptions?.connectionPool).toEqual({ agentOptions: tls });
		});

		it('uses no connection pool over plain HTTP', () => {
			newTransport().forScope('lifecycle-events:write');

			expect(clientOptions?.connectionPool).toBeUndefined();
		});

		it('opts out of SSRF protection for the n8n-controlled host', () => {
			newTransport().forScope('lifecycle-events:write');

			expect(clientOptions?.useDefaultSsrfPolicy).toBe('unsafe');
		});

		it('sets no client timeout, so the caller owns the deadline', () => {
			newTransport().forScope('lifecycle-events:write');

			expect(clientOptions?.timeout).toBeUndefined();
		});

		it('mints a fresh token per request', () => {
			newTransport().forScope('lifecycle-events:write');

			expect(typeof clientOptions?.headers).toBe('function');
		});

		it.each<ActionScope>(['lifecycle-events:write', 'credentials:read'])(
			'mints a token with the requested scope %s and no other',
			(scope) => {
				newTransport().forScope(scope);
				const token = mintedToken();
				const otherScope: ActionScope =
					scope === 'credentials:read' ? 'lifecycle-events:write' : 'credentials:read';

				expect(() => verifyActionToken(authSecret, token, scope)).not.toThrow();
				expect(() => verifyActionToken(authSecret, token, otherScope)).toThrow(
					InvalidActionTokenError,
				);
			},
		);

		it('signs the token with the configured secret', () => {
			newTransport().forScope('lifecycle-events:write');
			const token = mintedToken();

			expect(() => verifyActionToken('b'.repeat(32), token, 'lifecycle-events:write')).toThrow(
				InvalidActionTokenError,
			);
		});

		it('reads the secret at request time, after the module generated it', () => {
			newTransport({ authSecret: '' }).forScope('lifecycle-events:write');

			engineConfig.authSecret = authSecret;

			expect(() =>
				verifyActionToken(authSecret, mintedToken(), 'lifecycle-events:write'),
			).not.toThrow();
		});
	});
});
