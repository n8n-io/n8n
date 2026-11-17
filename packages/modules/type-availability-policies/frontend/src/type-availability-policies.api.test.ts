import type { IRestApiContext } from '@n8n/rest-api-client';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
	fetchCredentialTypeSummaries,
	fetchInstanceAccess,
	fetchInstancePolicy,
	saveInstancePolicy,
} from './type-availability-policies.api';

const { makeRestApiRequest, get } = vi.hoisted(() => ({
	makeRestApiRequest: vi.fn(),
	get: vi.fn(),
}));

vi.mock('@n8n/rest-api-client', async (importOriginal) => ({
	...(await importOriginal<object>()),
	makeRestApiRequest,
	get,
}));

const context: IRestApiContext = { baseUrl: 'http://localhost', pushRef: 'test' };

describe('instance policy requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it.each([
		['node', '/node-type-policies/instance'],
		['credential', '/credential-type-policies/instance'],
	] as const)('reads the %s policy from %s', async (kind, endpoint) => {
		await fetchInstancePolicy(context, kind);

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'GET', endpoint);
	});

	it.each([
		['node', '/node-type-policies/instance'],
		['credential', '/credential-type-policies/instance'],
	] as const)('saves the %s policy to %s with its version', async (kind, endpoint) => {
		await saveInstancePolicy(context, kind, { rules: [], defaultAction: 'deny', version: 3 });

		expect(makeRestApiRequest).toHaveBeenCalledWith(context, 'PUT', endpoint, {
			rules: [],
			defaultAction: 'deny',
			version: 3,
		});
	});
});

describe('instance access requests', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('reads the credential access list from the access route', async () => {
		await fetchInstanceAccess(context, 'credential');

		expect(makeRestApiRequest).toHaveBeenCalledWith(
			context,
			'GET',
			'/credential-type-policies/instance/access',
		);
	});

	it('reads the name, icon and parents of each credential type and skips malformed entries', async () => {
		get.mockResolvedValue([
			{
				name: 'bitlyApi',
				displayName: 'Bitly API',
				iconUrl: { light: 'icons/light.svg', dark: 'icons/dark.svg' },
				iconColor: 'blue',
				extends: ['oAuth2Api'],
				properties: [],
			},
			{ name: 'broken' },
			'notARecord',
		]);

		const types = await fetchCredentialTypeSummaries('/');

		expect(get).toHaveBeenCalledWith('/', 'types/credentials.json');
		expect([...types]).toEqual([
			[
				'bitlyApi',
				{
					displayName: 'Bitly API',
					icon: undefined,
					iconUrl: { light: 'icons/light.svg', dark: 'icons/dark.svg' },
					iconColor: 'blue',
					extends: ['oAuth2Api'],
				},
			],
		]);
	});

	it('returns no credential types when the file is not a list', async () => {
		get.mockResolvedValue({});

		expect((await fetchCredentialTypeSummaries('/')).size).toBe(0);
	});
});
