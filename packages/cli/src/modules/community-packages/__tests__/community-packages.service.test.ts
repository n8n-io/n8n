import type { Logger } from '@n8n/backend-common';
import type { HttpRequestClient, OutboundHttp } from '@n8n/backend-network';
import { mockInstance, randomName } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';
import { mock } from 'vitest-mock-extended';

import { NPM_PACKAGE_STATUS_GOOD } from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '@test-integration/constants';
import { mockPackageName, mockPackagePair } from '@test-integration/utils';

import { getCommunityNodeTypes } from '../community-node-types-utils';
import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import type { CommunityPackages } from '../community-packages.types';
import { InstalledNodes } from '../installed-nodes.entity';
import { InstalledNodesRepository } from '../installed-nodes.repository';
import { InstalledPackages } from '../installed-packages.entity';
import { InstalledPackagesRepository } from '../installed-packages.repository';
import { executeNpmCommand } from '../npm-utils';

vi.mock('node:fs/promises');
// Use a plain `execFile` mock (no `[util.promisify.custom]` symbol). Vitest's
// automock preserves that symbol from the real module, which makes the source's
// module-level `promisify(execFile)` bypass the mock and call the real binary.
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

const execMock: typeof execFile = ((...args) => {
	const currentCallback = args[args.length - 1] as ExecFileCallback;
	currentCallback(null, 'Done', '');
}) as typeof execFile;

vi.mocked(execFile).mockImplementation(execMock);

