import type { Logger, ModuleRegistry } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { App } from '@/modules/apps/app.entity';
import type { AppRepository } from '@/modules/apps/app.repository';
import { userHasScopes } from '@/permissions.ee/check-access';
import type { UrlService } from '@/services/url.service';

import { AppResourceResolver } from '../app-resource.resolver';

vi.mock('@/permissions.ee/check-access', () => ({ userHasScopes: vi.fn() }));

const app = {
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	projectId: 'proj-1',
	authMode: 'n8n',
} as App;

describe('AppResourceResolver', () => {
	const appRepository = mock<AppRepository>();
	const moduleRegistry = mock<ModuleRegistry>();
	const urlService = mock<UrlService>();
	const resolver = new AppResourceResolver(
		appRepository,
		urlService,
		moduleRegistry,
		mock<Logger>(),
	);

	beforeEach(() => {
		vi.clearAllMocks();
		urlService.getWebhookBaseUrl.mockReturnValue('https://n8n.example/');
		moduleRegistry.isActive.mockReturnValue(true);
		appRepository.findByNamespace.mockResolvedValue(app);
	});

	it('resolves the app root as a first-party resource whose only redirect URI is itself', async () => {
		const resource = await resolver.resolveByPath('/apps/acme');

		expect(appRepository.findByNamespace).toHaveBeenCalledWith('acme');
		expect(resource).toMatchObject({
			id: 'app:app-1',
			isFirstParty: true,
			displayName: 'Acme Portal',
			scopes: [],
		});
		expect(resource?.getResourceUrl()).toBe('https://n8n.example/apps/acme/');
		expect(resource?.getAudiences()).toEqual(['https://n8n.example/apps/acme/']);
		await expect(resource?.getAllowedRedirectUris?.()).resolves.toEqual([
			'https://n8n.example/apps/acme/',
		]);
	});

	it('resolves the same resource by URL under the webhook base URL', async () => {
		const resource = await resolver.resolveByUrl('https://n8n.example/apps/acme');

		expect(resource?.getResourceUrl()).toBe('https://n8n.example/apps/acme/');
	});

	it('ignores a URL on another origin', async () => {
		await expect(resolver.resolveByUrl('https://other.example/apps/acme')).resolves.toBeUndefined();
		expect(appRepository.findByNamespace).not.toHaveBeenCalled();
	});

	it.each(['/webhook/acme', '/apps', '/apps/', '/apps/acme/orders', '/apps/acme/api'])(
		'ignores %s',
		async (pathname) => {
			await expect(resolver.resolveByPath(pathname)).resolves.toBeUndefined();
			expect(appRepository.findByNamespace).not.toHaveBeenCalled();
		},
	);

	it('ignores a public app', async () => {
		appRepository.findByNamespace.mockResolvedValue({ ...app, authMode: 'public' } as App);

		await expect(resolver.resolveByPath('/apps/acme')).resolves.toBeUndefined();
	});

	it('ignores a namespace no app owns', async () => {
		appRepository.findByNamespace.mockResolvedValue(null);

		await expect(resolver.resolveByPath('/apps/acme')).resolves.toBeUndefined();
	});

	it('resolves nothing while the apps module is inactive', async () => {
		moduleRegistry.isActive.mockReturnValue(false);

		await expect(resolver.resolveByPath('/apps/acme')).resolves.toBeUndefined();
		expect(appRepository.findByNamespace).not.toHaveBeenCalled();
	});

	it('authorizes a user with app:read on the app project', async () => {
		const user = mock<User>({ id: 'user-1' });
		vi.mocked(userHasScopes).mockResolvedValueOnce(true).mockResolvedValueOnce(false);
		const resource = await resolver.resolveByPath('/apps/acme');

		await expect(resource?.authorize(user)).resolves.toBe(true);
		await expect(resource?.authorize(user)).resolves.toBe(false);
		expect(userHasScopes).toHaveBeenCalledWith(user, ['app:read'], false, {
			projectId: 'proj-1',
		});
	});
});
