import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockInstance } from '@n8n/backend-test-utils';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import { execFile } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';

import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import type { InstalledPackages } from '../installed-packages.entity';
import { InstalledPackagesRepository } from '../installed-packages.repository';
import { executeNpmCommand } from '../npm-utils';

// Use a plain `execFile` mock (no `[util.promisify.custom]` symbol). Vitest's
// automock preserves that symbol from the real module, which makes the source's
// module-level `promisify(execFile)` bypass the mock and call the real binary.
vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
vi.mock('../npm-utils', async () => ({
	...(await vi.importActual<typeof import('../npm-utils')>('../npm-utils')),
	executeNpmCommand: vi.fn(),
	checkIfVersionExistsOrThrow: vi.fn().mockResolvedValue(true),
	verifyIntegrity: vi.fn().mockResolvedValue(undefined),
}));

const PACKAGE_NAME = 'n8n-nodes-test';
const TARBALL_NAME = `${PACKAGE_NAME}-2.0.0.tgz`;

/**
 * Exercises the install rollback against a real filesystem rather than mocked `fs`
 * calls. The bug being guarded here is a directory that is deleted with no backup
 * left, which only a real `existsSync` can prove did not happen.
 */
describe('CommunityPackagesService install rollback (real filesystem)', () => {
	const license = mock<License>();
	const config = mock<CommunityPackagesConfig>({
		reinstallMissing: false,
		registry: 'https://registry.npmjs.org',
		unverifiedEnabled: true,
		authToken: '',
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const installedPackageRepository = mockInstance(InstalledPackagesRepository);
	const logger = mock<Logger>();
	const publisher = mock<Publisher>();
	const request = vi.fn();
	const outboundHttp = mock<OutboundHttp>({
		requests: vi.fn().mockReturnValue(mock<HttpRequestClient>({ request })),
	});

	let nodesDownloadDir: string;
	let packageDirectory: string;
	let communityPackagesService: CommunityPackagesService;

	/** The file that proves the originally installed directory is still the one on disk. */
	const markerPath = () => path.join(packageDirectory, 'marker.txt');

	const nodeModulesEntries = async () => await readdir(path.join(nodesDownloadDir, 'node_modules'));

	const ledgerDependencies = async () =>
		JSON.parse(await readFile(path.join(nodesDownloadDir, 'package.json'), 'utf-8')).dependencies;

	beforeEach(async () => {
		vi.clearAllMocks();

		nodesDownloadDir = await mkdtemp(path.join(tmpdir(), 'n8n-community-packages-'));
		packageDirectory = path.join(nodesDownloadDir, 'node_modules', PACKAGE_NAME);

		// The ledger, plus a package already installed on disk at 1.0.0.
		await writeFile(
			path.join(nodesDownloadDir, 'package.json'),
			JSON.stringify({
				name: 'installed-nodes',
				private: true,
				dependencies: { [PACKAGE_NAME]: '1.0.0' },
			}),
			'utf-8',
		);
		await mkdir(packageDirectory, { recursive: true });
		await writeFile(
			path.join(packageDirectory, 'package.json'),
			JSON.stringify({ name: PACKAGE_NAME, version: '1.0.0' }),
			'utf-8',
		);
		await writeFile(markerPath(), 'installed-and-working', 'utf-8');

		// `npm pack` drops a tarball in the download folder; `npm install` is a no-op here.
		vi.mocked(executeNpmCommand).mockImplementation(async (args: string[]) => {
			if (args[0] === 'pack') {
				await writeFile(path.join(nodesDownloadDir, TARBALL_NAME), 'tarball', 'utf-8');
				return TARBALL_NAME;
			}
			return 'Done';
		});

		// Stand in for `tar -xzf`: write the 2.0.0 payload into the target directory.
		vi.mocked(execFile).mockImplementation(((...args: unknown[]) => {
			const cmdArgs = args[1] as string[];
			const target = cmdArgs[cmdArgs.indexOf('-C') + 1];
			const callback = args[args.length - 1] as (
				error: Error | null,
				stdout: string,
				stderr: string,
			) => void;

			// Report a write failure as a `tar` failure, so it surfaces instead of leaving the
			// callback uncalled and the test hanging.
			void writeFile(
				path.join(target, 'package.json'),
				JSON.stringify({ name: PACKAGE_NAME, version: '2.0.0' }),
				'utf-8',
			).then(
				() => callback(null, 'Done', ''),
				(error: Error) => callback(error, '', ''),
			);
		}) as unknown as typeof execFile);

		loadNodesAndCredentials.loadPackage.mockResolvedValue(
			mock<PackageDirectoryLoader>({ loadedNodes: [{ name: 'node', version: 1 }] }),
		);
		loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
		installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
			mock<InstalledPackages>({ packageName: PACKAGE_NAME, installedVersion: '2.0.0' }),
		);
		publisher.publishCommand.mockResolvedValue(undefined);

		communityPackagesService = new CommunityPackagesService(
			mock<InstanceSettings>({ nodesDownloadDir }),
			logger,
			installedPackageRepository,
			loadNodesAndCredentials,
			publisher,
			license,
			config,
			outboundHttp,
		);
	});

	afterEach(async () => {
		await rm(nodesDownloadDir, { recursive: true, force: true });
	});

	describe('fresh install over a pre-existing directory', () => {
		test('keeps the existing package when the download fails', async () => {
			vi.mocked(executeNpmCommand).mockRejectedValueOnce(new Error('download failed'));

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow(
				'download failed',
			);

			expect(existsSync(markerPath())).toBe(true);
			expect(
				JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf-8')),
			).toEqual({ name: PACKAGE_NAME, version: '1.0.0' });
			// The restored directory has to stay listed, or `npm outdated` stops seeing it.
			expect(await ledgerDependencies()).toEqual({ [PACKAGE_NAME]: '1.0.0' });
		});

		test('keeps the existing package when loading the downloaded one fails', async () => {
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow(
				'The specified package could not be loaded',
			);

			expect(existsSync(markerPath())).toBe(true);
			// The restored directory is loaded again, so its nodes stay available.
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(2);
			// The download got as far as writing 2.0.0 to the ledger, so it has to be rolled back.
			expect(await ledgerDependencies()).toEqual({ [PACKAGE_NAME]: '1.0.0' });
		});

		test('keeps the existing package when the downloaded one has no loadable nodes', async () => {
			loadNodesAndCredentials.loadPackage.mockResolvedValueOnce(
				mock<PackageDirectoryLoader>({ loadedNodes: [] }),
			);

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow();

			expect(existsSync(markerPath())).toBe(true);
		});

		test('leaves no backup directory behind once the install succeeds', async () => {
			await communityPackagesService.installPackage(PACKAGE_NAME);

			expect(await nodeModulesEntries()).toEqual([PACKAGE_NAME]);
			// The new version replaced the old one, marker and all.
			expect(existsSync(markerPath())).toBe(false);
		});
	});

	describe('update with a missing or malformed ledger', () => {
		test('restores the previous version from the database instead of dropping the entry', async () => {
			// Unlike the shared beforeEach's valid ledger, this one can't be read at all.
			await writeFile(path.join(nodesDownloadDir, 'package.json'), 'not valid json', 'utf-8');
			installedPackageRepository.find.mockResolvedValue([
				mock<InstalledPackages>({ packageName: PACKAGE_NAME, installedVersion: '1.0.0' }),
			]);
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await expect(
				communityPackagesService.updatePackage(
					PACKAGE_NAME,
					mock<InstalledPackages>({ packageName: PACKAGE_NAME, installedVersion: '1.0.0' }),
					'2.0.0',
				),
			).rejects.toThrow('The specified package could not be loaded');

			// The download rebuilt the ledger from the DB and pointed it at 2.0.0; the rollback
			// has to restore 1.0.0 from the DB record, not drop the entry because the read at the
			// start of the update failed.
			expect(await ledgerDependencies()).toEqual({ [PACKAGE_NAME]: '1.0.0' });
		});
	});

	describe('pub/sub follower', () => {
		test('keeps the existing package when the download fails', async () => {
			vi.mocked(executeNpmCommand).mockRejectedValueOnce(new Error('download failed'));

			await communityPackagesService.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: '2.0.0',
			});

			expect(existsSync(markerPath())).toBe(true);
			// The ledger is the leader's to own, so a follower rollback must not touch it.
			expect(
				JSON.parse(await readFile(path.join(nodesDownloadDir, 'package.json'), 'utf-8')),
			).toEqual({
				name: 'installed-nodes',
				private: true,
				dependencies: { [PACKAGE_NAME]: '1.0.0' },
			});
		});

		test('keeps the downloaded package when loading it fails', async () => {
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await communityPackagesService.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: '2.0.0',
			});

			// Not rolled back to 1.0.0: that would leave this instance behind the leader's
			// record with nothing reporting it. The failure stays visible instead.
			expect(existsSync(markerPath())).toBe(false);
			expect(
				JSON.parse(await readFile(path.join(packageDirectory, 'package.json'), 'utf-8')),
			).toEqual({ name: PACKAGE_NAME, version: '2.0.0' });
			// Disk and ledger agree, and the backup is not left behind.
			expect(await nodeModulesEntries()).toEqual([PACKAGE_NAME]);
			expect(await ledgerDependencies()).toEqual({ [PACKAGE_NAME]: '2.0.0' });
		});

		test('keeps the downloaded package when a first install fails to load', async () => {
			// No previous copy to fall back on, unlike the shared beforeEach.
			await rm(packageDirectory, { recursive: true, force: true });
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await communityPackagesService.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: '2.0.0',
			});

			expect(await nodeModulesEntries()).toEqual([PACKAGE_NAME]);
		});

		test('leaves no backup directory behind once the install succeeds', async () => {
			await communityPackagesService.handleInstallEvent({
				packageName: PACKAGE_NAME,
				packageVersion: '2.0.0',
			});

			expect(await nodeModulesEntries()).toEqual([PACKAGE_NAME]);
			expect(existsSync(markerPath())).toBe(false);
		});
	});
});
