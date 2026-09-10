import { mock } from 'vitest-mock-extended';

import type { AppVersion } from '../../app-version.entity';
import type { AppVersionRepository } from '../../app-version.repository';
import type { App } from '../../app.entity';
import { AppServingService } from '../app-serving.service';

const app = mock<App>({
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	projectId: 'project-1',
	activeVersionId: 'v-1',
});

const unpublishedApp = mock<App>({ ...app, activeVersionId: null });

const version = mock<AppVersion>({
	id: 'v-1',
	appId: 'app-1',
	createdAt: new Date(),
	snapshot: {
		theme: null,
		pages: [
			{ id: 'index', route: '', parentPageId: null, content: [], layout: null },
			{
				id: 'clients',
				route: 'clients',
				parentPageId: null,
				content: null,
				layout: [{ id: 'slot', type: 'slot', data: {} }],
			},
			{ id: 'orders', route: 'orders', parentPageId: 'clients', content: null, layout: null },
		],
	},
});

describe('AppServingService', () => {
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let service: AppServingService;

	beforeEach(() => {
		appVersionRepository = mock<AppVersionRepository>();
		service = new AppServingService(appVersionRepository);

		appVersionRepository.findSnapshot.mockResolvedValue(version);
	});

	describe('resolvePublished', () => {
		test('resolves nothing when the App has no active version', async () => {
			await expect(service.resolvePublished(unpublishedApp, [])).resolves.toBeUndefined();
			expect(appVersionRepository.findSnapshot).not.toHaveBeenCalled();
		});

		test('resolves nothing when no page of the snapshot owns the path', async () => {
			await expect(service.resolvePublished(app, ['nowhere'])).resolves.toBeUndefined();
		});

		test('resolves the index page of the active snapshot for an empty path', async () => {
			const resolution = await service.resolvePublished(app, []);

			expect(resolution).toMatchObject({
				app: { id: 'app-1', namespace: 'acme', activeVersionId: 'v-1' },
				page: { id: 'index' },
				params: {},
			});
		});

		test('resolves no layout for a page without one on its way up', async () => {
			const resolution = await service.resolvePublished(app, []);

			expect(resolution?.layout).toBeNull();
		});

		test('resolves the nearest ancestor layout with its owner', async () => {
			const resolution = await service.resolvePublished(app, ['clients', 'orders']);

			expect(resolution?.layout?.ownerPageId).toBe('clients');
			expect(resolution?.layout?.blocks.map((block) => block.id)).toEqual(['slot']);
		});

		test('does not read the draft page tree', async () => {
			await service.resolvePublished(app, ['clients']);

			expect(appVersionRepository.findSnapshot).toHaveBeenCalledWith('v-1');
		});
	});

	describe('render', () => {
		test('renders the resolved page inside the shell', async () => {
			const resolution = await service.resolvePublished(app, []);
			if (!resolution) throw new Error('expected the index page to resolve');

			const html = await service.render(resolution, [], {}, 'http://localhost:5678', null);

			expect(html).toContain('Acme Portal');
			expect(html).toContain("name='n8n-app-base' content='http://localhost:5678/apps/acme'");
		});

		test('renders the resolved layout instead of the shell', async () => {
			const resolution = await service.resolvePublished(app, ['clients', 'orders']);
			if (!resolution) throw new Error('expected the orders page to resolve');

			const html = await service.render(
				resolution,
				['clients', 'orders'],
				{},
				'http://localhost:5678',
				null,
			);

			expect(html).toContain("<div class='app-layout' data-app-root>");
			expect(html).not.toContain('app-shell');
		});
	});
});
