import type { Logger } from '@n8n/backend-common';
import type { Jwk, OAuthDiscoveryClient } from '@n8n/backend-services';
import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type AuthorizationServerMetadata,
	type LocalAuthorizationServer,
	type ManagedBy,
	type TrustedSource,
} from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import {
	CONCURRENCY,
	ERROR_RETRY_MS,
	HEALTHY_REFRESH_MS,
	RUN_DEADLINE_MS,
	TrustedSourceDiscoveryService,
} from '../trusted-source-discovery.service';
import type { TrustedSourceDbStore } from '../trusted-source.store';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const issuer = 'https://idp.example';

const oidcMetadata: AuthorizationServerMetadata = {
	issuer,
	jwks_uri: `${issuer}/oidc/keys`,
	authorization_endpoint: `${issuer}/authorize`,
	token_endpoint: `${issuer}/token`,
};
const oauth2Metadata: AuthorizationServerMetadata = {
	issuer,
	jwks_uri: `${issuer}/rfc8414/keys`,
	token_endpoint: `${issuer}/token`,
};
const keys: Jwk[] = [{ kid: 'k1', kty: 'RSA', use: 'sig', alg: 'RS256', n: 'AQAB', e: 'AQAB' }];
const fetched = (document: AuthorizationServerMetadata) => ({ document, ttlSeconds: 3600 });
const fetchedJwks = { keys, skipped: [], ttlSeconds: 3600 };

const logger = mock<Logger>({ scoped: vi.fn().mockReturnThis() });
const store = mock<TrustedSourceDbStore>();
const client = mock<OAuthDiscoveryClient>();
const localServer = mock<LocalAuthorizationServer>();

let service: TrustedSourceDiscoveryService;
let counter = 0;

type SourceOverrides = Partial<Omit<TrustedSource, 'config'>> & {
	authentication?: Record<string, unknown>;
	managedBy?: ManagedBy;
};

function source(overrides: SourceOverrides = {}): TrustedSource {
	const { authentication = {}, managedBy = 'admin', ...rest } = overrides;
	counter += 1;
	return {
		id: `source-${counter}`,
		name: `Source ${counter}`,
		type: 'oauth2',
		issuer,
		managedBy,
		status: 'unchecked',
		lastError: null,
		lastCheckedAt: null,
		createdAt: '2026-09-30T10:00:00.000Z',
		updatedAt: '2026-09-30T10:00:00.000Z',
		config: migrateToLatest(
			trustedSourceConfigSchemaFor(managedBy).parse({
				version: 1,
				authentication: { type: 'oauth2', ...authentication },
				surfaces: { 'public-api': {} },
			}),
		),
		metadata: null,
		...rest,
	};
}

/** The third argument of the single `recordDiscovery` call. */
function recorded() {
	expect(store.recordDiscovery).toHaveBeenCalledTimes(1);
	return store.recordDiscovery.mock.calls[0][2];
}

/** Lets every pending microtask and immediate run; only `Date` is faked. */
const settle = async () => await new Promise<void>((resolve) => setImmediate(resolve));

function deferred<T>() {
	let resolve!: (value: T) => void;
	const promise = new Promise<T>((r) => {
		resolve = r;
	});
	return { promise, resolve };
}

beforeEach(() => {
	vi.clearAllMocks();
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(NOW);
	store.claimDiscovery.mockResolvedValue(true);
	store.recordDiscovery.mockResolvedValue(true);
	client.fetchOpenIdConfiguration.mockResolvedValue(fetched(oidcMetadata));
	client.fetchOAuth2ServerMetadata.mockResolvedValue(fetched(oauth2Metadata));
	client.fetchJwks.mockResolvedValue(fetchedJwks);
	service = new TrustedSourceDiscoveryService(logger, store, client, localServer);
});

afterEach(() => {
	vi.useRealTimers();
});

