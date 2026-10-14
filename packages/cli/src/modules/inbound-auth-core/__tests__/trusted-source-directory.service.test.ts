import {
	migrateToLatest,
	trustedSourceConfigSchemaFor,
	type TrustedSource,
	type TrustedSourceConfigInput,
	type TrustedSourceMetadata,
	type TrustedSourceStore,
} from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceDbDirectory } from '../trusted-source-directory.service';

const ISSUER = 'https://idp.example';

const jwks: TrustedSourceMetadata['documents'][number] = {
	kind: 'jwks',
	fetchedAt: '2026-10-01T12:00:00.000Z',
	url: `${ISSUER}/keys`,
	keys: [{ kid: 'k1', kty: 'EC', alg: 'ES256', use: 'sig' }],
};

const metadata: TrustedSourceMetadata['documents'][number] = {
	kind: 'oauth2-authorization-server',
	fetchedAt: '2026-10-01T12:00:00.000Z',
	document: {
		issuer: ISSUER,
		jwks_uri: `${ISSUER}/keys`,
		authorization_endpoint: `${ISSUER}/authorize`,
		token_endpoint: `${ISSUER}/token`,
	},
};

function source(
	id: string,
	authentication: Partial<Extract<TrustedSourceConfigInput['authentication'], { type: 'oauth2' }>>,
	documents: TrustedSourceMetadata['documents'] = [jwks, metadata],
): TrustedSource {
	return {
		id,
		name: `Source ${id}`,
		type: 'oauth2',
		issuer: ISSUER,
		managedBy: 'admin',
		status: 'healthy',
		lastError: null,
		lastCheckedAt: null,
		createdAt: '2026-09-30T10:00:00.000Z',
		updatedAt: '2026-10-01T12:00:00.000Z',
		config: migrateToLatest(
			trustedSourceConfigSchemaFor('admin').parse({
				version: 1,
				authentication: { type: 'oauth2', ...authentication },
				surfaces: { trigger: {} },
			}),
		),
		metadata: { version: 1, documents },
	};
}

describe('TrustedSourceDbDirectory', () => {
	const store = mock<TrustedSourceStore>();
	const directory = new TrustedSourceDbDirectory(store);

	const withClient = source('with-client', {
		client: { kind: 'registered', clientId: 'n8n' },
	});
	const withoutClient = source('without-client', {});
	const undiscovered = source(
		'undiscovered',
		{ client: { kind: 'registered', clientId: 'n8n' } },
		[],
	);

	beforeEach(() => {
		vi.clearAllMocks();
		store.listBySurface.mockResolvedValue([withClient, withoutClient, undiscovered]);
	});

	it('lists id and name of every source on the surface when no capability is asked for', async () => {
		const options = await directory.listTrustedSources({ surface: 'trigger' });

		expect(store.listBySurface).toHaveBeenCalledWith('trigger');
		expect(options).toEqual([
			{ id: 'with-client', name: 'Source with-client' },
			{ id: 'without-client', name: 'Source without-client' },
			{ id: 'undiscovered', name: 'Source undiscovered' },
		]);
	});

	it('keeps only the sources with the asked capability', async () => {
		const options = await directory.listTrustedSources({
			surface: 'trigger',
			capability: 'redirect-login',
		});

		expect(options).toEqual([{ id: 'with-client', name: 'Source with-client' }]);
	});

	it('exposes nothing but id and name', async () => {
		const [option] = await directory.listTrustedSources({ surface: 'trigger' });

		expect(Object.keys(option)).toEqual(['id', 'name']);
	});
});
