import { mock } from 'vitest-mock-extended';

import type { UrlService } from '@/services/url.service';

import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import type { AppVersion } from '../app-version.entity';
import type { AppVersionRepository } from '../app-version.repository';
import { AppsService } from '../apps.service';
import { AppContentInvalidError } from '../errors/app-content-invalid.error';
import type { Page } from '../page.entity';
import type { PageRepository } from '../page.repository';
import { registerStaticRenderers } from '../rendering/register-static-renderers';
import { registerBlockRenderer } from '../rendering/renderer-registry';

registerStaticRenderers();
// Stands in for the real button renderer, which needs the DI container.
registerBlockRenderer({
	type: 'button',
	render: async () => "<form action='/x' onsubmit='evil()'><input name='q' /></form>",
});

const app = mock<App>({
	id: 'app-1',
	name: 'Acme',
	namespace: 'acme',
	projectId: 'project-1',
	theme: null,
	components: null,
});

const slot = { id: 'slot', type: 'slot', data: {} };

/** A plain object rather than `mock<Page>()`, so JSON columns compare by value. */
const page = (overrides: Partial<Page>): Page =>
	({ appId: 'app-1', parentPageId: null, content: null, layout: null, ...overrides }) as Page;

describe('AppsService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let pageRepository: ReturnType<typeof mock<PageRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let service: AppsService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		pageRepository = mock<PageRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		service = new AppsService(
			appRepository,
			pageRepository,
			appVersionRepository,
			mock<UrlService>({ getInstanceBaseUrl: () => 'http://localhost:5678' }),
		);
		appRepository.findOneBy.mockResolvedValue(app);
		appVersionRepository.createFromSnapshot.mockResolvedValue(mock<AppVersion>({ id: 'v-1' }));
	});

	describe('publish', () => {
		test('stores a valid layout in the snapshot', async () => {
			pageRepository.findManyByAppId.mockResolvedValue([
				page({ id: 'index', route: '', layout: [slot] }),
			]);

			await service.publish('app-1', 'user-1');

			const [, snapshot] = appVersionRepository.createFromSnapshot.mock.calls[0];
			expect(snapshot.pages[0].layout).toEqual([slot]);
			expect(snapshot.components).toBeNull();
		});

		test("freezes the App's components in the snapshot", async () => {
			appRepository.findOneBy.mockResolvedValue(
				mock<App>({ ...app, components: 'export const Card = () => <div />;' }),
			);
			pageRepository.findManyByAppId.mockResolvedValue([page({ id: 'index', route: '' })]);

			await service.publish('app-1', 'user-1');

			const [, snapshot] = appVersionRepository.createFromSnapshot.mock.calls[0];
			expect(snapshot.components).toContain('Card');
		});

		test('rejects a layout without a slot, naming the field in the issue path', async () => {
			pageRepository.findManyByAppId.mockResolvedValue([
				page({ id: 'index', route: '', layout: [{ id: 'd', type: 'divider', data: {} }] }),
			]);

			const error = await service.publish('app-1', 'user-1').catch((e: unknown) => e);

			expect(error).toBeInstanceOf(AppContentInvalidError);
			const { meta } = error as AppContentInvalidError;
			expect(meta.pages).toEqual([{ pageId: 'index', issues: expect.any(Array) }]);
			expect((meta.pages[0].issues as Array<{ path: unknown[] }>)[0].path[0]).toBe('layout');
			expect(appVersionRepository.createFromSnapshot).not.toHaveBeenCalled();
		});
	});

	describe('previewLayout', () => {
		test('returns nulls when no page on the way up has a layout', async () => {
			const index = page({ id: 'index', route: '' });
			pageRepository.findOneBy.mockResolvedValue(index);
			pageRepository.findManyByAppId.mockResolvedValue([index]);

			await expect(service.previewLayout('app-1', 'index')).resolves.toEqual({
				ownerPageId: null,
				html: null,
				errors: {},
			});
		});

		test('renders the inherited layout around an empty slot and strips author script', async () => {
			const parent = page({
				id: 'parent',
				route: 'clients',
				layout: [
					{
						id: 'menu',
						type: 'html',
						data: {
							template:
								"<nav onclick='evil()'>Menu</nav><script>alert(1)</script><style>a{}</style>",
						},
					},
					slot,
				],
			});
			const child = page({ id: 'child', route: 'orders', parentPageId: 'parent' });
			pageRepository.findOneBy.mockResolvedValue(child);
			pageRepository.findManyByAppId.mockResolvedValue([parent, child]);

			const result = await service.previewLayout('app-1', 'child');

			expect(result.ownerPageId).toBe('parent');
			expect(result.html).toContain('data-block-id="menu"');
			expect(result.html).toContain('<nav>Menu</nav>');
			expect(result.html).toContain('<main class="app-main" data-app-slot></main>');
			expect(result.html).not.toContain('script');
			expect(result.html).not.toContain('onclick');
			expect(result.html).not.toContain('<style');
			expect(result.errors).toEqual({});
		});

		test('keeps the form controls of a layout block, inert', async () => {
			const index = page({
				id: 'index',
				route: '',
				layout: [
					{
						id: 'search',
						type: 'button',
						data: { label: 'Go', style: 'primary', target: { kind: 'workflow', workflowId: 'w' } },
					},
					slot,
				],
			});
			pageRepository.findOneBy.mockResolvedValue(index);
			pageRepository.findManyByAppId.mockResolvedValue([index]);

			const result = await service.previewLayout('app-1', 'index');

			expect(result.html).toContain('<form><input name="q" /></form>');
		});

		test('reports a layout block whose renderer throws, keyed by block id', async () => {
			const index = page({
				id: 'index',
				route: '',
				layout: [{ id: 'menu', type: 'html', data: { template: '{{#if}}' } }, slot],
			});
			pageRepository.findOneBy.mockResolvedValue(index);
			pageRepository.findManyByAppId.mockResolvedValue([index]);

			const result = await service.previewLayout('app-1', 'index');

			expect(result.html).toContain('data-block-id="menu"');
			expect(Object.keys(result.errors)).toEqual(['menu']);
			expect(result.errors.menu).not.toMatch(/\nat /);
		});

		test('treats an invalid draft layout as none', async () => {
			const index = page({ id: 'index', route: '', layout: [{ id: 'x', type: 'nope' }] });
			pageRepository.findOneBy.mockResolvedValue(index);
			pageRepository.findManyByAppId.mockResolvedValue([index]);

			await expect(service.previewLayout('app-1', 'index')).resolves.toEqual({
				ownerPageId: null,
				html: null,
				errors: {},
			});
		});
	});
});