describe('TrustedSourceDiscoveryService', () => {
	describe('refresh', () => {
		const refresh = async (src: TrustedSource) => {
			store.getById.mockResolvedValue(src);
			await service.refresh(src.id);
		};

		it('stores both metadata documents and the JWKS of an auto-discovered source as healthy', async () => {
			const src = source();

			await refresh(src);

			expect(store.claimDiscovery).toHaveBeenCalledWith(src, NOW);
			expect(client.fetchOpenIdConfiguration).toHaveBeenCalledWith(issuer);
			expect(client.fetchOAuth2ServerMetadata).toHaveBeenCalledWith({ issuer });
			// The OIDC document wins, so its jwks_uri is the one fetched.
			expect(client.fetchJwks).toHaveBeenCalledWith(`${issuer}/oidc/keys`);
			expect(store.recordDiscovery).toHaveBeenCalledWith(src, NOW, {
				metadata: {
					version: 1,
					documents: [
						{ kind: 'openid-configuration', fetchedAt: NOW.toISOString(), document: oidcMetadata },
						{
							kind: 'oauth2-authorization-server',
							fetchedAt: NOW.toISOString(),
							document: oauth2Metadata,
						},
						{ kind: 'jwks', fetchedAt: NOW.toISOString(), url: `${issuer}/oidc/keys`, keys },
					],
				},
				status: 'healthy',
				lastError: null,
			});
		});

		it('is healthy with the OIDC document alone when the issuer offers no RFC 8414 document', async () => {
			client.fetchOAuth2ServerMetadata.mockResolvedValue(undefined);
			const src = source();

			await refresh(src);

			expect(recorded()).toMatchObject({ status: 'healthy', lastError: null });
			expect(recorded().metadata?.documents.map((document) => document.kind)).toEqual([
				'openid-configuration',
				'jwks',
			]);
		});

		it('records an error and keeps the previous metadata when the issuer offers no document', async () => {
			client.fetchOpenIdConfiguration.mockResolvedValue(undefined);
			client.fetchOAuth2ServerMetadata.mockResolvedValue(undefined);
			const src = source();

			await refresh(src);

			expect(client.fetchJwks).not.toHaveBeenCalled();
			const result = recorded();
			expect(result).toEqual({ status: 'error', lastError: expect.stringContaining('offers no') });
			expect('metadata' in result).toBe(false);
		});

		it('fetches a manual metadataUrl as the RFC 8414 document and skips OIDC discovery', async () => {
			const metadataUrl = `${issuer}/.well-known/custom`;
			const src = source({ authentication: { discovery: { mode: 'manual', metadataUrl } } });

			await refresh(src);

			expect(client.fetchOAuth2ServerMetadata).toHaveBeenCalledWith({ issuer, url: metadataUrl });
			expect(client.fetchOpenIdConfiguration).not.toHaveBeenCalled();
			expect(recorded()).toMatchObject({ status: 'healthy' });
			expect(recorded().metadata?.documents.map((document) => document.kind)).toEqual([
				'oauth2-authorization-server',
				'jwks',
			]);
		});

		it('records an error when the manual metadataUrl answers 404', async () => {
			client.fetchOAuth2ServerMetadata.mockResolvedValue(undefined);
			const src = source({
				authentication: { discovery: { mode: 'manual', metadataUrl: `${issuer}/meta` } },
			});

			await refresh(src);

			const result = recorded();
			expect(result).toMatchObject({ status: 'error', lastError: expect.any(String) });
			expect('metadata' in result).toBe(false);
		});

		it('records an error when no document and no manual config name a jwks_uri', async () => {
			client.fetchOpenIdConfiguration.mockResolvedValue(
				fetched({ issuer, token_endpoint: `${issuer}/token` }),
			);
			client.fetchOAuth2ServerMetadata.mockResolvedValue(undefined);
			const src = source();

			await refresh(src);

			expect(client.fetchJwks).not.toHaveBeenCalled();
			const result = recorded();
			expect(result).toEqual({
				status: 'error',
				lastError: expect.stringContaining('no jwks_uri'),
			});
			expect('metadata' in result).toBe(false);
		});

		it('records the JWKS fetch failure and keeps the previous metadata', async () => {
			client.fetchJwks.mockRejectedValue(new Error('JWKS at "x" has no usable signing keys'));
			const src = source();

			await refresh(src);

			const result = recorded();
			expect(result).toEqual({
				status: 'error',
				lastError: expect.stringContaining('no usable signing keys'),
			});
			expect('metadata' in result).toBe(false);
		});

		it('reads a local-keystore source from the local server instead of the network', async () => {
			const local = { issuer: 'http://localhost:5678', jwks_uri: 'http://localhost:5678/jwks' };
			localServer.getMetadata.mockResolvedValue(local);
			localServer.getJwks.mockResolvedValue({ keys });
			const src = source({
				managedBy: 'system',
				issuer: local.issuer,
				authentication: { keys: { kind: 'local-keystore' } },
			});

			await refresh(src);

			expect(client.fetchOpenIdConfiguration).not.toHaveBeenCalled();
			expect(client.fetchOAuth2ServerMetadata).not.toHaveBeenCalled();
			expect(client.fetchJwks).not.toHaveBeenCalled();
			expect(store.recordDiscovery).toHaveBeenCalledWith(src, NOW, {
				metadata: {
					version: 1,
					documents: [
						{ kind: 'oauth2-authorization-server', fetchedAt: NOW.toISOString(), document: local },
						{ kind: 'jwks', fetchedAt: NOW.toISOString(), url: local.jwks_uri, keys },
					],
				},
				status: 'healthy',
				lastError: null,
			});
		});

		it('records an error when the local server is not available', async () => {
			localServer.getMetadata.mockRejectedValue(new Error('No local authorization server'));
			const src = source({
				managedBy: 'system',
				authentication: { keys: { kind: 'local-keystore' } },
			});

			await refresh(src);

			const result = recorded();
			expect(result).toEqual({
				status: 'error',
				lastError: expect.stringContaining('No local authorization server'),
			});
			expect('metadata' in result).toBe(false);
		});

		it('does nothing when another run holds the lease', async () => {
			store.claimDiscovery.mockResolvedValue(false);
			const src = source();

			await refresh(src);

			expect(client.fetchOpenIdConfiguration).not.toHaveBeenCalled();
			expect(client.fetchOAuth2ServerMetadata).not.toHaveBeenCalled();
			expect(client.fetchJwks).not.toHaveBeenCalled();
			expect(store.recordDiscovery).not.toHaveBeenCalled();
		});
	});

	describe('refreshDue', () => {
		const signal = () => new AbortController().signal;
		const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
		const claimedIds = () => store.claimDiscovery.mock.calls.map(([src]) => src.id);

		it.each<[TrustedSource['status'], string | null, boolean]>([
			['unchecked', null, true],
			['unchecked', ago(1000), true],
			['error', null, true],
			['error', ago(ERROR_RETRY_MS + 1000), true],
			['error', ago(ERROR_RETRY_MS - 1000), false],
			['healthy', null, true],
			['healthy', ago(HEALTHY_REFRESH_MS + 1000), true],
			['healthy', ago(HEALTHY_REFRESH_MS - 1000), false],
		])('a %s source last checked at %s is due: %s', async (status, lastCheckedAt, due) => {
			const src = source({ status, lastCheckedAt });
			store.listAll.mockResolvedValue([src]);

			await service.refreshDue(signal());

			expect(claimedIds()).toEqual(due ? [src.id] : []);
		});

		it('takes unchecked sources before healthy ones', async () => {
			const healthyA = source({ status: 'healthy', lastCheckedAt: ago(HEALTHY_REFRESH_MS + 1000) });
			const uncheckedA = source();
			const healthyB = source({ status: 'healthy', lastCheckedAt: ago(HEALTHY_REFRESH_MS + 1000) });
			const uncheckedB = source();
			store.listAll.mockResolvedValue([healthyA, uncheckedA, healthyB, uncheckedB]);

			await service.refreshDue(signal());

			expect(claimedIds().slice(0, 2).sort()).toEqual([uncheckedA.id, uncheckedB.id].sort());
			expect(claimedIds().slice(2).sort()).toEqual([healthyA.id, healthyB.id].sort());
		});

		it('refreshes at most CONCURRENCY sources at once', async () => {
			const sources = Array.from({ length: 8 }, () => source());
			store.listAll.mockResolvedValue(sources);
			const pending = sources.map(() => deferred<ReturnType<typeof fetched>>());
			let call = 0;
			client.fetchOpenIdConfiguration.mockImplementation(async () => await pending[call++].promise);

			const run = service.refreshDue(signal());
			await settle();

			expect(store.claimDiscovery).toHaveBeenCalledTimes(CONCURRENCY);
			expect(client.fetchOpenIdConfiguration).toHaveBeenCalledTimes(CONCURRENCY);

			pending[0].resolve(fetched(oidcMetadata));
			await settle();

			expect(store.claimDiscovery).toHaveBeenCalledTimes(CONCURRENCY + 1);

			for (const entry of pending) entry.resolve(fetched(oidcMetadata));
			await run;

			expect(store.recordDiscovery).toHaveBeenCalledTimes(8);
		});

		it('takes no further source once the run deadline has passed', async () => {
			const first = source();
			const second = source();
			store.listAll.mockResolvedValue([first, second]);
			// The first source's claim is slow enough to use up the whole run budget.
			store.claimDiscovery.mockImplementationOnce(async () => {
				vi.setSystemTime(NOW.getTime() + RUN_DEADLINE_MS + 1);
				return true;
			});

			await service.refreshDue(signal());

			expect(claimedIds()).toEqual([first.id]);
		});

		it('claims nothing when the signal is already aborted', async () => {
			store.listAll.mockResolvedValue([source(), source()]);
			const controller = new AbortController();
			controller.abort();

			await service.refreshDue(controller.signal);

			expect(store.claimDiscovery).not.toHaveBeenCalled();
		});
	});
});
