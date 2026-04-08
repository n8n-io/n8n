import type { Logger } from '@n8n/backend-common';
import { mockInstance, randomName } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { execFile } from 'node:child_process';
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';

import { NODE_PACKAGE_PREFIX, NPM_PACKAGE_STATUS_GOOD } from '@/constants';
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

jest.mock('node:fs/promises');
jest.mock('node:child_process');
jest.mock('axios');
jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
}));
jest.mock('../npm-utils', () => ({
	...jest.requireActual('../npm-utils'),
	executeNpmCommand: jest.fn(),
}));

type ExecFileCallback = NonNullable<Parameters<typeof execFile>[3]>;

const execMock: typeof execFile = ((...args) => {
	const currentCallback = args[args.length - 1] as ExecFileCallback;
	currentCallback(null, 'Done', '');
}) as typeof execFile;

mocked(execFile).mockImplementation(execMock);

describe('CommunityPackagesService', () => {
	const license = mock<License>();
	const config = mock<CommunityPackagesConfig>({
		reinstallMissing: false,
		registry: 'some.random.host',
		unverifiedEnabled: true,
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();
	const installedNodesRepository = mockInstance(InstalledNodesRepository);
	const installedPackageRepository = mockInstance(InstalledPackagesRepository);

	const nodesDownloadDir = path.join('tmp', 'n8n-jest-global-downloads');
	const instanceSettings = mock<InstanceSettings>({ nodesDownloadDir });

	const logger = mock<Logger>();
	const publisher = mock<Publisher>();

	const communityPackagesService = new CommunityPackagesService(
		instanceSettings,
		logger,
		installedPackageRepository,
		loadNodesAndCredentials,
		publisher,
		license,
		config,
	);

	beforeEach(() => {
		jest.resetAllMocks();
		loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

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

		test.each(['invalid', '1.a.b'])('should fail with invalid version', (version) => {
			expect(() =>
				communityPackagesService.parseNpmPackageName(`n8n-nodes-test@${version}`),
			).toThrow(`Invalid version: ${version}`);
		});

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

	describe('matchMissingPackages()', () => {
		test('should not match failed packages that do not exist', () => {
			const fakePkgs = mockPackagePair();
			setMissingPackages([
				`${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
				`${NODE_PACKAGE_PREFIX}another-very-long-name-that-never-is-seen`,
			]);

			const matchedPackages = communityPackagesService.matchMissingPackages(fakePkgs);

			expect(matchedPackages).toEqual(fakePkgs);

			const [first, second] = matchedPackages;

			expect(first.failedLoading).toBeUndefined();
			expect(second.failedLoading).toBeUndefined();
		});

		test('should match failed packages that should be present', () => {
			const [pkgA, pkgB] = mockPackagePair();
			setMissingPackages([
				`${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
				`${pkgA.packageName}@${pkgA.installedVersion}`,
			]);

			const [matchedPkgA, matchedPkgB] = communityPackagesService.matchMissingPackages([
				pkgA,
				pkgB,
			]);

			expect(matchedPkgA.failedLoading).toBe(true);
			expect(matchedPkgB.failedLoading).toBeUndefined();
		});

		test('should match failed packages even if version is wrong', () => {
			const [pkgA, pkgB] = mockPackagePair();
			setMissingPackages([
				`${NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
				`${pkgA.packageName}@123.456.789`,
			]);
			const [matchedPkgA, matchedPkgB] = communityPackagesService.matchMissingPackages([
				pkgA,
				pkgB,
			]);

			expect(matchedPkgA.failedLoading).toBe(true);
			expect(matchedPkgB.failedLoading).toBeUndefined();
		});
	});

	describe('checkNpmPackageStatus()', () => {
		test('should call axios.post', async () => {
			await communityPackagesService.checkNpmPackageStatus(mockPackageName());

			expect(axios.post).toHaveBeenCalled();
		});

		test('should not fail if request fails', async () => {
			mocked(axios.post).mockImplementation(() => {
				throw new Error('Something went wrong');
			});

			const result = await communityPackagesService.checkNpmPackageStatus(mockPackageName());

			expect(result.status).toBe(NPM_PACKAGE_STATUS_GOOD);
		});

		test('should warn if package is banned', async () => {
			mocked(axios.post).mockResolvedValue({ data: { status: 'Banned', reason: 'Not good' } });

			const result = (await communityPackagesService.checkNpmPackageStatus(
				mockPackageName(),
			)) as CommunityPackages.PackageStatusCheck;

			expect(result.status).toBe('Banned');
			expect(result.reason).toBe('Not good');
		});
	});

	describe('hasPackageLoadedSuccessfully()', () => {
		test('should return true when failed package list does not exist', () => {
			setMissingPackages([]);
			expect(communityPackagesService.hasPackageLoaded('package')).toBe(true);
		});

		test('should return true when package is not in the list of missing packages', () => {
			setMissingPackages(['packageA@0.1.0', 'packageB@0.1.0']);
			expect(communityPackagesService.hasPackageLoaded('packageC')).toBe(true);
		});

		test('should return false when package is in the list of missing packages', () => {
			setMissingPackages(['packageA@0.1.0', 'packageB@0.1.0']);
			expect(communityPackagesService.hasPackageLoaded('packageA')).toBe(false);
		});
	});

	describe('removePackageFromMissingList()', () => {
		test('should do nothing if key does not exist', () => {
			setMissingPackages([]);
			communityPackagesService.removePackageFromMissingList('packageA');

			expect(communityPackagesService.missingPackages).toBeEmptyArray();
		});

		test('should remove only correct package from list', () => {
			setMissingPackages(['packageA@0.1.0', 'packageB@0.2.0', 'packageC@0.2.0']);

			communityPackagesService.removePackageFromMissingList('packageB');

			expect(communityPackagesService.missingPackages).toEqual([
				'packageA@0.1.0',
				'packageC@0.2.0',
			]);
		});

		test('should not remove if package is not in the list', () => {
			const failedToLoadList = ['packageA@0.1.0', 'packageB@0.2.0', 'packageB@0.2.0'];
			setMissingPackages(failedToLoadList);
			communityPackagesService.removePackageFromMissingList('packageC');

			expect(communityPackagesService.missingPackages).toEqual(failedToLoadList);
		});
	});

	const setMissingPackages = (missingPackages: string[]) => {
		Object.assign(communityPackagesService, { missingPackages });
	};

	describe('updatePackage', () => {
		const PACKAGE_NAME = 'n8n-nodes-test';
		const installedPackageForUpdateTest = mock<InstalledPackages>({
			packageName: PACKAGE_NAME,
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
			`--registry=${testBlockRegistry}`,
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
			jest.clearAllMocks();

			mocked(execFile).mockImplementation(execMockForThisBlock);
			mocked(executeNpmCommand).mockImplementation(async (args: string[]) => {
				if (args[0] === 'pack') {
					return testBlockTarballName;
				}
				return 'Done';
			});

			mocked(readFile).mockResolvedValue(
				JSON.stringify({
					name: PACKAGE_NAME,
					version: '1.0.0', // Mocked version from package.json inside tarball
					dependencies: { 'some-actual-dep': '1.2.3' },
					devDependencies: { 'a-dev-dep': '1.0.0' },
					peerDependencies: { 'a-peer-dep': '2.0.0' },
					optionalDependencies: { 'an-optional-dep': '3.0.0' },
				}),
			);
			mocked(writeFile).mockResolvedValue(undefined);

			loadNodesAndCredentials.loadPackage.mockResolvedValue(packageDirectoryLoader);
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);

			installedPackageRepository.remove.mockResolvedValue(undefined as any);
			installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
				installedPackageForUpdateTest,
			);

			publisher.publishCommand.mockResolvedValue(undefined);
		});

		test('should call `exec` with the correct sequence of commands, handle file ops, and interact with services', async () => {
			// ARRANGE
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);

			// ACT
			await communityPackagesService.updatePackage(
				installedPackageForUpdateTest.packageName,
				installedPackageForUpdateTest,
			);

			// ASSERT:
			expect(rm).toHaveBeenCalledTimes(2);
			expect(rm).toHaveBeenNthCalledWith(1, testBlockPackageDir, { recursive: true, force: true });
			expect(rm).toHaveBeenNthCalledWith(
				2,
				path.join(nodesDownloadDir, 'n8n-nodes-test-latest.tgz'),
			);

			// Check executeNpmCommand was called for npm commands
			expect(executeNpmCommand).toHaveBeenCalledTimes(2);
			expect(executeNpmCommand).toHaveBeenNthCalledWith(
				1,
				['pack', `${PACKAGE_NAME}@latest`, `--registry=${testBlockRegistry}`, '--quiet'],
				{ cwd: testBlockDownloadDir },
			);

			expect(executeNpmCommand).toHaveBeenNthCalledWith(
				2,
				['install', ...testBlockNpmInstallArgs.split(' ')],
				{ cwd: testBlockPackageDir },
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

			expect(installedPackageRepository.remove).toHaveBeenCalledWith(installedPackageForUpdateTest);
			expect(installedPackageRepository.saveInstalledPackageWithNodes).toHaveBeenCalledWith(
				packageDirectoryLoader,
			);

			expect(publisher.publishCommand).toHaveBeenCalledWith({
				command: 'community-package-update',
				payload: { packageName: PACKAGE_NAME, packageVersion: 'latest' },
			});
		});

		test('should throw when not licensed for custom registry if custom registry is different from default', async () => {
			// ARRANGE
			license.isCustomNpmRegistryEnabled.mockReturnValue(false);

			// ACT & ASSERT
			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow(
				new FeatureNotLicensedError(LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY),
			);
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

	describe('ensurePackageJson', () => {
		const packageJsonPath = join(nodesDownloadDir, 'package.json');

		test('should not create package.json if it already exists', async () => {
			mocked(access).mockResolvedValue(undefined);

			await communityPackagesService.ensurePackageJson();

			expect(access).toHaveBeenCalledWith(packageJsonPath, constants.F_OK);
			expect(mkdir).not.toHaveBeenCalled();
			expect(writeFile).not.toHaveBeenCalled();
		});

		test('should create package.json if it does not exist', async () => {
			mocked(access).mockRejectedValue(new Error('ENOENT'));

			await communityPackagesService.ensurePackageJson();

			expect(access).toHaveBeenCalledWith(packageJsonPath, constants.F_OK);
			expect(mkdir).toHaveBeenCalledWith(nodesDownloadDir, { recursive: true });
			expect(writeFile).toHaveBeenCalledWith(
				packageJsonPath,
				JSON.stringify(
					{
						name: 'installed-nodes',
						private: true,
						dependencies: {},
					},
					null,
					2,
				),
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
			jest
				.spyOn(communityPackagesService, 'installPackage')
				.mockResolvedValue({} as InstalledPackages);
			mocked(getCommunityNodeTypes).mockResolvedValue([]);
		});

		test('should set missingPackages to empty array when no packages are missing', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(true);

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.missingPackages).toEqual([]);
			expect(communityPackagesService.installPackage).not.toHaveBeenCalled();
			expect(loadNodesAndCredentials.postProcessLoaders).not.toHaveBeenCalled();
		});

		test('should identify missing packages without reinstalling when reinstallMissing is false', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockImplementation(
				(nodeType) => nodeType === 'node-type-2',
			);
			config.reinstallMissing = false;

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.missingPackages).toEqual(['package-1@1.0.0']);
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
			expect(communityPackagesService.missingPackages).toEqual([]);
			expect(logger.info).toHaveBeenCalledWith(
				'Packages reinstalled successfully. Resuming regular initialization.',
			);
		});

		test('should handle failed reinstallations and record missing packages', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;
			communityPackagesService.installPackage = jest
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
			expect(communityPackagesService.missingPackages).toEqual(['package-1@1.0.0']);
		});

		test('should continue reinstalling remaining packages after one fails', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			// First installation fails, second succeeds
			communityPackagesService.installPackage = jest
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
			// Only package-1 should be in missingPackages since package-2 succeeded
			expect(communityPackagesService.missingPackages).toEqual(['package-1@1.0.0']);
			expect(loadNodesAndCredentials.postProcessLoaders).toHaveBeenCalled();
		});

		test('should pass checksum from vetted packages when reinstalling', async () => {
			const installedPackages = [installedPackage1];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			mocked(getCommunityNodeTypes).mockResolvedValue([
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

			mocked(getCommunityNodeTypes).mockResolvedValue([
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

			mocked(getCommunityNodeTypes).mockResolvedValue([
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
			mocked(getCommunityNodeTypes).mockResolvedValue([]);

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
			mocked(getCommunityNodeTypes).mockResolvedValueOnce([
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

			mocked(getCommunityNodeTypes).mockResolvedValue([]);

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

			mocked(getCommunityNodeTypes).mockResolvedValue([]);

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
			jest.clearAllMocks();
			mocked(readFile).mockResolvedValue(JSON.stringify({ dependencies: {} }));
		});

		test('should update package dependencies', async () => {
			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');

			expect(writeFile).toHaveBeenCalledWith(
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify({ dependencies: { 'test-package': '1.0.0' } }, null, 2),
				'utf-8',
			);
		});

		test('should create file and update package dependencies', async () => {
			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');

			expect(writeFile).toHaveBeenCalledWith(
				path.join(nodesDownloadDir, 'package.json'),
				JSON.stringify({ dependencies: { 'test-package': '1.0.0' } }, null, 2),
				'utf-8',
			);
		});
	});

	describe('handleInstallEvent', () => {
		test('should call unloadPackage before loadPackage to handle already-loaded packages', async () => {
			const callOrder: string[] = [];
			loadNodesAndCredentials.unloadPackage.mockImplementation(async () => {
				callOrder.push('unloadPackage');
			});
			loadNodesAndCredentials.loadPackage.mockImplementation(async () => {
				callOrder.push('loadPackage');
				return mock<PackageDirectoryLoader>();
			});

			jest.spyOn(communityPackagesService as any, 'downloadPackage').mockResolvedValue(undefined);

			await communityPackagesService.handleInstallEvent({
				packageName: 'n8n-nodes-test',
				packageVersion: '1.0.0',
			});

			expect(callOrder).toEqual(['unloadPackage', 'loadPackage']);
		});
	});
});
