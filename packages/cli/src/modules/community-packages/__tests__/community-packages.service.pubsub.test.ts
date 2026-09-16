import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NPM_PACKAGE_STATUS_GOOD } from '@/constants';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import { InstalledNodesRepository } from '../installed-nodes.repository';
import type { InstalledPackages } from '../installed-packages.entity';
import { InstalledPackagesRepository } from '../installed-packages.repository';
import { checkIfVersionExistsOrThrow, verifyIntegrity } from '../npm-utils';

jest.mock('node:fs/promises');
jest.mock('node:child_process');
jest.mock('axios');
jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
}));
jest.mock('../npm-utils', () => ({
	checkIfVersionExistsOrThrow: jest.fn().mockResolvedValue(true),
	verifyIntegrity: jest.fn().mockResolvedValue(undefined),
}));

type ExecFileCallback = NonNullable<Parameters<typeof execFile>[3]>;

describe('CommunityPackagesService pubsub handlers', () => {
	const PACKAGE_NAME = 'n8n-nodes-test';
	const PACKAGE_VERSION = '1.0.0';
	const REGISTRY = 'https://registry.npmjs.org';
	const TARBALL_NAME = `${PACKAGE_NAME}-1.0.0.tgz`;

	const nodesDownloadDir = path.join('tmp', 'n8n-jest-pubsub-downloads');
	const instanceSettings = mock<InstanceSettings>({ nodesDownloadDir });
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();
	const license = mock<License>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	mockInstance(InstalledNodesRepository);
	const installedPackageRepository = mockInstance(InstalledPackagesRepository);

	const createService = (configOverrides: Partial<CommunityPackagesConfig> = {}) => {
		const config = mock<CommunityPackagesConfig>({
			enabled: true,
			preventLoading: false,
			reinstallMissing: false,
			registry: REGISTRY,
			unverifiedEnabled: true,
			...configOverrides,
		});

		return new CommunityPackagesService(
			instanceSettings,
			logger,
			installedPackageRepository,
			loadNodesAndCredentials,
			publisher,
			license,
			config,
		);
	};

	const execMock = ((...args: Parameters<typeof execFile>) => {
		const command = args[0];
		const cmdArgs = args[1];
		const callback = args[args.length - 1] as ExecFileCallback;

		if (command === 'npm' && cmdArgs?.[0] === 'pack') {
			callback(null, { stdout: TARBALL_NAME } as never, '');
		} else {
			callback(null, 'Done', '');
		}
	}) as typeof execFile;

	beforeEach(() => {
		jest.resetAllMocks();

		mocked(execFile).mockImplementation(execMock);
		mocked(checkIfVersionExistsOrThrow).mockResolvedValue(true);
		mocked(verifyIntegrity).mockResolvedValue(undefined);

		mocked(readFile).mockResolvedValue(
			JSON.stringify({ name: PACKAGE_NAME, version: PACKAGE_VERSION, dependencies: {} }),
		);
		mocked(writeFile).mockResolvedValue(undefined);
		mocked(rm).mockResolvedValue(undefined);

		mocked(axios.post).mockResolvedValue({ data: { status: NPM_PACKAGE_STATUS_GOOD } });

		license.isCustomNpmRegistryEnabled.mockReturnValue(true);
		loadNodesAndCredentials.loadPackage.mockResolvedValue(
			mock<PackageDirectoryLoader>({
				loadedNodes: [{ name: 'a-node-from-the-loader', version: 1 }],
			}),
		);
		loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

		installedPackageRepository.findOne.mockResolvedValue(null);
	});

	const arrangeInstalledPackage = (
		overrides: Partial<Pick<InstalledPackages, 'packageName' | 'installedVersion'>> = {},
	) => {
		installedPackageRepository.findOne.mockResolvedValue(
			mock<InstalledPackages>({
				packageName: PACKAGE_NAME,
				installedVersion: PACKAGE_VERSION,
				...overrides,
			}),
		);
	};

	const expectPack = (packageName: string, packageVersion: string) => {
		expect(execFile).toHaveBeenCalledWith(
			'npm',
			['pack', `${packageName}@${packageVersion}`, `--registry=${REGISTRY}`, '--quiet'],
			{ cwd: nodesDownloadDir },
			expect.any(Function),
		);
	};

	const expectNoDownloadOrLoad = () => {
		expect(execFile).not.toHaveBeenCalled();
		expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
	};

	const expectDownloadAndLoad = (packageName: string) => {
		expectPack(packageName, PACKAGE_VERSION);
		expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(packageName);
		expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
	};

	test.each([PACKAGE_NAME, `@scope/${PACKAGE_NAME}`])(
		'should download and load "%s" for a valid install event',
		async (packageName) => {
			const service = createService();
			arrangeInstalledPackage({ packageName });

			await service.handleInstallEvent({ packageName, packageVersion: PACKAGE_VERSION });

			expectDownloadAndLoad(packageName);
		},
	);

	test('should install a checksum-verified package when unverified packages are disabled', async () => {
		const service = createService({ unverifiedEnabled: false });
		arrangeInstalledPackage();

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: PACKAGE_VERSION,
			checksum: 'sha512-abc123',
		});

		expect(verifyIntegrity).toHaveBeenCalledWith(
			PACKAGE_NAME,
			PACKAGE_VERSION,
			REGISTRY,
			'sha512-abc123',
		);
		expectDownloadAndLoad(PACKAGE_NAME);
	});

	test('should not install a package whose checksum does not match', async () => {
		const service = createService();
		arrangeInstalledPackage();
		mocked(verifyIntegrity).mockRejectedValue(new Error('Checksum mismatch'));

		await expect(
			service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
				checksum: 'sha512-abc123',
			}),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test.each([
		['leading segment is not a valid scope', `../${PACKAGE_NAME}`],
		['required prefix is missing', 'some-other-package'],
		['name is not a single word', 'n8n-nodes-With Space'],
	])('should not install a package when the %s', async (_label, packageName) => {
		const service = createService();
		// Arranged so the stored-record guard passes and only the name guard can refuse.
		arrangeInstalledPackage({ packageName });

		await expect(
			service.handleInstallEvent({ packageName, packageVersion: PACKAGE_VERSION }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a package whose stored version specifier is invalid', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '1.a.b' });

		await expect(
			service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: '1.a.b' }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install an unverified package when unverified packages are disabled', async () => {
		const service = createService({ unverifiedEnabled: false });
		arrangeInstalledPackage();

		await expect(
			service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: PACKAGE_VERSION }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a package rejected by the package status check', async () => {
		const service = createService();
		arrangeInstalledPackage();
		mocked(axios.post).mockResolvedValue({ data: { status: 'Banned', reason: 'not allowed' } });

		await expect(
			service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: PACKAGE_VERSION }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a version that does not exist in the registry', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '9.9.9' });
		mocked(checkIfVersionExistsOrThrow).mockRejectedValue(new Error('Version not found'));

		await expect(
			service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: '9.9.9' }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a package without a stored record', async () => {
		const service = createService();

		await expect(
			service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: PACKAGE_VERSION }),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should install the version from the stored record when the payload version differs', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '2.5.0' });

		await service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: '9.9.9' });

		expect(checkIfVersionExistsOrThrow).toHaveBeenCalledWith(PACKAGE_NAME, '2.5.0', REGISTRY);
		expectPack(PACKAGE_NAME, '2.5.0');
		expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
	});

	test('should install without the payload checksum when the payload version differs', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '2.5.0' });

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: '9.9.9',
			checksum: 'sha512-abc123',
		});

		expect(verifyIntegrity).not.toHaveBeenCalled();
		expectPack(PACKAGE_NAME, '2.5.0');
		expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
	});

	const disabledInstanceCases: Array<[string, Partial<CommunityPackagesConfig>]> = [
		['community packages are disabled', { enabled: false }],
		['package loading is disabled', { preventLoading: true }],
	];

	test.each(disabledInstanceCases)(
		'should not install a package when %s',
		async (_label, configOverrides) => {
			const service = createService(configOverrides);
			arrangeInstalledPackage();

			await expect(
				service.handleInstallEvent({ packageName: PACKAGE_NAME, packageVersion: PACKAGE_VERSION }),
			).resolves.toBeUndefined();

			expectNoDownloadOrLoad();
		},
	);

	const expectNoRemoval = () => {
		expect(rm).not.toHaveBeenCalled();
		expect(loadNodesAndCredentials.unloadPackage).not.toHaveBeenCalled();
	};

	test('should delete and unload a package for a valid uninstall event', async () => {
		const service = createService();

		await service.handleUninstallEvent({ packageName: PACKAGE_NAME });

		expect(rm).toHaveBeenCalledWith(`${nodesDownloadDir}/node_modules/${PACKAGE_NAME}`, {
			recursive: true,
			force: true,
		});
		expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
		expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
	});

	test.each(disabledInstanceCases)(
		'should not uninstall a package when %s',
		async (_label, configOverrides) => {
			const service = createService(configOverrides);

			await expect(
				service.handleUninstallEvent({ packageName: PACKAGE_NAME }),
			).resolves.toBeUndefined();

			expectNoRemoval();
		},
	);

	test('should not uninstall a package while a stored record exists', async () => {
		const service = createService();
		arrangeInstalledPackage();

		await expect(
			service.handleUninstallEvent({ packageName: PACKAGE_NAME }),
		).resolves.toBeUndefined();

		expectNoRemoval();
	});

	test.each([
		`../${PACKAGE_NAME}`,
		'../../etc',
		'some-other-package',
		`@scope/${PACKAGE_NAME}/..`,
		`${PACKAGE_NAME}/../../node_modules/n8n-nodes-other`,
	])('should not uninstall the package "%s"', async (packageName) => {
		const service = createService();

		await expect(service.handleUninstallEvent({ packageName })).resolves.toBeUndefined();

		expectNoRemoval();
	});

	describe('logging', () => {
		test('should log a refused command as skipped', async () => {
			const service = createService();

			await service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			});

			expect(logger.warn).toHaveBeenCalledWith(
				'Skipped installing community package',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
			expect(logger.error).not.toHaveBeenCalled();
		});

		test('should log a command that failed while installing as an error', async () => {
			const service = createService();
			arrangeInstalledPackage();
			mocked(execFile).mockImplementation(((...args: Parameters<typeof execFile>) => {
				const callback = args[args.length - 1] as ExecFileCallback;
				callback(new Error('npm exploded'), '', '');
			}) as typeof execFile);

			await service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			});

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to install community package',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
		});

		test('should log a command that failed while uninstalling as an error', async () => {
			const service = createService();
			mocked(rm).mockRejectedValue(new Error('permission denied'));

			await service.handleUninstallEvent({ packageName: PACKAGE_NAME });

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to uninstall community package',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
		});
	});
});
