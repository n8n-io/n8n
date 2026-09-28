import { mock } from 'vitest-mock-extended';

import type { AppVersion } from '../../app-version.entity';
import type { AppVersionRepository } from '../../app-version.repository';
import type { AppVersionService } from '../../app-version.service';
import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import { AppServingService } from '../app-serving.service';

/** Files present per dist directory. */
const files = new Set<string>();
vi.mock('node:fs/promises', () => ({
	stat: vi.fn(async (filePath: string) => {
		if (files.has(filePath)) return { isFile: () => true };
		throw new Error('ENOENT');
	}),
}));

const app = mock<App>({
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	activeVersionId: 'v1',
});

const version = (id: string, distStorageKey: string | null = `dist-${id}`) =>
	mock<AppVersion>({ id, appId: 'app-1', distStorageKey });

describe('AppServingService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let service: AppServingService;

	beforeEach(() => {
		files.clear();
		files.add('/cache/apps/v1/assets/app-v1.js');
		files.add('/cache/apps/v1/favicon.ico');
		files.add('/cache/apps/v2/assets/app-v2.js');
		files.add('/cache/apps/v2/favicon.ico');

		appRepository = mock<AppRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		appVersionService = mock<AppVersionService>();
		service = new AppServingService(appRepository, appVersionRepository, appVersionService);

		appRepository.findByNamespace.mockResolvedValue(app);
		appVersionRepository.findById.mockImplementation(async (id) =>
			id === 'v1' || id === 'v2' ? version(id) : null,
		);
		appVersionRepository.listBuiltByAppId.mockResolvedValue([version('v2'), version('v1')]);
		appVersionService.distDir.mockImplementation(async (v) => `/cache/apps/${v.id}`);
	});

	test('resolves nothing when no App owns the namespace', async () => {
		appRepository.findByNamespace.mockResolvedValue(null);

		await expect(service.resolve('unknown', [])).resolves.toBeUndefined();
		expect(appVersionRepository.findById).not.toHaveBeenCalled();
	});

	test('resolves nothing when the App has no active version', async () => {
		appRepository.findByNamespace.mockResolvedValue(mock<App>({ ...app, activeVersionId: null }));

		await expect(service.resolve('acme', [])).resolves.toBeUndefined();
		expect(appVersionRepository.findById).not.toHaveBeenCalled();
	});

	test('resolves nothing when the active version row is gone', async () => {
		appVersionRepository.findById.mockResolvedValue(null);

		await expect(service.resolve('acme', [])).resolves.toBeUndefined();
	});

	test('serves a file of the active dist when the path names one', async () => {
		await expect(service.resolve('acme', ['assets', 'app-v1.js'])).resolves.toMatchObject({
			filePath: '/cache/apps/v1/assets/app-v1.js',
			version: { id: 'v1' },
		});
	});

	test('serves index.html for any other path so client-side routing works', async () => {
		await expect(service.resolve('acme', ['deep', 'route'])).resolves.toMatchObject({
			filePath: '/cache/apps/v1/index.html',
		});
		await expect(service.resolve('acme', [])).resolves.toMatchObject({
			filePath: '/cache/apps/v1/index.html',
		});
		// A route is not looked up in other builds.
		expect(appVersionRepository.listBuiltByAppId).not.toHaveBeenCalled();
	});

	test('serves the document of another built version when asked for it', async () => {
		await expect(service.resolve('acme', [], 'v2')).resolves.toMatchObject({
			filePath: '/cache/apps/v2/index.html',
			version: { id: 'v2' },
		});
	});

	test('falls back to the active version when the requested one is not built or not this app', async () => {
		appVersionRepository.findById.mockImplementation(async (id) => {
			if (id === 'v1') return version('v1');
			if (id === 'src') return version('src', null);
			if (id === 'other') return mock<AppVersion>({ id, appId: 'app-2', distStorageKey: 'd' });
			return null;
		});

		for (const requested of ['src', 'other', 'missing']) {
			await expect(service.resolve('acme', [], requested)).resolves.toMatchObject({
				filePath: '/cache/apps/v1/index.html',
				version: { id: 'v1' },
			});
		}
	});

	test('finds a hashed asset in the build it belongs to when the document was another build', async () => {
		await expect(service.resolve('acme', ['assets', 'app-v2.js'])).resolves.toMatchObject({
			filePath: '/cache/apps/v2/assets/app-v2.js',
			version: { id: 'v2' },
		});
	});

	test('prefers the active build for an unhashed asset that several builds carry', async () => {
		await expect(service.resolve('acme', ['favicon.ico'], 'v2')).resolves.toMatchObject({
			filePath: '/cache/apps/v2/favicon.ico',
		});
		await expect(service.resolve('acme', ['favicon.ico'])).resolves.toMatchObject({
			filePath: '/cache/apps/v1/favicon.ico',
		});
	});

	test('answers with the active document for an asset no build has', async () => {
		await expect(service.resolve('acme', ['assets', 'gone.js'])).resolves.toMatchObject({
			filePath: '/cache/apps/v1/index.html',
		});
	});
});
