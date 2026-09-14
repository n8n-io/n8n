import { APP_LAYOUT_PRESETS } from '@n8n/api-types';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { UrlService } from '@/services/url.service';

import type { App } from '../app.entity';
import type { AppRepository } from '../app.repository';
import type { AppVersion } from '../app-version.entity';
import type { AppVersionRepository } from '../app-version.repository';
import { AppsService } from '../apps.service';
import { AppComponentsInvalidError } from '../errors/app-components-invalid.error';
import { AppContentInvalidError } from '../errors/app-content-invalid.error';
import type { Page } from '../page.entity';
import type { PageRepository } from '../page.repository';
import type { AppCodeRuntime } from '../runtime/app-code-runtime';
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
	({
		appId: 'app-1',
		parentPageId: null,
		title: null,
		content: null,
		layout: null,
		...overrides,
	}) as Page;

describe('AppsService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let pageRepository: ReturnType<typeof mock<PageRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let codeRuntime: ReturnType<typeof mock<AppCodeRuntime>>;
	let service: AppsService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		pageRepository = mock<PageRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		codeRuntime = mock<AppCodeRuntime>();
		codeRuntime.compile.mockResolvedValue('');
		service = new AppsService(
			appRepository,
			pageRepository,
			appVersionRepository,
			mock<UrlService>({ getInstanceBaseUrl: () => 'http://localhost:5678' }),
			codeRuntime,
		);
		appRepository.findOneBy.mockResolvedValue(app);
		appVersionRepository.createFromSnapshot.mockResolvedValue(mock<AppVersion>({ id: 'v-1' }));
	});

	describe('createApp', () => {
		const dto = { name: 'Acme', namespace: 'acme' };

		beforeEach(() => {
			appRepository.createApp.mockResolvedValue(app);
		});

		test('creates the app alone without a preset', async () => {
			await service.createApp('project-1', dto);

			expect(appRepository.createApp).toHaveBeenCalledWith('project-1', 'Acme', 'acme', null);
			expect(pageRepository.createPage).not.toHaveBeenCalled();
		});

		test("applies a preset's theme to the app and its layout to a new index page", async () => {
			const preset = APP_LAYOUT_PRESETS.find((p) => p.id === 'top-nav');

			await service.createApp('project-1', { ...dto, layoutPreset: 'top-nav' });

			expect(appRepository.createApp).toHaveBeenCalledWith(
				'project-1',
				'Acme',
				'acme',
				preset?.theme,
			);
			expect(pageRepository.createPage).toHaveBeenCalledWith(
				'app-1',
				null,
				'',
				null,
				preset?.blocks,
			);
		});

		test('rejects an unknown preset id before creating anything', async () => {
			await expect(
				service.createApp('project-1', { ...dto, layoutPreset: 'nope' }),
			).rejects.toBeInstanceOf(BadRequestError);

			expect(appRepository.createApp).not.toHaveBeenCalled();
		});
	});

	describe('createPage', () => {
		beforeEach(() => {
			pageRepository.hasSiblingWithRoute.mockResolvedValue(false);
		});

		test('stores the given title', async () => {
			await service.createPage('app-1', { route: 'clients', title: 'Clients' });

			expect(pageRepository.createPage).toHaveBeenCalledWith(
				'app-1',
				null,
				'clients',
				null,
				null,
				'Clients',
			);
		});

		test('stores null when no title is given', async () => {
			await service.createPage('app-1', { route: 'clients' });

			expect(pageRepository.createPage).toHaveBeenCalledWith(
				'app-1',
				null,
				'clients',
				null,
				null,
				null,
			);
		});
	});

	describe('publish', () => {
		test('freezes each page title in the snapshot', async () => {
			pageRepository.findManyByAppId.mockResolvedValue([
				page({ id: 'index', route: '', title: 'Overview' }),
				page({ id: 'clients', route: 'clients' }),
			]);

			await service.publish('app-1', 'user-1');

			const [, snapshot] = appVersionRepository.createFromSnapshot.mock.calls[0];
			expect(snapshot.pages.map((p) => p.title)).toEqual(['Overview', null]);
		});

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
			expect(codeRuntime.compile).toHaveBeenCalledWith('export const Card = () => <div />;');
		});

		test('rejects components that do not compile', async () => {
			appRepository.findOneBy.mockResolvedValue(mock<App>({ ...app, components: 'export = ;' }));
			pageRepository.findManyByAppId.mockResolvedValue([page({ id: 'index', route: '' })]);
			codeRuntime.compile.mockRejectedValue(new SyntaxError('Unexpected token (1:8)'));

			const error = await service.publish('app-1', 'user-1').catch((e: unknown) => e);

			expect(error).toBeInstanceOf(AppComponentsInvalidError);
			expect((error as Error).message).toContain('Unexpected token (1:8)');
			expect(appVersionRepository.createFromSnapshot).not.toHaveBeenCalled();
		});

		test('skips the compile check when the app has no components', async () => {
			pageRepository.findManyByAppId.mockResolvedValue([page({ id: 'index', route: '' })]);

			await service.publish('app-1', 'user-1');

			expect(codeRuntime.compile).not.toHaveBeenCalled();
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
