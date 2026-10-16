import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type AuthenticationDriver,
	type Credential,
	type Extracted,
	type Result,
	type SurfaceId,
	type TrustedSource,
	type TrustedSourceStore,
	type Verified,
} from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { OAuth2AuthenticationService } from '../authentication.service';
import type { Oauth2BearerDriver } from '../oauth2-bearer.driver';

const ISSUER = 'https://idp.example';
const RESOURCE = 'https://n8n.example/mcp';
const SURFACE: SurfaceId = 'instance-mcp';

/** A driver as a plain object: the dispatcher only reads the contract. */
function fakeDriver(credentialKind: Credential['kind'], sourceTypes: Array<TrustedSource['type']>) {
	return {
		credentialKind,
		sourceTypes,
		selectSource: vi.fn<AuthenticationDriver['selectSource']>(),
		verify: vi.fn<AuthenticationDriver['verify']>(),
		advertise: vi.fn<AuthenticationDriver['advertise']>(),
	};
}

type SourceOverrides = Partial<Omit<TrustedSource, 'config'>> & {
	surfaces?: Partial<Record<SurfaceId, { audiences?: string[] }>>;
};

let counter = 0;

function source(overrides: SourceOverrides = {}): TrustedSource {
	const { surfaces = { [SURFACE]: {} }, ...rest } = overrides;
	counter += 1;
	return {
		id: `source-${counter}`,
		name: `Source ${counter}`,
		type: 'oauth2',
		issuer: ISSUER,
		managedBy: 'admin',
		status: 'healthy',
		lastError: null,
		lastCheckedAt: '2026-10-01T12:00:00.000Z',
		createdAt: '2026-09-30T10:00:00.000Z',
		updatedAt: '2026-10-01T12:00:00.000Z',
		config: migrateToLatest(
			trustedSourceConfigSchemaFor('admin').parse({
				version: 1,
				authentication: { type: 'oauth2' },
				surfaces,
			}),
		),
		metadata: {
			version: 1,
			documents: [
				{
					kind: 'jwks',
					fetchedAt: '2026-10-01T12:00:00.000Z',
					url: `${ISSUER}/keys`,
					keys: [{ kid: 'k1', kty: 'EC', alg: 'ES256', use: 'sig' }],
				},
			],
		},
		...rest,
	};
}

const extracted = (overrides: Partial<Extracted> = {}): Extracted => ({
	surface: SURFACE,
	resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
	request: {
		method: 'POST',
		url: '/mcp',
		headers: { authorization: 'Bearer x' },
		ip: '203.0.113.7',
	},
	receivedAt: new Date(),
	credential: { kind: 'bearer', token: 'a.b.c' },
	...overrides,
});

function verified(input: Extracted, src: TrustedSource): Result<Verified> {
	const {
		credential,
		request: { headers: _headers, ...request },
		...rest
	} = input;
	return {
		ok: true,
		value: {
			...rest,
			request,
			credentialKind: credential.kind,
			source: src,
			claims: { sub: 'alice' },
			expiresAt: new Date(Date.now() + 3600_000),
		},
	};
}

const store = mock<TrustedSourceStore>();
let bearerFake: ReturnType<typeof fakeDriver>;
let otherFake: ReturnType<typeof fakeDriver>;
let service: OAuth2AuthenticationService;

const serviceWith = (drivers: AuthenticationDriver[]) =>
	new OAuth2AuthenticationService(store, bearerFake as unknown as Oauth2BearerDriver, drivers);

beforeEach(() => {
	vi.clearAllMocks();
	bearerFake = fakeDriver('bearer', ['oauth2']);
	otherFake = fakeDriver('fake' as Credential['kind'], ['oauth2']);
	service = serviceWith([bearerFake, otherFake]);
});

