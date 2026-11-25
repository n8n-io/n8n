import type { LicenseState } from '@n8n/backend-common';
import type { UrlService } from '@n8n/backend-services';
import type { GlobalConfig } from '@n8n/config';
import type { ProtectedResource, ResourceUser } from '@n8n/inbound-auth';
import { ALL_API_KEY_SCOPES, getApiKeyScopesForRole, type Scope } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { PublicApiProtectedResource } from '../public-api-protected-resource';

const urlService = mock<UrlService>();
const licenseState = mock<LicenseState>();
const globalConfig = { publicApi: { disabled: false, path: 'api' } } as unknown as GlobalConfig;

let resource: PublicApiProtectedResource;

const principal = (roleSlug: string, scopeSlugs: string[]): ResourceUser => ({
	...mock<ResourceUser>(),
	role: {
		...mock<ResourceUser['role']>(),
		slug: roleSlug,
		scopes: scopeSlugs.map((slug) => ({ ...mock(), slug: slug as Scope })),
	},
});

beforeEach(() => {
	vi.clearAllMocks();
	globalConfig.publicApi.disabled = false;
	globalConfig.publicApi.path = 'api';
	urlService.getInstanceBaseUrl.mockReturnValue('https://n8n.test/');
	licenseState.isAPIDisabled.mockReturnValue(false);
	resource = new PublicApiProtectedResource(urlService, globalConfig, licenseState);
});

describe('PublicApiProtectedResource', () => {
	it('is served on the public-api surface, advertises the API key scopes, and is neither default nor first-party', () => {
		const contract: ProtectedResource = resource;

		expect(contract.surface).toBe('public-api');
		expect(contract.scopes).toEqual([...ALL_API_KEY_SCOPES]);
		expect(contract.isDefault).toBeFalsy();
		expect(contract.isFirstParty).toBeFalsy();
	});

	it('names itself on the consent screen', () => {
		expect(resource.displayName).toBe('n8n public API');
		expect(resource.uiHints).toEqual({ icon: 'key-round', consentType: 'api' });
	});

	it('lets a member grant the API key scopes of their role', async () => {
		const member = principal('global:member', [
			'workflow:list',
			'workflow:create',
			'workflow:read',
		]);

		await expect(resource.getGrantableScopes(member)).resolves.toEqual(
			getApiKeyScopesForRole(member),
		);
	});

	it('lets a chat user grant nothing', async () => {
		await expect(resource.getGrantableScopes(principal('global:chatUser', []))).resolves.toEqual(
			[],
		);
	});

	it('derives the resource URL from the instance base URL and the public API path', () => {
		expect(resource.getResourceUrl()).toBe('https://n8n.test/api/v1');
	});

	it('follows a custom public API path segment', () => {
		globalConfig.publicApi.path = 'my-api';

		expect(resource.getResourceUrl()).toBe('https://n8n.test/my-api/v1');
	});

	it('accepts only its own resource URL as audience', () => {
		expect(resource.getAudiences()).toEqual(['https://n8n.test/api/v1']);
	});

	it('is available and authorizes any user while the public API is enabled', async () => {
		await expect(resource.isAvailable()).resolves.toBe(true);
		await expect(resource.authorize()).resolves.toBe(true);
	});

	it.each([
		['the public API is disabled by config', () => (globalConfig.publicApi.disabled = true)],
		['the license disables the API', () => licenseState.isAPIDisabled.mockReturnValue(true)],
	])('is unavailable and authorizes nobody when %s', async (_name, arrange) => {
		arrange();

		await expect(resource.isAvailable()).resolves.toBe(false);
		await expect(resource.authorize()).resolves.toBe(false);
	});
});
