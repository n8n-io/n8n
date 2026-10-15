import type { TrustedSource, TrustedSourceStore } from '@n8n/inbound-auth';
import { mock } from 'vitest-mock-extended';

import { TrustedSourceDbDirectory } from '../trusted-source-directory.service';

/** A source with manual endpoints on file; the client alone decides `redirect-login`. */
const source = (id: string, client?: { kind: 'registered'; clientId: string }): TrustedSource =>
	({
		id,
		name: `Source ${id}`,
		config: {
			authentication: {
				type: 'oauth2',
				discovery: {
					mode: 'manual',
					jwksUri: 'https://idp.example/keys',
					authorizationEndpoint: 'https://idp.example/authorize',
					tokenEndpoint: 'https://idp.example/token',
				},
				client,
			},
		},
		metadata: null,
	}) as unknown as TrustedSource;

describe('TrustedSourceDbDirectory', () => {
	const store = mock<TrustedSourceStore>();
	const directory = new TrustedSourceDbDirectory(store);

	beforeEach(() => {
		store.listBySurface.mockResolvedValue([
			source('with-client', { kind: 'registered', clientId: 'n8n' }),
			source('without-client'),
		]);
	});

	it('lists id and name of every source on the surface when no capability is asked for', async () => {
		const options = await directory.listTrustedSources({ surface: 'trigger' });

		expect(store.listBySurface).toHaveBeenCalledWith('trigger');
		expect(options).toEqual([
			{ id: 'with-client', name: 'Source with-client' },
			{ id: 'without-client', name: 'Source without-client' },
		]);
	});

	it('keeps only the sources with the asked capability', async () => {
		const options = await directory.listTrustedSources({
			surface: 'trigger',
			capability: 'redirect-login',
		});

		expect(options).toEqual([{ id: 'with-client', name: 'Source with-client' }]);
	});
});
