import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';
import type { InstalledPackagesRepository } from '../installed-packages.repository';
import { executeNpmCommand } from '../npm-utils';

vi.mock('../npm-utils', async () => ({
	...(await vi.importActual<typeof import('../npm-utils')>('../npm-utils')),
	executeNpmCommand: vi.fn(),
	checkIfVersionExistsOrThrow: vi.fn().mockResolvedValue(true),
	verifyIntegrity: vi.fn().mockResolvedValue(undefined),
}));
// A plain mock, without the `[util.promisify.custom]` symbol an automock would keep —
// that symbol makes the source's module-level `promisify(execFile)` call the real binary.
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));

const PACKAGE_NAME = 'n8n-nodes-test';
const TARBALL_NAME = `${PACKAGE_NAME}-2.0.0.tgz`;
const PREVIOUS_VERSION = '1.0.0';
const NEW_VERSION = '2.0.0';

/**
 * Real-filesystem coverage for the install rollback. The mock-based tests in
 * `community-packages.service.test.ts` assert the order of `rename` calls, which cannot
 * observe a package directory disappearing — the failure mode this path exists to
 * prevent. Here only npm and tar are stubbed, so the directory itself is real.
 */
describe('CommunityPackagesService (real filesystem)', () => {
	let downloadFolder: string;
	let nodeModulesDir: string;
	let packageDirectory: string;
	let service: CommunityPackagesService;

	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const installedPackageRepository = mock<InstalledPackagesRepository>();
	const publisher = mock<Publisher>();
	const license = mock<License>();
	const logger = mock<Logger>();

	/** Stands in for `npm pack` + `tar -xzf`: writes the new version into the package directory. */
	const stubNpmAndTar = ({ packFails = false } = {}) => {
		vi.mocked(executeNpmCommand).mockImplementation(async (args, options = {}) => {
			if (args[0] !== 'pack') return 'Done';
			if (packFails) throw new Error('npm pack failed');

			await writeFile(path.join(options.cwd!, TARBALL_NAME), 'tarball');
			return TARBALL_NAME;
		});

		vi.mocked(execFile).mockImplementation(((...args: unknown[]) => {
			const tarArgs = args[1] as string[];
			const target = tarArgs[tarArgs.indexOf('-C') + 1];
			const onDone = args[args.length - 1] as (error: Error | null, stdout: string) => void;

			void writeFile(
				path.join(target, 'package.json'),
				JSON.stringify({ name: PACKAGE_NAME, version: NEW_VERSION, dependencies: {} }),
			)
				.then(async () => await writeFile(path.join(target, 'marker.txt'), NEW_VERSION))
				.then(() => onDone(null, ''));
		}) as unknown as typeof execFile);
	};

	/** An already-installed package on disk, as a crashed install or a reinstall would leave it. */
	const writeExistingPackage = async () => {
		await mkdir(packageDirectory, { recursive: true });
		await writeFile(
			path.join(packageDirectory, 'package.json'),
			JSON.stringify({ name: PACKAGE_NAME, version: PREVIOUS_VERSION }),
		);
		await writeFile(path.join(packageDirectory, 'marker.txt'), PREVIOUS_VERSION);
	};

	const readMarker = async () => await readFile(path.join(packageDirectory, 'marker.txt'), 'utf-8');

	const backupDirectories = async () =>
		(await readdir(nodeModulesDir)).filter((entry) => entry.includes('.backup-'));

	/** The manifest `npm outdated` reads, so its entries must match what is on disk. */
	const readLedgerDependencies = async () => {
		const content = await readFile(path.join(downloadFolder, 'package.json'), 'utf-8');
		return JSON.parse(content).dependencies;
	};

	beforeEach(async () => {
		vi.clearAllMocks();

		downloadFolder = mkdtempSync(path.join(tmpdir(), 'n8n-community-packages-'));
		nodeModulesDir = path.join(downloadFolder, 'node_modules');
		packageDirectory = path.join(nodeModulesDir, PACKAGE_NAME);
		await mkdir(nodeModulesDir, { recursive: true });
		await writeFile(
			path.join(downloadFolder, 'package.json'),
			JSON.stringify({ name: 'installed-nodes', private: true, dependencies: {} }),
		);

		loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
		loadNodesAndCredentials.loadPackage.mockResolvedValue(
			mock<PackageDirectoryLoader>({ loadedNodes: [{ name: 'node', version: 1 }] }),
		);
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
		installedPackageRepository.find.mockResolvedValue([]);
		installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
			mock<InstalledPackages>({ installedVersion: NEW_VERSION }),
		);
		publisher.publishCommand.mockResolvedValue(undefined);

		service = new CommunityPackagesService(
			mock<InstanceSettings>({ nodesDownloadDir: downloadFolder }),
			logger,
			installedPackageRepository,
			loadNodesAndCredentials,
			publisher,
			license,
			mock<CommunityPackagesConfig>({
				// The default registry, so no custom-registry licence check is involved.
				registry: 'https://registry.npmjs.org',
				unverifiedEnabled: true,
				authToken: '',
			}),
			mock<OutboundHttp>({ requests: vi.fn().mockReturnValue(mock<HttpRequestClient>()) }),
		);
	});

	afterEach(() => {
		rmSync(downloadFolder, { recursive: true, force: true });
	});

	// A fresh install is one with no database record, which says nothing about what is on
	// disk. A directory can already be there after a crash mid-install, or on a reinstall
	// of a package the loader reports as missing.
	describe('fresh install over an existing package directory', () => {
		test('keeps the existing directory when the download fails', async () => {
			await writeExistingPackage();
			stubNpmAndTar({ packFails: true });

			await expect(service.installPackage(PACKAGE_NAME)).rejects.toThrow('npm pack failed');

			expect(await readMarker()).toBe(PREVIOUS_VERSION);
			expect(await backupDirectories()).toEqual([]);
			expect(await readLedgerDependencies()).toEqual({ [PACKAGE_NAME]: PREVIOUS_VERSION });
		});

		test('keeps the existing directory when the new version fails to load', async () => {
			await writeExistingPackage();
			stubNpmAndTar();
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await expect(service.installPackage(PACKAGE_NAME)).rejects.toThrow(
				'The specified package could not be loaded',
			);

			expect(await readMarker()).toBe(PREVIOUS_VERSION);
			expect(await backupDirectories()).toEqual([]);
			expect(await readLedgerDependencies()).toEqual({ [PACKAGE_NAME]: PREVIOUS_VERSION });
		});

		test('replaces the directory and leaves no backup behind on success', async () => {
			await writeExistingPackage();
			stubNpmAndTar();

			await service.installPackage(PACKAGE_NAME);

			expect(await readMarker()).toBe(NEW_VERSION);
			expect(await backupDirectories()).toEqual([]);
			expect(await readLedgerDependencies()).toEqual({ [PACKAGE_NAME]: NEW_VERSION });
		});
	});

	test('restores the previous version when an update fails to persist', async () => {
		await writeExistingPackage();
		stubNpmAndTar();
		installedPackageRepository.replaceInstalledPackageWithNodes.mockRejectedValueOnce(
			new Error('database is locked'),
		);

		await expect(
			service.updatePackage(
				PACKAGE_NAME,
				mock<InstalledPackages>({ packageName: PACKAGE_NAME, installedVersion: PREVIOUS_VERSION }),
			),
		).rejects.toThrow('Failed to save installed package');

		expect(await readMarker()).toBe(PREVIOUS_VERSION);
		expect(await readLedgerDependencies()).toEqual({ [PACKAGE_NAME]: PREVIOUS_VERSION });
	});

	test('removes the partially downloaded directory when there was nothing to restore', async () => {
		stubNpmAndTar();
		loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

		await expect(service.installPackage(PACKAGE_NAME)).rejects.toThrow();

		expect(await readdir(nodeModulesDir)).toEqual([]);
		expect(await readLedgerDependencies()).toEqual({});
	});
});
