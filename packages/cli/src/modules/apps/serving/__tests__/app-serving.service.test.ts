import { mock } from 'vitest-mock-extended';

import type { AppVersion } from '../../app-version.entity';
import type { AppVersionRepository } from '../../app-version.repository';
import type { App } from '../../app.entity';
import type { Page } from '../../page.entity';
import type { PageRepository } from '../../page.repository';
import { AppServingService } from '../app-serving.service';

/** Plain objects rather than `mock<>()`, so nested JSON columns compare by value. */
const app = {
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	projectId: 'project-1',
	activeVersionId: 'v-1',
	theme: { colors: { primary: '#123456' } },
} as App;

const unpublishedApp = { ...app, activeVersionId: null } as App;

const version = mock<AppVersion>({
	id: 'v-1',
	appId: 'app-1',
	createdAt: new Date(),
	snapshot: {
		theme: null,
		components: 'export const Card = () => <div />;',
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

const draftHeader = { id: 'h1', type: 'header', data: { text: 'Draft', level: 1 } };
const draftRows = [
	{ id: 'index', route: '', parentPageId: null, content: [], layout: null },
	{
		id: 'drafted',
		route: 'drafted',
		parentPageId: null,
		content: [draftHeader],
		layout: [{ type: 'nope' }],
	},
] as Page[];

describe('AppServingService', () => {
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let pageRepository: ReturnType<typeof mock<PageRepository>>;
	let service: AppServingService;

	beforeEach(() => {
		appVersionRepository = mock<AppVersionRepository>();
		pageRepository = mock<PageRepository>();
		service = new AppServingService(appVersionRepository, pageRepository);

		appVersionRepository.findSnapshot.mockResolvedValue(version);
		pageRepository.findManyByAppId.mockResolvedValue(draftRows);
	});

	describe('resolvePublished', () => {
		test('resolves nothing when the App has no active version', async () => {
			await expect(service.resolvePublished(unpublishedApp, [])).resolves.toBeUndefined();
			expect(appVersionRepository.findSnapshot).not.toHaveBeenCalled();
		});

		test('resolves nothing when no page of the snapshot owns the path', async () => {
			await expect(service.resolvePublished(app, ['nowhere'])).resolves.toBeUndefined();
		});

		test('resolves the index page of the active snapshot for an empty path, with the snapshot theme', async () => {
			const resolution = await service.resolvePublished(app, []);

			expect(resolution).toMatchObject({
				app: {
					id: 'app-1',
					namespace: 'acme',
					theme: null,
					components: 'export const Card = () => <div />;',
				},
				page: { id: 'index' },
				params: {},
				preview: false,
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
			expect(pageRepository.findManyByAppId).not.toHaveBeenCalled();
		});
	});

	describe('resolveDraft', () => {
		test('resolves a draft-only page from the Page rows, as a preview, with the App theme', async () => {
			const resolution = await service.resolveDraft(app, ['drafted']);

			expect(resolution).toMatchObject({
				app: { theme: { colors: { primary: '#123456' } } },
				page: { id: 'drafted', content: [draftHeader] },
				preview: true,
			});
			expect(resolution?.layout).toBeNull();
			expect(appVersionRepository.findSnapshot).not.toHaveBeenCalled();
		});

		test('resolves without an active version', async () => {
			await expect(service.resolveDraft(unpublishedApp, [])).resolves.toMatchObject({
				page: { id: 'index' },
			});
		});

		test('resolves nothing when no draft page owns the path', async () => {
			await expect(service.resolveDraft(app, ['clients'])).resolves.toBeUndefined();
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
