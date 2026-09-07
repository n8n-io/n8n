import { mock } from 'vitest-mock-extended';

import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import type { Page } from '../../page.entity';
import type { PageRepository } from '../../page.repository';
import { AppServingService } from '../app-serving.service';

const app = mock<App>({ id: 'app-1', name: 'Acme Portal', namespace: 'acme' });

const page = (id: string, route: string, parentPageId: string | null = null) =>
	mock<Page>({ id, route, parentPageId, appId: app.id });

const indexPage = page('index', '');
const clientsPage = page('clients', 'clients');
const clientPage = page('client', ':id', 'clients');

describe('AppServingService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let pageRepository: ReturnType<typeof mock<PageRepository>>;
	let service: AppServingService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		pageRepository = mock<PageRepository>();
		service = new AppServingService(appRepository, pageRepository);

		appRepository.findByNamespace.mockResolvedValue(app);
		pageRepository.findManyByAppId.mockResolvedValue([indexPage, clientsPage, clientPage]);
	});

	test('resolves nothing when no App owns the namespace', async () => {
		appRepository.findByNamespace.mockResolvedValue(null);

		await expect(service.resolvePage('unknown', [])).resolves.toBeUndefined();
		expect(pageRepository.findManyByAppId).not.toHaveBeenCalled();
	});

	test('resolves nothing when no page owns the path', async () => {
		await expect(service.resolvePage('acme', ['nowhere'])).resolves.toBeUndefined();
	});

	test('resolves the index page for an empty path', async () => {
		const context = await service.resolvePage('acme', []);

		expect(context).toMatchObject({ appName: 'Acme Portal', title: 'Home' });
	});

	test('titles a dynamic page after the segment the URL captured', async () => {
		const context = await service.resolvePage('acme', ['clients', '42']);

		expect(context).toMatchObject({ title: '42' });
	});

	test('builds a menu that marks the resolved page', async () => {
		const context = await service.resolvePage('acme', ['clients', '42']);

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

		const context = await service.resolvePage('acme', ['clients']);

		expect(context?.title).toBe('clients');
	});
});
