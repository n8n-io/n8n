import { mock } from 'vitest-mock-extended';

import type { AppVersion } from '../../app-version.entity';
import type { AppVersionRepository } from '../../app-version.repository';
import type { AppVersionService } from '../../app-version.service';
import type { App } from '../../app.entity';
import type { AppRepository } from '../../app.repository';
import { AppServingService } from '../app-serving.service';

vi.mock('node:fs/promises', () => ({
	stat: vi.fn(async (filePath: string) => {
		if (filePath.endsWith('/assets/app.js')) return { isFile: () => true };
		throw new Error('ENOENT');
	}),
}));

const app = mock<App>({
	id: 'app-1',
	name: 'Acme Portal',
	namespace: 'acme',
	activeVersionId: 'v1',
});

describe('AppServingService', () => {
	let appRepository: ReturnType<typeof mock<AppRepository>>;
	let appVersionRepository: ReturnType<typeof mock<AppVersionRepository>>;
	let appVersionService: ReturnType<typeof mock<AppVersionService>>;
	let service: AppServingService;

	beforeEach(() => {
		appRepository = mock<AppRepository>();
		appVersionRepository = mock<AppVersionRepository>();
		appVersionService = mock<AppVersionService>();
		service = new AppServingService(appRepository, appVersionRepository, appVersionService);

		appRepository.findByNamespace.mockResolvedValue(app);
		appVersionRepository.findById.mockResolvedValue(mock<AppVersion>({ id: 'v1' }));
		appVersionService.distDir.mockResolvedValue('/cache/apps/v1');
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

	test('serves a file of the dist when the path names one', async () => {
		await expect(service.resolve('acme', ['assets', 'app.js'])).resolves.toBe(
			'/cache/apps/v1/assets/app.js',
		);
	});

	test('serves index.html for any other path so client-side routing works', async () => {
		await expect(service.resolve('acme', ['deep', 'route'])).resolves.toBe(
			'/cache/apps/v1/index.html',
		);
		await expect(service.resolve('acme', [])).resolves.toBe('/cache/apps/v1/index.html');
	});
});