describe('OAuth2AuthenticationService', () => {
	describe('authenticate', () => {
		it('rejects a credential kind no driver handles as unusable without calling a driver', async () => {
			const input = extracted();

			const result = await serviceWith([otherFake]).authenticate(input);

			expect(result).toMatchObject({ ok: false, reason: 'source-unusable' });
			expect(otherFake.selectSource).not.toHaveBeenCalled();
			expect(otherFake.verify).not.toHaveBeenCalled();
		});

		it('rejects as unknown-issuer when no driver of the kind selects a source', async () => {
			bearerFake.selectSource.mockResolvedValue(undefined);
			const input = extracted();

			const result = await service.authenticate(input);

			expect(result).toMatchObject({ ok: false, reason: 'unknown-issuer' });
			expect(bearerFake.selectSource).toHaveBeenCalledWith(input);
			expect(bearerFake.verify).not.toHaveBeenCalled();
			expect(otherFake.selectSource).not.toHaveBeenCalled();
		});

		it('tries every driver of the kind and verifies with the one that selects a source', async () => {
			const secondBearer = fakeDriver('bearer', ['oauth2']);
			const src = source();
			const input = extracted();
			const expected = verified(input, src);
			bearerFake.selectSource.mockResolvedValue(undefined);
			secondBearer.selectSource.mockResolvedValue(src);
			secondBearer.verify.mockResolvedValue(expected);

			const result = await serviceWith([bearerFake, secondBearer]).authenticate(input);

			expect(result).toBe(expected);
			expect(bearerFake.selectSource).toHaveBeenCalledWith(input);
			expect(secondBearer.verify).toHaveBeenCalledWith(input, src);
			expect(bearerFake.verify).not.toHaveBeenCalled();
		});

		it.each<{ name: string; src: () => TrustedSource; input: () => Extracted }>([
			{
				name: 'the source is not accepted on the surface',
				src: () => source({ surfaces: { 'public-api': {} } }),
				input: () => extracted(),
			},
			{
				name: 'the resource narrows the accepted sources to others',
				src: () => source(),
				input: () => extracted({ acceptedSourceIds: ['other'] }),
			},
		])('rejects as source-not-accepted when $name', async ({ src, input }) => {
			const selected = src();
			bearerFake.selectSource.mockResolvedValue(selected);

			const result = await service.authenticate(input());

			expect(result).toMatchObject({ ok: false, reason: 'source-not-accepted' });
			expect(bearerFake.verify).not.toHaveBeenCalled();
		});

		it.each<{ name: string; src: () => TrustedSource; sourceTypes?: Array<TrustedSource['type']> }>(
			[
				{ name: 'the source is in error', src: () => source({ status: 'error', lastError: 'x' }) },
				{ name: 'the source has no JWKS document', src: () => source({ metadata: null }) },
				{
					name: 'the source type is outside the driver types',
					src: () => source(),
					sourceTypes: [],
				},
			],
		)('rejects as source-unusable when $name', async ({ src, sourceTypes }) => {
			const selected = src();
			const driver = fakeDriver('bearer', sourceTypes ?? ['oauth2']);
			driver.selectSource.mockResolvedValue(selected);

			const result = await serviceWith([driver]).authenticate(extracted());

			expect(result).toMatchObject({ ok: false, reason: 'source-unusable' });
			expect(driver.verify).not.toHaveBeenCalled();
		});

		it('returns what the driver verified', async () => {
			const src = source();
			const input = extracted();
			const expected = verified(input, src);
			bearerFake.selectSource.mockResolvedValue(src);
			bearerFake.verify.mockResolvedValue(expected);

			const result = await service.authenticate(input);

			expect(result).toBe(expected);
			expect(bearerFake.verify).toHaveBeenCalledWith(input, src);
		});

		it('dispatches by credential kind', async () => {
			const src = source();
			const input = extracted({
				credential: { kind: 'fake', token: 'x' } as unknown as Credential,
			});
			const expected = verified(input, src);
			otherFake.selectSource.mockResolvedValue(src);
			otherFake.verify.mockResolvedValue(expected);

			const result = await service.authenticate(input);

			expect(result).toBe(expected);
			expect(bearerFake.selectSource).not.toHaveBeenCalled();
			expect(bearerFake.verify).not.toHaveBeenCalled();
		});
	});

	describe('advertise', () => {
		it('collects deduplicated issuers and every challenge over the accepted surface sources', async () => {
			const [first, second, third] = [source(), source(), source()];
			store.listBySurface.mockResolvedValue([first, second, third]);
			bearerFake.advertise.mockReturnValue({
				authorizationServers: ['https://a.example', 'https://b.example'],
				challenge:
					'Bearer resource_metadata="https://n8n.example/.well-known/oauth-protected-resource/mcp"',
			});
			otherFake.advertise.mockReturnValue({
				authorizationServers: ['https://b.example', 'https://c.example'],
				challenge: 'Fake realm="n8n"',
			});
			const resource = {
				surface: SURFACE,
				resource: { url: RESOURCE, acceptedAudiences: [RESOURCE] },
				acceptedSourceIds: [first.id, second.id],
			};

			const advertised = await service.advertise(resource);

			expect(store.listBySurface).toHaveBeenCalledWith(SURFACE);
			expect(bearerFake.advertise).toHaveBeenCalledWith(resource, [first, second]);
			expect(otherFake.advertise).toHaveBeenCalledWith(resource, [first, second]);
			expect(advertised).toEqual({
				authorizationServers: ['https://a.example', 'https://b.example', 'https://c.example'],
				challenges: [
					'Bearer resource_metadata="https://n8n.example/.well-known/oauth-protected-resource/mcp"',
					'Fake realm="n8n"',
				],
			});
		});
	});
});