describe('CommunityPackagesService', () => {
	const license = mock<License>();
	const config = mock<CommunityPackagesConfig>({
		reinstallMissing: false,
		registry: 'some.random.host',
		unverifiedEnabled: true,
		authToken: '',
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const installedNodesRepository = mockInstance(InstalledNodesRepository);
	const installedPackageRepository = mockInstance(InstalledPackagesRepository);

	const nodesDownloadDir = path.join('tmp', 'n8n-vi-global-downloads');
	const instanceSettings = mock<InstanceSettings>({ nodesDownloadDir });

	const logger = mock<Logger>();
	const publisher = mock<Publisher>();

	const request = vi.fn();
	const requests = vi.fn().mockReturnValue(mock<HttpRequestClient>({ request }));
	const outboundHttp = mock<OutboundHttp>({ requests });

	const communityPackagesService = new CommunityPackagesService(
		instanceSettings,
		logger,
		installedPackageRepository,
		loadNodesAndCredentials,
		publisher,
		license,
		config,
		outboundHttp,
	);

	beforeEach(() => {
		vi.resetAllMocks();
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
		publisher.publishCommand.mockResolvedValue(undefined);

		const nodeName = randomName();
		installedNodesRepository.create.mockImplementation(() => {
			return Object.assign(new InstalledNodes(), {
				name: nodeName,
				type: nodeName,
				latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
			});
		});
		installedPackageRepository.create.mockImplementation(() => {
			return Object.assign(new InstalledPackages(), {
				packageName: mockPackageName(),
				installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
			});
		});
	});

	describe('parseNpmPackageName()', () => {
		test('should fail with empty package name', () => {
			expect(() => communityPackagesService.parseNpmPackageName('')).toThrowError();
		});

		test('should fail with invalid package prefix name', () => {
			expect(() =>
				communityPackagesService.parseNpmPackageName('INVALID_PREFIX@123'),
			).toThrowError();
		});

		test.each(['1.a.b', '1invalid', '-starts-with-dash'])(
			'should fail with invalid version',
			(version) => {
				expect(() =>
					communityPackagesService.parseNpmPackageName(`n8n-nodes-test@${version}`),
				).toThrow(`Invalid version: ${version}`);
			},
		);

		test.each(['beta', 'next', 'latest', 'canary', 'rc-1'])(
			'should accept npm dist-tag as version',
			(tag) => {
				const parsed = communityPackagesService.parseNpmPackageName(`n8n-nodes-test@${tag}`);
				expect(parsed.version).toBe(tag);
			},
		);

		test('should parse valid package name', () => {
			const name = mockPackageName();
			const parsed = communityPackagesService.parseNpmPackageName(name);

			expect(parsed.rawString).toBe(name);
			expect(parsed.packageName).toBe(name);
			expect(parsed.scope).toBeUndefined();
			expect(parsed.version).toBeUndefined();
		});

		test('should parse valid package name and version', () => {
			const name = mockPackageName();
			const version = '0.1.1';
			const fullPackageName = `${name}@${version}`;
			const parsed = communityPackagesService.parseNpmPackageName(fullPackageName);

			expect(parsed.rawString).toBe(fullPackageName);
			expect(parsed.packageName).toBe(name);
			expect(parsed.scope).toBeUndefined();
			expect(parsed.version).toBe(version);
		});

		test('should parse valid package name, scope and version', () => {
			const scope = '@n8n';
			const name = mockPackageName();
			const version = '0.1.1';
			const fullPackageName = `${scope}/${name}@${version}`;
			const parsed = communityPackagesService.parseNpmPackageName(fullPackageName);

			expect(parsed.rawString).toBe(fullPackageName);
			expect(parsed.packageName).toBe(`${scope}/${name}`);
			expect(parsed.scope).toBe(scope);
			expect(parsed.version).toBe(version);
		});
	});

	describe('crossInformationPackage()', () => {
		test('should return same list if availableUpdates is undefined', () => {
			const fakePkgs = mockPackagePair();

			const crossedPkgs = communityPackagesService.matchPackagesWithUpdates(fakePkgs);

			expect(crossedPkgs).toEqual(fakePkgs);
		});

		test('should correctly match update versions for packages', () => {
			const [pkgA, pkgB] = mockPackagePair();

			const updates: CommunityPackages.AvailableUpdates = {
				[pkgA.packageName]: {
					current: pkgA.installedVersion,
					wanted: pkgA.installedVersion,
					latest: '0.2.0',
					location: pkgA.packageName,
				},
				[pkgB.packageName]: {
					current: pkgA.installedVersion,
					wanted: pkgA.installedVersion,
					latest: '0.3.0',
					location: pkgA.packageName,
				},
			};

			const [crossedPkgA, crossedPkgB]: PublicInstalledPackage[] =
				communityPackagesService.matchPackagesWithUpdates([pkgA, pkgB], updates);

			expect(crossedPkgA.updateAvailable).toBe('0.2.0');
			expect(crossedPkgB.updateAvailable).toBe('0.3.0');
		});

		test('should correctly match update versions for single package', () => {
			const [pkgA, pkgB] = mockPackagePair();

			const updates: CommunityPackages.AvailableUpdates = {
				[pkgB.packageName]: {
					current: pkgA.installedVersion,
					wanted: pkgA.installedVersion,
					latest: '0.3.0',
					location: pkgA.packageName,
				},
			};

			const [crossedPkgA, crossedPkgB]: PublicInstalledPackage[] =
				communityPackagesService.matchPackagesWithUpdates([pkgA, pkgB], updates);

			expect(crossedPkgA.updateAvailable).toBeUndefined();
			expect(crossedPkgB.updateAvailable).toBe('0.3.0');
		});
	});

	/** `mockPackagePair()`'s node-repository mock ignores its input and returns one shared
	 *  `type` per test, so tests that need distinct/specific node types build fixtures directly. */
	const installedPackageWithNodeTypes = (nodeTypes: string[]) =>
		Object.assign(new InstalledPackages(), {
			packageName: mockPackageName(),
			installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
			installedNodes: nodeTypes.map((type) =>
				Object.assign(new InstalledNodes(), { name: type, type, latestVersion: 1 }),
			),
		});

	describe('withLoadStatus()', () => {
		test('should not flag packages whose nodes are all known', () => {
			const pkgA = installedPackageWithNodeTypes(['node-a']);
			const pkgB = installedPackageWithNodeTypes(['node-b1', 'node-b2']);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(true);

			const [matchedPkgA, matchedPkgB] = communityPackagesService.withLoadStatus([pkgA, pkgB]);

			expect(matchedPkgA.failedLoading).toBe(false);
			expect(matchedPkgB.failedLoading).toBe(false);
		});

		test('should flag a package none of whose nodes are known', () => {
			const pkgA = installedPackageWithNodeTypes(['node-a']);
			const pkgB = installedPackageWithNodeTypes(['node-b']);
			loadNodesAndCredentials.isKnownNode.mockImplementation((type) => type === 'node-b');

			const [matchedPkgA, matchedPkgB] = communityPackagesService.withLoadStatus([pkgA, pkgB]);

			expect(matchedPkgA.failedLoading).toBe(true);
			expect(matchedPkgB.failedLoading).toBe(false);
		});

		test('should not flag a package that still has one stale node row from a dropped node type', () => {
			// Simulates a repair-reinstall through `saveInstalledPackageWithNodes`, which (unlike
			// `replaceInstalledPackageWithNodes`) doesn't delete node rows from a previous version,
			// so a package that dropped a node type keeps a row that will never resolve again.
			const pkg = installedPackageWithNodeTypes(['old-dropped-node', 'current-node']);
			loadNodesAndCredentials.isKnownNode.mockImplementation((type) => type === 'current-node');

			const [matched] = communityPackagesService.withLoadStatus([pkg]);

			expect(loadNodesAndCredentials.isKnownNode).toHaveBeenCalledWith('old-dropped-node');
			expect(matched.failedLoading).toBe(false);
		});

		test('reflects the current loader state rather than a snapshot, with no install call in between', () => {
			const pkg = installedPackageWithNodeTypes(['node-a']);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);

			expect(communityPackagesService.withLoadStatus([pkg])[0].failedLoading).toBe(true);

			loadNodesAndCredentials.isKnownNode.mockReturnValue(true);

			expect(communityPackagesService.withLoadStatus([pkg])[0].failedLoading).toBe(false);
		});
	});

	describe('checkNpmPackageStatus()', () => {
		test('should POST the package name to the n8n backend', async () => {
			const packageName = mockPackageName();
			await communityPackagesService.checkNpmPackageStatus(packageName);

			expect(request).toHaveBeenCalledWith({
				url: 'https://api.n8n.io/api/package',
				method: 'POST',
				body: { name: packageName },
				json: true,
			});
		});

		test('should not fail if request fails', async () => {
			request.mockImplementation(() => {
				throw new Error('Something went wrong');
			});

			const result = await communityPackagesService.checkNpmPackageStatus(mockPackageName());

			expect(result.status).toBe(NPM_PACKAGE_STATUS_GOOD);
		});

		test('should warn if package is banned', async () => {
			request.mockResolvedValue({ status: 'Banned', reason: 'Not good' });

			const result = (await communityPackagesService.checkNpmPackageStatus(
				mockPackageName(),
			)) as CommunityPackages.PackageStatusCheck;

			expect(result.status).toBe('Banned');
			expect(result.reason).toBe('Not good');
		});
	});

	describe('isPackageLoaded()', () => {
		test('should return true for a package with no installed nodes', () => {
			const installedPackage = installedPackageWithNodeTypes([]);

			expect(communityPackagesService.isPackageLoaded(installedPackage)).toBe(true);
		});

		test('should return true when at least one installed node is known', () => {
			const installedPackage = installedPackageWithNodeTypes(['node-a', 'node-b']);
			loadNodesAndCredentials.isKnownNode.mockImplementation((type) => type === 'node-b');

			expect(communityPackagesService.isPackageLoaded(installedPackage)).toBe(true);
		});

		test('should return false when no installed node is known', () => {
			const installedPackage = installedPackageWithNodeTypes(['node-a']);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);

			expect(communityPackagesService.isPackageLoaded(installedPackage)).toBe(false);
		});
	});

	describe('updatePackage', () => {
		const PACKAGE_NAME = 'n8n-nodes-test';
		const installedPackageForUpdateTest = mock<InstalledPackages>({
			packageName: PACKAGE_NAME,
			installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
		});

		const packageDirectoryLoader = mock<PackageDirectoryLoader>({
			loadedNodes: [{ name: 'a-node-from-the-loader', version: 1 }],
		});

		const testBlockDownloadDir = instanceSettings.nodesDownloadDir;
		const testBlockPackageDir = `${testBlockDownloadDir}/node_modules/${PACKAGE_NAME}`;
		const testBlockTarballName = `${PACKAGE_NAME}-latest.tgz`;
		const testBlockRegistry = config.registry;
		const testBlockNpmInstallArgs = [
			'--audit=false',
			'--fund=false',
			'--bin-links=false',
			'--install-strategy=shallow',
			'--ignore-scripts=true',
			'--package-lock=false',
		].join(' ');

		const execMockForThisBlock = ((...args: Parameters<typeof execFile>) => {
			const command = args[0];
			const cmdArgs = args[1];
			const actualCallback = args[args.length - 1] as ExecFileCallback;

			if (command === 'npm' && cmdArgs?.[0] === 'pack') {
				actualCallback(null, testBlockTarballName, '');
			} else {
				actualCallback(null, 'Done', '');
			}
		}) as typeof execFile;

		beforeEach(() => {
			vi.clearAllMocks();

			// A directory is there for the pre-download backup, and again after a rollback
			// puts it back, which is what decides whether the rollback reloads it.
			vi.mocked(access).mockResolvedValue(undefined);

			vi.mocked(execFile).mockImplementation(execMockForThisBlock);
			vi.mocked(executeNpmCommand).mockImplementation(async (args: string[]) => {
				if (args[0] === 'pack') {
					return testBlockTarballName;
				}
				return 'Done';
			});

			vi.mocked(readFile).mockResolvedValue(
				JSON.stringify({
					name: PACKAGE_NAME,
					version: '1.0.0', // Mocked version from package.json inside tarball
					dependencies: { 'some-actual-dep': '1.2.3' },
					devDependencies: { 'a-dev-dep': '1.0.0' },
					peerDependencies: { 'a-peer-dep': '2.0.0' },
					optionalDependencies: { 'an-optional-dep': '3.0.0' },
				}),
			);
			vi.mocked(writeFile).mockResolvedValue(undefined);

			loadNodesAndCredentials.loadPackage.mockResolvedValue(packageDirectoryLoader);
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

			installedPackageRepository.remove.mockResolvedValue(undefined as any);
			installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
				installedPackageForUpdateTest,
			);
			installedPackageRepository.replaceInstalledPackageWithNodes.mockResolvedValue(
				installedPackageForUpdateTest,
			);

			publisher.publishCommand.mockResolvedValue(undefined);
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		test('should restore the previous package directory when loading the updated package fails', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('The specified package could not be loaded');

			expect(rename).toHaveBeenNthCalledWith(1, testBlockPackageDir, backupDirectory);
			expect(rename).toHaveBeenNthCalledWith(2, backupDirectory, testBlockPackageDir);
		});

		test('should restore the previous package.json dependency version when an update fails', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);

			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));
			vi.mocked(readFile)
				// The ledger as it stands before the update, which is what the rollback restores.
				.mockResolvedValueOnce(
					JSON.stringify({
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: COMMUNITY_PACKAGE_VERSION.CURRENT },
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: PACKAGE_NAME,
						version: '2.0.0',
						dependencies: { 'some-actual-dep': '1.2.3' },
						devDependencies: {},
						peerDependencies: {},
						optionalDependencies: {},
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: '2.0.0' },
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: '2.0.0' },
					}),
				);

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('The specified package could not be loaded');

			expect(writeFile).toHaveBeenNthCalledWith(
				3,
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify(
					{
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: COMMUNITY_PACKAGE_VERSION.CURRENT },
					},
					null,
					2,
				),
				'utf-8',
			);
		});

		test('should reload the restored package when an update fails', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);

			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('The specified package could not be loaded');

			// Unloaded twice: once before the failed load, once to drop it during the rollback.
			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledTimes(2);
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(2);
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenNthCalledWith(2, PACKAGE_NAME);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);
			expect(loadNodesAndCredentials.releaseTypes).toHaveBeenCalledTimes(1);
		});

		test('should restore the previous package without reloading when the download fails during an update', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			vi.mocked(executeNpmCommand).mockRejectedValueOnce(new Error('download failed'));

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('download failed');

			expect(rename).toHaveBeenNthCalledWith(1, testBlockPackageDir, backupDirectory);
			expect(rename).toHaveBeenNthCalledWith(2, backupDirectory, testBlockPackageDir);
			expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.unloadPackage).not.toHaveBeenCalled();
		});

		test('should restore the previous package when the updated package contains no loadable nodes', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			loadNodesAndCredentials.loadPackage.mockResolvedValueOnce(
				mock<PackageDirectoryLoader>({ loadedNodes: [] }),
			);

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow();

			expect(rename).toHaveBeenNthCalledWith(2, backupDirectory, testBlockPackageDir);
			expect(installedPackageRepository.replaceInstalledPackageWithNodes).not.toHaveBeenCalled();
		});

		test('should remove the package.json dependency when a fresh install fails', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			// No pre-existing directory here, unlike the shared beforeEach's update scenario.
			vi.mocked(access).mockReset().mockRejectedValue(new Error('ENOENT'));

			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('broken package'));
			vi.mocked(readFile)
				// Nothing on disk and nothing in the ledger, so there is no entry to restore.
				.mockResolvedValueOnce(
					JSON.stringify({ name: 'installed-nodes', private: true, dependencies: {} }),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: PACKAGE_NAME,
						version: '1.0.0',
						dependencies: {},
						devDependencies: {},
						peerDependencies: {},
						optionalDependencies: {},
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: '1.0.0' },
					}),
				)
				.mockResolvedValueOnce(
					JSON.stringify({
						name: 'installed-nodes',
						private: true,
						dependencies: { [PACKAGE_NAME]: '1.0.0' },
					}),
				);

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow(
				'The specified package could not be loaded',
			);

			// Nothing to back up, so cleanup only deletes — no rename.
			expect(rename).not.toHaveBeenCalled();
			expect(writeFile).toHaveBeenNthCalledWith(
				3,
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify({ name: 'installed-nodes', private: true, dependencies: {} }, null, 2),
				'utf-8',
			);
		});

		test('should not attempt a reload when the directory restore left nothing behind', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			// A directory to back up, but none once the restore below fails to put it back.
			vi.mocked(access)
				.mockReset()
				.mockResolvedValueOnce(undefined)
				.mockRejectedValue(new Error('ENOENT'));
			vi.mocked(rename).mockImplementation(async (from) => {
				if (from === backupDirectory) throw new Error('EPERM');
			});
			installedPackageRepository.replaceInstalledPackageWithNodes.mockRejectedValueOnce(
				new Error('DB unreachable'),
			);

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('Failed to save installed package');

			// Loading a directory the restore failed to put back can only fail, and its
			// warning would point at the reload instead of the restore that actually broke.
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(1);
			expect(logger.warn).not.toHaveBeenCalledWith(
				'Failed to reload community package after failed installation',
				expect.anything(),
			);
			// The registry still has to be rebuilt: the unload already happened.
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);
		});

		test('should unload the package when a fresh install fails to save to the database', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			// No pre-existing directory here, unlike the shared beforeEach's update scenario.
			vi.mocked(access).mockReset().mockRejectedValue(new Error('ENOENT'));

			installedPackageRepository.saveInstalledPackageWithNodes.mockRejectedValueOnce(
				new Error('DB unreachable'),
			);

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow(
				'Failed to save installed package',
			);

			// The load succeeded, so the loader has to go: the install is reported as failed,
			// left no database record, and its directory is gone.
			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledTimes(2);
			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenLastCalledWith(PACKAGE_NAME);
			// Nothing was backed up, so there is no previous version to load again.
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(1);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);
		});

		test('should unload the package when a fresh install contains no loadable nodes', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.mocked(access).mockReset().mockRejectedValue(new Error('ENOENT'));

			loadNodesAndCredentials.loadPackage.mockResolvedValueOnce(
				mock<PackageDirectoryLoader>({ loadedNodes: [] }),
			);

			await expect(communityPackagesService.installPackage(PACKAGE_NAME)).rejects.toThrow();

			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledTimes(2);
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(1);
		});

		test('should still succeed when removing the backup directory fails after the update', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			// Fail only the backup cleanup, which runs after the DB update has committed
			vi.mocked(rm).mockImplementation(async (target) => {
				if (target === backupDirectory) throw new Error('cleanup failed');
				return undefined;
			});

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).resolves.toBe(installedPackageForUpdateTest);

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to remove community package backup directory',
				expect.objectContaining({ backupDirectory }),
			);
		});

		test('should not roll back when a post-save step fails after the database is updated', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);

			// Fails only after the DB swap has already committed the new version
			loadNodesAndCredentials.postProcessLoaders.mockRejectedValueOnce(
				new Error('post-process failed'),
			);

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow('post-process failed');

			expect(installedPackageRepository.replaceInstalledPackageWithNodes).toHaveBeenCalled();
			// No restore: the new version is already authoritative in the DB
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledTimes(1);
		});

		test('should call `exec` with the correct sequence of commands, handle file ops, and interact with services', async () => {
			// ARRANGE
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			// ACT
			await communityPackagesService.updatePackage(
				installedPackageForUpdateTest.packageName,
				installedPackageForUpdateTest,
			);

			// ASSERT:
			// Only the pre-download backup rename — success needs no restore.
			expect(rename).toHaveBeenCalledTimes(1);
			expect(rename).toHaveBeenCalledWith(testBlockPackageDir, backupDirectory);

			expect(rm).toHaveBeenCalledTimes(2);
			expect(rm).toHaveBeenNthCalledWith(
				1,
				path.join(nodesDownloadDir, 'n8n-nodes-test-latest.tgz'),
			);
			expect(rm).toHaveBeenNthCalledWith(2, backupDirectory, {
				recursive: true,
				force: true,
				maxRetries: 3,
			});

			// Check executeNpmCommand was called for npm commands
			expect(executeNpmCommand).toHaveBeenCalledTimes(2);
			expect(executeNpmCommand).toHaveBeenNthCalledWith(
				1,
				['pack', `${PACKAGE_NAME}@latest`, '--quiet'],
				{ cwd: testBlockDownloadDir, registry: testBlockRegistry, authToken: undefined },
			);

			expect(executeNpmCommand).toHaveBeenNthCalledWith(
				2,
				['install', ...testBlockNpmInstallArgs.split(' ')],
				{ cwd: testBlockPackageDir, registry: testBlockRegistry, authToken: undefined },
			);

			// Check execFile was called only for tar command
			expect(execFile).toHaveBeenCalledTimes(1);
			expect(execFile).toHaveBeenCalledWith(
				'tar',
				['-xzf', testBlockTarballName, '-C', testBlockPackageDir, '--strip-components=1'],
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(mkdir).toHaveBeenCalledWith(testBlockPackageDir, { recursive: true });
			expect(readFile).toHaveBeenCalledWith(`${testBlockPackageDir}/package.json`, 'utf-8');
			expect(writeFile).toHaveBeenCalledWith(
				`${testBlockPackageDir}/package.json`,
				JSON.stringify(
					{
						name: PACKAGE_NAME,
						version: '1.0.0',
						dependencies: { 'some-actual-dep': '1.2.3' },
					},
					null,
					2,
				),
				'utf-8',
			);

			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(PACKAGE_NAME);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);

			expect(installedPackageRepository.replaceInstalledPackageWithNodes).toHaveBeenCalledWith(
				installedPackageForUpdateTest,
				packageDirectoryLoader,
			);
			expect(installedPackageRepository.remove).not.toHaveBeenCalled();
			expect(installedPackageRepository.saveInstalledPackageWithNodes).not.toHaveBeenCalled();

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'community-package-update',
				// The resolved version that was just persisted, not the requested `latest` specifier.
				payload: { packageName: PACKAGE_NAME, packageVersion: COMMUNITY_PACKAGE_VERSION.CURRENT },
			});
		});

		test('should still succeed when publishing the update event fails', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			publisher.publishCommand.mockRejectedValue(new Error('Redis unreachable'));

			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).resolves.toBe(installedPackageForUpdateTest);
			await Promise.resolve();
			await Promise.resolve();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to publish community package install/update event',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
		});

		test('should not attempt to delete the tarball when npm pack prints no filename', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			vi.spyOn(Date, 'now').mockReturnValue(1_717_171_717_171);
			const backupDirectory = `${testBlockPackageDir}.backup-1717171717171`;

			vi.mocked(executeNpmCommand).mockImplementation(async (args: string[]) => {
				if (args[0] === 'pack') return '';
				return 'Done';
			});

			await communityPackagesService.updatePackage(
				installedPackageForUpdateTest.packageName,
				installedPackageForUpdateTest,
			);

			expect(rm).not.toHaveBeenCalledWith(testBlockDownloadDir);
			expect(rm).toHaveBeenCalledTimes(1);
			expect(rm).toHaveBeenCalledWith(backupDirectory, {
				recursive: true,
				force: true,
				maxRetries: 3,
			});
		});

		test('should throw when not licensed for custom registry if custom registry is different from default', async () => {
			// ARRANGE
			license.isCustomNpmRegistryEnabled.mockReturnValue(false);

			// ACT & ASSERT
			const promise = communityPackagesService.updatePackage(
				installedPackageForUpdateTest.packageName,
				installedPackageForUpdateTest,
			);
			await expect(promise).rejects.toThrow(FeatureNotLicensedError);
			await expect(promise).rejects.toThrow(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY);
		});
	});

	describe('installPackage', () => {
		test('should throw when installation of not vetted packages is forbidden', async () => {
			config.unverifiedEnabled = false;
			config.registry = 'https://registry.npmjs.org';
			await expect(communityPackagesService.installPackage('package', '0.1.0')).rejects.toThrow(
				'Installation of unverified community packages is forbidden!',
			);
		});
	});

	describe('removePackage', () => {
		test('should remove a broken package that cannot be loaded', async () => {
			const PACKAGE_NAME = 'n8n-nodes-broken';
			const installedPackage = mock<InstalledPackages>({ packageName: PACKAGE_NAME });

			// A broken package fails to load, but removal must not depend on loading it
			loadNodesAndCredentials.loadPackage.mockRejectedValue(
				new Error('The specified package could not be loaded'),
			);
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
			vi.mocked(rm).mockResolvedValue(undefined);
			installedPackageRepository.remove.mockResolvedValue(undefined as never);

			await expect(
				communityPackagesService.removePackage(PACKAGE_NAME, installedPackage),
			).resolves.toBeUndefined();

			expect(rm).toHaveBeenCalledWith(`${nodesDownloadDir}/node_modules/${PACKAGE_NAME}`, {
				recursive: true,
				force: true,
				maxRetries: 3,
			});
			expect(installedPackageRepository.remove).toHaveBeenCalledWith(installedPackage);
			expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
		});

		test('should log and not throw when publishing the uninstall event fails', async () => {
			const PACKAGE_NAME = 'n8n-nodes-test';
			const installedPackage = mock<InstalledPackages>({ packageName: PACKAGE_NAME });

			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
			vi.mocked(rm).mockResolvedValue(undefined);
			installedPackageRepository.remove.mockResolvedValue(undefined as never);
			publisher.publishCommand.mockRejectedValue(new Error('Redis unreachable'));

			await expect(
				communityPackagesService.removePackage(PACKAGE_NAME, installedPackage),
			).resolves.toBeUndefined();
			await Promise.resolve();
			await Promise.resolve();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to publish community package uninstall event',
				expect.objectContaining({ packageName: PACKAGE_NAME }),
			);
		});
	});

	describe('restorePackageFiles', () => {
		test('restores the package directory before updating the package.json manifest, so a crash mid-restore leaves the directory intact', async () => {
			const packageName = 'n8n-nodes-test';
			const backupDirectory = `${nodesDownloadDir}/node_modules/${packageName}.backup-123`;
			const callOrder: string[] = [];

			vi.mocked(rm).mockResolvedValue(undefined);
			vi.mocked(rename).mockImplementation(async () => {
				callOrder.push('rename');
			});
			vi.spyOn(communityPackagesService, 'updatePackageJsonDependency').mockImplementation(
				async () => {
					callOrder.push('updatePackageJsonDependency');
				},
			);

			await (communityPackagesService as any).restorePackageFiles(packageName, {
				backupDirectory,
				previousVersion: '1.0.0',
			});

			expect(callOrder).toEqual(['rename', 'updatePackageJsonDependency']);
		});

		test('rolls the package.json dependency back even when restoring the directory fails', async () => {
			const packageName = 'n8n-nodes-test';
			const backupDirectory = `${nodesDownloadDir}/node_modules/${packageName}.backup-123`;

			vi.mocked(rm).mockResolvedValue(undefined);
			vi.mocked(rename).mockRejectedValue(new Error('EPERM'));
			const updateDependency = vi
				.spyOn(communityPackagesService, 'updatePackageJsonDependency')
				.mockResolvedValue(undefined);

			await (communityPackagesService as any).restorePackageFiles(packageName, {
				backupDirectory,
				previousVersion: '1.0.0',
			});

			// The manifest must not keep naming the version that failed to install, even
			// though the directory it describes could not be restored.
			expect(updateDependency).toHaveBeenCalledWith(packageName, '1.0.0');
		});

		test('drops the manifest entry when a fresh install fails and the directory restore fails', async () => {
			const packageName = 'n8n-nodes-test';

			vi.mocked(rm).mockRejectedValue(new Error('EBUSY'));
			vi.mocked(readFile).mockResolvedValue(
				JSON.stringify({ dependencies: { [packageName]: '1.0.0' } }),
			);

			await (communityPackagesService as any).restorePackageFiles(packageName, {});

			expect(writeFile).toHaveBeenCalledWith(
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify({ dependencies: {} }, null, 2),
				'utf-8',
			);
		});
	});

	describe('restoreLoadedPackage', () => {
		const packageName = 'n8n-nodes-test';

		beforeEach(() => {
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.loadPackage.mockResolvedValue(mock<PackageDirectoryLoader>());
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
		});

		test('reloads the package when the rollback left a directory on disk', async () => {
			vi.mocked(access).mockResolvedValue(undefined);

			await (communityPackagesService as any).restoreLoadedPackage(packageName);

			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledWith(packageName);
			expect(loadNodesAndCredentials.loadPackage).toHaveBeenCalledWith(packageName);
		});

		test('unloads without reloading when the rollback left nothing on disk', async () => {
			vi.mocked(access).mockRejectedValue(new Error('ENOENT'));

			await (communityPackagesService as any).restoreLoadedPackage(packageName);

			// The loader for the version that failed has to go even with no previous version
			// to bring back, or its nodes stay usable with nothing on disk behind them.
			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledWith(packageName);
			expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);
		});

		test('rebuilds the node type registry even when the reload fails', async () => {
			vi.mocked(access).mockResolvedValue(undefined);
			loadNodesAndCredentials.loadPackage.mockRejectedValueOnce(new Error('ENOENT'));

			await (communityPackagesService as any).restoreLoadedPackage(packageName);

			// Without this the registry keeps advertising the package's node types with no
			// loader behind them, and `withLoadStatus` reports it as loaded.
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalledTimes(1);
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to reload community package after failed installation',
				expect.objectContaining({ packageName }),
			);
		});

		test('warns instead of throwing when the unload fails', async () => {
			loadNodesAndCredentials.unloadPackage.mockRejectedValueOnce(new Error('unload failed'));

			await expect(
				(communityPackagesService as any).restoreLoadedPackage(packageName),
			).resolves.toBeUndefined();

			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to reload community package after failed installation',
				expect.objectContaining({ packageName }),
			);
		});
	});

	describe('ensurePackageJson', () => {
		const packageJsonPath = join(nodesDownloadDir, 'package.json');
		const packageJsonWith = (dependencies: Record<string, string>) =>
			JSON.stringify({ name: 'installed-nodes', private: true, dependencies }, null, 2);

		beforeEach(() => {
			installedPackageRepository.find.mockResolvedValue([]);
		});

		test('should not recreate package.json if its content is valid', async () => {
			vi.mocked(readFile).mockResolvedValue(
				JSON.stringify({ name: 'installed-nodes', private: true, dependencies: {} }),
			);

			await communityPackagesService.ensurePackageJson();

			expect(readFile).toHaveBeenCalledWith(packageJsonPath, 'utf-8');
			expect(mkdir).not.toHaveBeenCalled();
			expect(writeFile).not.toHaveBeenCalled();
		});

		test('should create package.json if it does not exist, without warning', async () => {
			// A missing ledger is the normal state before the first install, so warning about
			// it would flag every fresh instance's first boot as a failure.
			vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

			await communityPackagesService.ensurePackageJson();

			expect(mkdir).toHaveBeenCalledWith(nodesDownloadDir, { recursive: true });
			expect(writeFile).toHaveBeenCalledWith(packageJsonPath, packageJsonWith({}), 'utf-8');
			expect(logger.warn).not.toHaveBeenCalled();
		});

		test('should recreate package.json if its content is corrupted', async () => {
			vi.mocked(readFile).mockResolvedValue('{ "name": "installed-nodes", "depende');

			await communityPackagesService.ensurePackageJson();

			expect(mkdir).toHaveBeenCalledWith(nodesDownloadDir, { recursive: true });
			expect(writeFile).toHaveBeenCalledWith(packageJsonPath, packageJsonWith({}), 'utf-8');
		});

		test('should warn when the existing package.json cannot be parsed', async () => {
			vi.mocked(readFile).mockResolvedValue('{ "name": "installed-nodes", "depende');

			await communityPackagesService.ensurePackageJson();

			expect(logger.warn).toHaveBeenCalledWith(
				'Community package ledger is unusable, rebuilding it',
			);
		});

		test('should recreate package.json if it parses but has no dependencies', async () => {
			// `{}` parses fine, so it used to be accepted and then throw on the next mutation.
			vi.mocked(readFile).mockResolvedValue('{}');

			await communityPackagesService.ensurePackageJson();

			expect(writeFile).toHaveBeenCalledWith(packageJsonPath, packageJsonWith({}), 'utf-8');
		});

		test('should rebuild dependencies from the database rather than emptying them', async () => {
			// An empty `dependencies` leaves `npm outdated` nothing to compare, so every
			// package silently loses its available-update indicator.
			vi.mocked(readFile).mockResolvedValue('{ "name": "installed-nodes", "depende');
			installedPackageRepository.find.mockResolvedValue([
				mock<InstalledPackages>({ packageName: 'n8n-nodes-a', installedVersion: '1.2.3' }),
				mock<InstalledPackages>({ packageName: 'n8n-nodes-b', installedVersion: '4.5.6' }),
			]);

			await communityPackagesService.ensurePackageJson();

			expect(writeFile).toHaveBeenCalledWith(
				packageJsonPath,
				packageJsonWith({ 'n8n-nodes-a': '1.2.3', 'n8n-nodes-b': '4.5.6' }),
				'utf-8',
			);
		});
	});

	describe('checkForMissingPackages', () => {
		const installedPackage1 = mock<InstalledPackages>({
			packageName: 'package-1',
			installedVersion: '1.0.0',
			installedNodes: [{ type: 'node-type-1' }],
		});
		const installedPackage2 = mock<InstalledPackages>({
			packageName: 'package-2',
			installedVersion: '2.0.0',
			installedNodes: [{ type: 'node-type-2' }],
		});

		beforeEach(() => {
			vi.spyOn(communityPackagesService, 'installPackage').mockResolvedValue(
				{} as InstalledPackages,
			);
			vi.mocked(getCommunityNodeTypes).mockResolvedValue([]);
		});

		test('should not attempt to reinstall when no packages are missing', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(true);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.postProcessLoaders).not.toHaveBeenCalled();
		});

		test('should not reinstall a package that still has one stale node row', async () => {
			// A repair-reinstall leaves node rows from the previous version behind, so a package
			// that dropped a node type keeps a row that never resolves. Reinstalling on that would
			// run on every boot, and contradict the healthy status `withLoadStatus` reports.
			const installedPackage = mock<InstalledPackages>({
				packageName: 'package-1',
				installedVersion: '1.0.0',
				installedNodes: [{ type: 'old-dropped-node' }, { type: 'current-node' }],
			});

			installedPackageRepository.find.mockResolvedValue([installedPackage]);
			loadNodesAndCredentials.isKnownNode.mockImplementation((type) => type === 'current-node');
			config.reinstallMissing = true;

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(logger.warn).not.toHaveBeenCalled();
		});

		test('should identify missing packages without reinstalling when reinstallMissing is false', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockImplementation(
				(nodeType) => nodeType === 'node-type-2',
			);
			config.reinstallMissing = false;

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.postProcessLoaders).not.toHaveBeenCalled();
			expect(logger.warn).toHaveBeenCalled();
		});

		test('should reinstall missing packages when reinstallMissing is true', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				undefined,
			);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
			expect(logger.info).toHaveBeenCalledWith(
				'Packages reinstalled successfully. Resuming regular initialization.',
			);
		});

		test('should log an error for a failed reinstallation', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;
			communityPackagesService.installPackage = vi
				.fn()
				.mockRejectedValue(new Error('Installation failed'));

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				undefined,
			);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to reinstall community package package-1: Installation failed',
			);
		});

		test('should continue reinstalling remaining packages after one fails', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			// First installation fails, second succeeds
			communityPackagesService.installPackage = vi
				.fn()
				.mockRejectedValueOnce(new Error('Installation failed'))
				.mockResolvedValueOnce({} as InstalledPackages);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				undefined,
			);
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-2',
				'2.0.0',
				undefined,
			);
			expect(logger.error).toHaveBeenCalledWith(
				'Failed to reinstall community package package-1: Installation failed',
			);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
		});

		test('should pass checksum from vetted packages when reinstalling', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			vi.mocked(getCommunityNodeTypes).mockResolvedValue([
				{
					packageName: 'package-1',
					checksum: 'sha512-abc123',
					npmVersion: '1.0.0',
				} as never,
			]);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				'sha512-abc123',
			);
		});

		test('should use version-specific checksum from nodeVersions when installed version differs from latest', async () => {
			const installedPackages = [installedPackage1]; // version 1.0.0

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			vi.mocked(getCommunityNodeTypes).mockResolvedValue([
				{
					packageName: 'package-1',
					checksum: 'sha512-latest',
					npmVersion: '2.0.0',
					nodeVersions: [
						{ npmVersion: '1.0.0', checksum: 'sha512-version-specific' },
						{ npmVersion: '2.0.0', checksum: 'sha512-latest' },
					],
				} as never,
			]);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				'sha512-version-specific',
			);
		});

		test('should pass undefined checksum when installed version is not in vetted list', async () => {
			const installedPackages = [installedPackage1]; // version 1.0.0

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			vi.mocked(getCommunityNodeTypes).mockResolvedValue([
				{
					packageName: 'package-1',
					checksum: 'sha512-latest',
					npmVersion: '2.0.0',
					nodeVersions: [{ npmVersion: '2.0.0', checksum: 'sha512-latest' }],
				} as never,
			]);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				undefined,
			);
		});

		test('should pass undefined checksum when package is not in vetted list at all', async () => {
			const installedPackages = [installedPackage1]; // version 1.0.0

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			// getCommunityNodeTypes returns empty array (package not vetted)
			vi.mocked(getCommunityNodeTypes).mockResolvedValue([]);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				undefined,
			);
		});

		test('should handle multiple missing packages with mixed vetted status', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			// Mock getCommunityNodeTypes to return both packages in a single call
			vi.mocked(getCommunityNodeTypes).mockResolvedValueOnce([
				{
					packageName: 'package-1',
					checksum: 'sha512-package1',
					npmVersion: '1.0.0',
				} as never,
				{
					packageName: 'package-2',
					checksum: 'sha512-package2',
					npmVersion: '2.0.0',
				} as never,
			]);

			await communityPackagesService.checkForMissingPackages();

			// Both packages should be installed with their respective checksums
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-1',
				'1.0.0',
				'sha512-package1',
			);
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				'package-2',
				'2.0.0',
				'sha512-package2',
			);
		});

		test('should call getCommunityNodeTypes with correct filters for each package', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			vi.mocked(getCommunityNodeTypes).mockResolvedValue([]);

			await communityPackagesService.checkForMissingPackages();

			expect(getCommunityNodeTypes).toHaveBeenCalledWith(
				'production',
				{
					filters: { packageName: { $in: ['package-1'] } },
					fields: ['packageName', 'npmVersion', 'checksum', 'nodeVersions'],
				},
				config.aiNodeSdkVersion,
			);
		});

		test('should use staging environment when ENVIRONMENT is set to staging', async () => {
			const installedPackages = [installedPackage1];
			const originalEnv = process.env.ENVIRONMENT;

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			vi.mocked(getCommunityNodeTypes).mockResolvedValue([]);

			process.env.ENVIRONMENT = 'staging';

			try {
				await communityPackagesService.checkForMissingPackages();

				expect(getCommunityNodeTypes).toHaveBeenCalledWith(
					'staging',
					{
						filters: { packageName: { $in: ['package-1'] } },
						fields: ['packageName', 'npmVersion', 'checksum', 'nodeVersions'],
					},
					config.aiNodeSdkVersion,
				);
			} finally {
				// Restore original environment
				if (originalEnv === undefined) {
					delete process.env.ENVIRONMENT;
				} else {
					process.env.ENVIRONMENT = originalEnv;
				}
			}
		});
	});

	describe('updatePackageJsonDependency', () => {
		beforeEach(() => {
			vi.clearAllMocks();
			vi.mocked(readFile).mockResolvedValue(JSON.stringify({ dependencies: {} }));
		});

		test('should update package dependencies', async () => {
			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');

			expect(writeFile).toHaveBeenCalledWith(
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify({ dependencies: { 'test-package': '1.0.0' } }, null, 2),
				'utf-8',
			);
		});

		test('should rebuild an unreadable ledger from the database and still apply the mutation', async () => {
			// Without this the mutation throws on the corrupt file, so every install and
			// uninstall stays broken until the process restarts.
			vi.mocked(readFile).mockResolvedValue('{ "dependencies": { "n8n-nodes-a": "1.0.0"');
			installedPackageRepository.find.mockResolvedValue([
				mock<InstalledPackages>({ packageName: 'n8n-nodes-a', installedVersion: '1.0.0' }),
			]);

			const rebuiltPackageJson = JSON.stringify(
				{
					name: 'installed-nodes',
					private: true,
					dependencies: { 'n8n-nodes-a': '1.0.0', 'test-package': '1.0.0' },
				},
				null,
				2,
			);

			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');

			expect(writeFile).toHaveBeenCalledWith(
				path.join(nodesDownloadDir, 'package.json'),
				rebuiltPackageJson,
				'utf-8',
			);
		});
	});

	describe('handleInstallEvent', () => {
		test('should call unloadPackage before loadPackage to handle already-loaded packages', async () => {
			vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));

			const callOrder: string[] = [];
			loadNodesAndCredentials.unloadPackage.mockImplementation(async () => {
				callOrder.push('unloadPackage');
			});
			loadNodesAndCredentials.loadPackage.mockImplementation(async () => {
				callOrder.push('loadPackage');
				return mock<PackageDirectoryLoader>();
			});

			vi.spyOn(communityPackagesService as any, 'downloadPackage').mockResolvedValue(undefined);

			await communityPackagesService.handleInstallEvent({
				packageName: 'n8n-nodes-test',
				packageVersion: '1.0.0',
			});

			expect(callOrder).toEqual(['unloadPackage', 'loadPackage']);
		});

		test('should catch and log the error instead of throwing', async () => {
			vi.spyOn(communityPackagesService as any, 'downloadPackage').mockRejectedValue(
				new Error('npm registry unreachable'),
			);

			await expect(
				communityPackagesService.handleInstallEvent({
					packageName: 'n8n-nodes-test',
					packageVersion: '1.0.0',
				}),
			).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to install community package n8n-nodes-test from pubsub event',
				expect.objectContaining({ packageName: 'n8n-nodes-test', packageVersion: '1.0.0' }),
			);
		});

		test('should skip the download when the on-disk version already matches and the loader is registered', async () => {
			vi.mocked(readFile).mockResolvedValue(JSON.stringify({ version: '1.0.0' }));
			loadNodesAndCredentials.loaders['n8n-nodes-test'] = mock<PackageDirectoryLoader>();

			const downloadPackageSpy = vi
				.spyOn(communityPackagesService as any, 'downloadPackage')
				.mockResolvedValue(undefined);

			await communityPackagesService.handleInstallEvent({
				packageName: 'n8n-nodes-test',
				packageVersion: '1.0.0',
			});

			expect(downloadPackageSpy).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.unloadPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.loadPackage).not.toHaveBeenCalled();
			expect(logger.debug).toHaveBeenCalledWith(
				'Community package n8n-nodes-test already at 1.0.0, skipping',
			);
		});
	});

	describe('handleUninstallEvent', () => {
		test('should catch and log the error instead of throwing', async () => {
			vi.mocked(rm).mockRejectedValue(new Error('EBUSY'));

			await expect(
				communityPackagesService.handleUninstallEvent({ packageName: 'n8n-nodes-test' }),
			).resolves.toBeUndefined();

			expect(logger.error).toHaveBeenCalledWith(
				'Failed to uninstall community package n8n-nodes-test from pubsub event',
				expect.objectContaining({ packageName: 'n8n-nodes-test' }),
			);
		});
	});

	describe('packageMutex', () => {
		beforeEach(() => {
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.loadPackage.mockResolvedValue(mock<PackageDirectoryLoader>());
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
			// No package.json on disk, so the already-installed check doesn't short-circuit.
			vi.mocked(readFile).mockRejectedValue(new Error('ENOENT'));
		});

		test('serializes two overlapping handleInstallEvent calls for different packages', async () => {
			const callOrder: string[] = [];
			let releaseFirst!: () => void;
			const firstGate = new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});

			vi.spyOn(communityPackagesService as any, 'downloadPackage')
				.mockImplementationOnce(async (packageName: string) => {
					callOrder.push(`start:${packageName}`);
					await firstGate;
					callOrder.push(`end:${packageName}`);
					return 'irrelevant-dir';
				})
				.mockImplementationOnce(async (packageName: string) => {
					callOrder.push(`start:${packageName}`);
					callOrder.push(`end:${packageName}`);
					return 'irrelevant-dir';
				});

			const eventA = communityPackagesService.handleInstallEvent({
				packageName: 'pkg-a',
				packageVersion: '1.0.0',
			});
			const eventB = communityPackagesService.handleInstallEvent({
				packageName: 'pkg-b',
				packageVersion: '1.0.0',
			});

			// Only pkg-a's download should have been reached; pkg-b is still waiting on the mutex.
			await vi.waitFor(() => expect(callOrder).toEqual(['start:pkg-a']));

			releaseFirst();
			await Promise.all([eventA, eventB]);

			expect(callOrder).toEqual(['start:pkg-a', 'end:pkg-a', 'start:pkg-b', 'end:pkg-b']);
		});

		test('serializes installPackage against a concurrent handleInstallEvent for a different package', async () => {
			// installPackage() goes through installOrUpdatePackage; handleInstallEvent() goes
			// through installOrUpdateNpmPackage. Proves the SAME mutex serializes across the two
			// different locked methods, not just repeated calls to one of them.
			config.unverifiedEnabled = true;
			const callOrder: string[] = [];
			let releaseFirst!: () => void;
			const firstGate = new Promise<void>((resolve) => {
				releaseFirst = resolve;
			});

			vi.spyOn(communityPackagesService as any, 'downloadPackage')
				.mockImplementationOnce(async (packageName: string) => {
					callOrder.push(`start:${packageName}`);
					await firstGate;
					callOrder.push(`end:${packageName}`);
					return 'irrelevant-dir';
				})
				.mockImplementationOnce(async (packageName: string) => {
					callOrder.push(`start:${packageName}`);
					callOrder.push(`end:${packageName}`);
					return 'irrelevant-dir';
				});

			installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
				mock<InstalledPackages>(),
			);
			loadNodesAndCredentials.loadPackage.mockResolvedValue(
				mock<PackageDirectoryLoader>({ loadedNodes: [{ name: 'n', version: 1 }] }),
			);

			const installCall = communityPackagesService.installPackage('pkg-http');
			const pubsubCall = communityPackagesService.handleInstallEvent({
				packageName: 'pkg-pubsub',
				packageVersion: '1.0.0',
			});

			// Only pkg-http's download should have been reached; pkg-pubsub is still waiting.
			await vi.waitFor(() => expect(callOrder).toEqual(['start:pkg-http']));

			releaseFirst();
			await Promise.all([installCall, pubsubCall]);

			expect(callOrder).toEqual([
				'start:pkg-http',
				'end:pkg-http',
				'start:pkg-pubsub',
				'end:pkg-pubsub',
			]);
		});

		test('does not deadlock when checkForMissingPackages overlaps a pub/sub install for a different package', async () => {
			// Forward-looking safety net, not a reproduction of a live race: the actual boot
			// sequence never lets checkForMissingPackages() overlap a pub/sub handler (traced in
			// worker.ts/webhook.ts/start.ts/base-command.ts). This guards against the lock ever
			// being misplaced one layer too high (e.g. on installPackage/checkForMissingPackages),
			// which would hang forever rather than throw. Promise.all(...) relies on Vitest's
			// default per-test timeout to fail loudly if that regression is ever introduced.
			config.unverifiedEnabled = true;
			config.reinstallMissing = true;
			installedPackageRepository.find.mockResolvedValue([
				mock<InstalledPackages>({
					packageName: 'pkg-missing',
					installedVersion: '1.0.0',
					installedNodes: [{ type: 'node-type-missing' }],
				}),
			]);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			vi.mocked(getCommunityNodeTypes).mockResolvedValue([]);

			vi.spyOn(communityPackagesService as any, 'downloadPackage').mockResolvedValue(
				'irrelevant-dir',
			);
			installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
				mock<InstalledPackages>(),
			);
			loadNodesAndCredentials.loadPackage.mockResolvedValue(
				mock<PackageDirectoryLoader>({ loadedNodes: [{ name: 'n', version: 1 }] }),
			);

			await Promise.all([
				communityPackagesService.checkForMissingPackages(),
				communityPackagesService.handleInstallEvent({
					packageName: 'pkg-other',
					packageVersion: '1.0.0',
				}),
			]);

			expect(installedPackageRepository.saveInstalledPackageWithNodes).toHaveBeenCalled();
			expect(loadNodesAndCredentials.unloadPackage).toHaveBeenCalledWith('pkg-other');
		});

		test('serializes handleUninstallEvent against a concurrent handleInstallEvent for a different package', async () => {
			// removeNpmPackage can't be spied on directly the way downloadPackage is elsewhere in
			// this block — it IS one of the three locked methods, so replacing it wholesale would
			// also replace its `packageMutex(...)` wrapper, running the mock without the lock at
			// all. Gate on `rm` instead, the one async step deletePackageDirectory calls internally.
			const callOrder: string[] = [];
			let releaseRemove!: () => void;
			const removeGate = new Promise<void>((resolve) => {
				releaseRemove = resolve;
			});

			vi.mocked(rm).mockImplementationOnce(async () => {
				callOrder.push('start:remove');
				await removeGate;
				callOrder.push('end:remove');
			});

			vi.spyOn(communityPackagesService as any, 'downloadPackage').mockImplementationOnce(
				async (packageName: string) => {
					callOrder.push(`start:${packageName}`);
					callOrder.push(`end:${packageName}`);
					return 'irrelevant-dir';
				},
			);

			const removeCall = communityPackagesService.handleUninstallEvent({
				packageName: 'pkg-remove',
			});
			const installCall = communityPackagesService.handleInstallEvent({
				packageName: 'pkg-install',
				packageVersion: '1.0.0',
			});

			await Promise.resolve();
			await Promise.resolve();
			expect(callOrder).toEqual(['start:remove']);

			releaseRemove();
			await Promise.all([removeCall, installCall]);

			expect(callOrder).toEqual([
				'start:remove',
				'end:remove',
				'start:pkg-install',
				'end:pkg-install',
			]);
		});
	});
});
