import { mock } from 'vitest-mock-extended';

import type { AppVersion } from '../../app-version.entity';
import type { AppVersionRepository } from '../../app-version.repository';
import type { AppVersionService } from '../../app-version.service';
import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { Page } from '../../page.entity';
import type { PageRepository } from '../../page.repository';
import { AppServingService } from '../app-serving.service';

const app = mock<App>({
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	activeVersionId: null,
});

const page = (id: string, route: string, parentPageId: string | null = null) =>
	mock<Page>({ id, route, parentPageId, appId: app.id });

const indexPage = page('index', '');
const clientsPage = page('clients', 'clients');
const clientPage = page('client', ':id', 'clients');

describe('AppServingService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let pageRepository: ReturnType<typeof mock<PageRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let service: AppServingService;

	const resolvePage = async (namespace: string, segments: string[]) => {
		const resolved = await service.resolve(namespace, segments);
		return resolved?.kind === 'page' ? resolved.context : undefined;
	};

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		pageRepository = mock<PageRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		appVersionService = mock<AppVersionService>();
		service = new AppServingService(
			appRepository,
			pageRepository,
			appVersionRepository,
			appVersionService,
		);

		appRepository.findByNamespace.mockResolvedValue(app);
		pageRepository.findManyByAppId.mockResolvedValue([indexPage, clientsPage, clientPage]);
	});

	test('resolves nothing when no App owns the namespace', async () => {
		appRepository.findByNamespace.mockResolvedValue(null);

		await expect(service.resolve('unknown', [])).resolves.toBeUndefined();
		expect(pageRepository.findManyByAppId).not.toHaveBeenCalled();
	});

	test('resolves nothing when no page owns the path', async () => {
		await expect(service.resolve('acme', ['nowhere'])).resolves.toBeUndefined();
	});

	test('serves the active version instead of pages when the App has one', async () => {
		const served = mock<App>({ ...app, activeVersionId: 'v1' });
		appRepository.findByNamespace.mockResolvedValue(served);
		appVersionRepository.findById.mockResolvedValue(mock<AppVersion>({ id: 'v1' }));
		appVersionService.distDir.mockResolvedValue('/cache/apps/v1');

		const resolved = await service.resolve('acme', ['deep', 'route']);

		expect(resolved).toEqual({
			kind: 'static',
			filePath: '/cache/apps/v1/index.html',
			app: served,
		});
		expect(pageRepository.findManyByAppId).not.toHaveBeenCalled();
	});

	test('falls back to pages when the active version row is gone', async () => {
		appRepository.findByNamespace.mockResolvedValue(mock<App>({ ...app, activeVersionId: 'gone' }));
		appVersionRepository.findById.mockResolvedValue(null);

		const context = await resolvePage('acme', []);

		expect(context).toMatchObject({ appName: 'Acme Portal', title: 'Home' });
	});

	test('resolves the index page for an empty path', async () => {
		const context = await resolvePage('acme', []);

		expect(context).toMatchObject({ appName: 'Acme Portal', title: 'Home' });
	});

	test('titles a dynamic page after the segment the URL captured', async () => {
		const context = await resolvePage('acme', ['clients', '42']);

		expect(context).toMatchObject({ title: '42' });
	});

	test('builds a menu that marks the resolved page', async () => {
		const context = await resolvePage('acme', ['clients', '42']);

		expect(context?.menu).toEqual([
			{ title: 'Home', path: '/apps/acme', current: false, children: [] },
			{
				title: 'clients',
				path: '/apps/acme/clients',
				current: false,
				children: [{ title: '42', path: '/apps/acme/clients/42', current: true, children: [] }],
			},
		]);
	});

	test('titles a page after its own route segment', async () => {
		pageRepository.findManyByAppId.mockResolvedValue([clientsPage]);

		const context = await resolvePage('acme', ['clients']);

		expect(context?.title).toBe('clients');
	});
});
