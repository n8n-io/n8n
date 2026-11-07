import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import { execFile } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { NPM_PACKAGE_STATUS_GOOD } from '@/constants';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';
import { InstalledNodesRepository } from '../installed-nodes.repository';
import { InstalledPackagesRepository } from '../installed-packages.repository';
import { checkIfVersionExistsOrThrow, executeNpmCommand, verifyIntegrity } from '../npm-utils';

vi.mock('node:fs/promises');
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
vi.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: vi.fn().mockResolvedValue([]),
}));
vi.mock('../npm-utils', async () => ({
	...(await vi.importActual<typeof import('../npm-utils')>('../npm-utils')),
	executeNpmCommand: vi.fn(),
	executeNpmRequest: vi.fn().mockResolvedValue({}),
	checkIfVersionExistsOrThrow: vi.fn().mockResolvedValue(true),
	verifyIntegrity: vi.fn().mockResolvedValue(undefined),
}));

type ExecFileCallback = NonNullable<Parameters<typeof execFile>[3]>;

describe('CommunityPackagesService pubsub handlers', () => {
	const PACKAGE_NAME = 'n8n-nodes-test';
	const PACKAGE_VERSION = '1.0.0';
	const REGISTRY = 'https://registry.npmjs.org';
	const TARBALL_NAME = `${PACKAGE_NAME}-1.0.0.tgz`;

	const nodesDownloadDir = path.join('tmp', 'n8n-vi-pubsub-downloads');
	const instanceSettings = mock<InstanceSettings>({ nodesDownloadDir });
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();
	const license = mock<License>();
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	mockInstance(InstalledNodesRepository);
	const installedPackageRepository = mockInstance(InstalledPackagesRepository);

	const request = vi.fn();

	const createService = (configOverrides: Partial<CommunityPackagesConfig> = {}) => {
		const config = mock<CommunityPackagesConfig>({
			enabled: true,
			preventLoading: false,
			reinstallMissing: false,
			registry: REGISTRY,
			unverifiedEnabled: true,
			authToken: '',
			...configOverrides,
		});

		const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
		const outboundHttp = mock<OutboundHttp>({ requests });

		return new CommunityPackagesService(
			instanceSettings,
			logger,
			installedPackageRepository,
			loadNodesAndCredentials,
			publisher,
			license,
			config,
			outboundHttp,
		);
	};

	const execMock = ((...args: Parameters<typeof execFile>) => {
		const command = args[0];
		const cmdArgs = args[1];
		const callback = args[args.length - 1] as ExecFileCallback;

		if (command === 'npm' && cmdArgs?.[0] === 'pack') {
			callback(null, TARBALL_NAME, '');
		} else {
			callback(null, 'Done', '');
		}
	}) as typeof execFile;

	beforeEach(() => {
		vi.resetAllMocks();

		vi.mocked(execFile).mockImplementation(execMock);
		vi.mocked(executeNpmCommand).mockImplementation(async (args: string[]) =>
			args[0] === 'pack' ? TARBALL_NAME : 'Done',
		);
		vi.mocked(checkIfVersionExistsOrThrow).mockResolvedValue(true);
		vi.mocked(verifyIntegrity).mockResolvedValue(undefined);

		vi.mocked(readFile).mockResolvedValue(
			JSON.stringify({
				name: PACKAGE_NAME,
				version: PACKAGE_VERSION,
				dependencies: {},
			}),
		);
		vi.mocked(writeFile).mockResolvedValue(undefined);
		vi.mocked(rm).mockResolvedValue(undefined);

		request.mockResolvedValue({ status: NPM_PACKAGE_STATUS_GOOD });

		license.isCustomNpmRegistryEnabled.mockReturnValue(true);
		loadNodesAndCredentials.loadPackage.mockResolvedValue(
			mock<PackageDirectoryLoader>({
				loadedNodes: [{ name: 'a-node-from-the-loader', version: 1 }],
			}),
		);
		loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

		installedPackageRepository.findOne.mockResolvedValue(null);
		loadNodesAndCredentials.loaders = {};
	});

	const installedPackage = (
		overrides: Partial<Pick<InstalledPackages, 'packageName' | 'installedVersion'>> = {},
	) =>
		mock<InstalledPackages>({
			packageName: PACKAGE_NAME,
			installedVersion: PACKAGE_VERSION,
			...overrides,
		});

	const arrangeInstalledPackage = (
		overrides: Partial<Pick<InstalledPackages, 'packageName' | 'installedVersion'>> = {},
	) => {
		installedPackageRepository.findOne.mockResolvedValue(installedPackage(overrides));
	};

	const expectNoDownloadOrLoad = () => {
		expect(executeNpmCommand).not.toHaveBeenCalled();
		expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
	};

	const expectDownloadAndLoad = (packageName: string) => {
		expect(executeNpmCommand).toHaveBeenCalledWith(
			['pack', `${packageName}@${PACKAGE_VERSION}`, '--quiet'],
			expect.objectContaining({ cwd: nodesDownloadDir }),
		);
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

	test('should unload a package before loading it on an install event', async () => {
		const service = createService();
		arrangeInstalledPackage();
		const callOrder: string[] = [];

		loadNodesAndCredentials.unloadPackage.mockImplementation(async () => {
			callOrder.push('unloadPackage');
		});
		loadNodesAndCredentials.loadPackage.mockImplementation(async () => {
			callOrder.push('loadPackage');
			return mock<PackageDirectoryLoader>();
		});

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: PACKAGE_VERSION,
		});

		expect(callOrder).toEqual(['unloadPackage', 'loadPackage']);
	});

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
			undefined,
		);
		expectDownloadAndLoad(PACKAGE_NAME);
	});

	test('should not install a package whose checksum does not match', async () => {
		const service = createService();
		arrangeInstalledPackage();
		vi.mocked(verifyIntegrity).mockRejectedValue(new Error('Checksum mismatch'));

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
		['leading segment is not a valid scope', `../${PACKAGE_NAME}`, PACKAGE_VERSION],
		['required prefix is missing', 'some-other-package', PACKAGE_VERSION],
		['name is not a single word', 'n8n-nodes-With Space', PACKAGE_VERSION],
	])('should not install a package when the %s', async (_label, packageName, packageVersion) => {
		const service = createService();
		// Arranged so the stored-record guard passes and only the name guard can refuse.
		arrangeInstalledPackage({ packageName });

		await expect(
			service.handleInstallEvent({ packageName, packageVersion }),
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
			service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			}),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a package rejected by the package status check', async () => {
		const service = createService();
		arrangeInstalledPackage();
		request.mockResolvedValue({ status: 'Banned', reason: 'not allowed' });

		await expect(
			service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			}),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a version that does not exist in the registry', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '9.9.9' });
		vi.mocked(checkIfVersionExistsOrThrow).mockRejectedValue(new Error('Version not found'));

		await expect(
			service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: '9.9.9',
			}),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should not install a package without a stored record', async () => {
		const service = createService();

		await expect(
			service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			}),
		).resolves.toBeUndefined();

		expectNoDownloadOrLoad();
	});

	test('should install the version from the stored record when the payload version differs', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '2.5.0' });

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: '9.9.9',
		});

		expect(checkIfVersionExistsOrThrow).toHaveBeenCalledWith(
			PACKAGE_NAME,
			'2.5.0',
			REGISTRY,
			undefined,
		);
		expect(executeNpmCommand).toHaveBeenCalledWith(
			['pack', `${PACKAGE_NAME}@2.5.0`, '--quiet'],
			expect.objectContaining({ cwd: nodesDownloadDir }),
		);
		expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
	});

	test('should install the version from the stored record without the payload checksum when the payload version differs', async () => {
		const service = createService();
		arrangeInstalledPackage({ installedVersion: '2.5.0' });

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: '9.9.9',
			checksum: 'sha512-abc123',
		});

		expect(verifyIntegrity).not.toHaveBeenCalled();
		expect(executeNpmCommand).toHaveBeenCalledWith(
			['pack', `${PACKAGE_NAME}@2.5.0`, '--quiet'],
			expect.objectContaining({ cwd: nodesDownloadDir }),
		);
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

			await expect(
				service.handleInstallEvent({
					packageName: PACKAGE_NAME,
					packageVersion: PACKAGE_VERSION,
				}),
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
			maxRetries: 3,
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

	test('should skip the download when the version on disk is already loaded', async () => {
		const service = createService();
		arrangeInstalledPackage();
		loadNodesAndCredentials.loaders = { [PACKAGE_NAME]: mock<PackageDirectoryLoader>() };

		await service.handleInstallEvent({
			packageName: PACKAGE_NAME,
			packageVersion: PACKAGE_VERSION,
		});

		expectNoDownloadOrLoad();
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
			vi.mocked(executeNpmCommand).mockRejectedValue(new Error('npm exploded'));

			await service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			});

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to install community package',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
		});
	});

	describe('concurrent commands', () => {
		/** Resolves the returned callback's promise only when `release` is called. */
		const gate = () => {
			let release: () => void = () => {};
			const opened = new Promise<void>((resolve) => {
				release = resolve;
			});
			return { opened, release: () => release() };
		};

		test('should not run two install commands for the same package at once', async () => {
			const service = createService();
			arrangeInstalledPackage();

			const { opened, release } = gate();
			let inFlight = 0;
			let maxInFlight = 0;

			vi.mocked(executeNpmCommand).mockImplementation(async (args: string[]) => {
				inFlight += 1;
				maxInFlight = Math.max(maxInFlight, inFlight);
				await opened;
				inFlight -= 1;
				return args[0] === 'pack' ? TARBALL_NAME : 'Done';
			});

			const payload = { packageName: PACKAGE_NAME, packageVersion: PACKAGE_VERSION };
			const commands = Promise.all([
				service.handleInstallEvent(payload),
				service.handleInstallEvent(payload),
			]);

			release();
			await commands;

			expect(maxInFlight).toBe(1);
		});

		test('should not install a package whose record went away while the lock was held', async () => {
			const service = createService();
			installedPackageRepository.findOne
				.mockResolvedValueOnce(installedPackage())
				.mockResolvedValue(null);

			await service.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: PACKAGE_VERSION,
			});

			expectNoDownloadOrLoad();
		});

		test('should not uninstall a package whose record came back while the lock was held', async () => {
			const service = createService();
			installedPackageRepository.findOne
				.mockResolvedValueOnce(null)
				.mockResolvedValue(installedPackage());

			await service.handleUninstallEvent({ packageName: PACKAGE_NAME });

			expectNoRemoval();
		});
	});
});
