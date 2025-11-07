import type { Logger } from '@n8n/backend-common';
import { mockInstance, randomName } from '@n8n/backend-test-utils';
import { LICENSE_FEATURES } from '@n8n/constants';
import axios from 'axios';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import type { PublicInstalledPackage } from 'n8n-workflow';
import { exec } from 'node:child_process';
import { access, constants, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path, { join } from 'node:path';

import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '@test-integration/constants';
import { mockPackageName, mockPackagePair } from '@test-integration/utils';

import type { CommunityPackagesConfig } from '../community-packages.config';
import { CommunityPackagesService } from '../community-packages.service';
import type { CommunityPackages } from '../community-packages.types';
import { InstalledNodes } from '../installed-nodes.entity';
import { InstalledNodesRepository } from '../installed-nodes.repository';
import { InstalledPackages } from '../installed-packages.entity';
import { InstalledPackagesRepository } from '../installed-packages.repository';

jest.mock('node:fs/promises');
jest.mock('node:child_process');
jest.mock('axios');

type ExecOptions = NonNullable<Parameters<typeof exec>[1]>;
type ExecCallback = NonNullable<Parameters<typeof exec>[2]>;

const execMock = ((...args) => {
	const cb = args[args.length - 1] as ExecCallback;
	cb(null, 'Done', '');
}) as typeof exec;

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

	describe('executeCommand()', () => {
		beforeEach(() => {
			mocked(exec).mockImplementation(execMock);
		});

		test('should call command with valid options', async () => {
			const execMock = ((...args) => {
				const arg = args[1] as ExecOptions;
				expect(arg.cwd).toBeDefined();
				expect(arg.env).toBeDefined();
				// PATH or NODE_PATH may be undefined depending on environment so we don't check for these keys.
				const cb = args[args.length - 1] as ExecCallback;
				cb(null, 'Done', '');
			}) as typeof exec;

			mocked(exec).mockImplementation(execMock);

			await communityPackagesService.executeNpmCommand('ls');

			expect(exec).toHaveBeenCalled();
		});

		test('should make sure folder exists', async () => {
			mocked(exec).mockImplementation(execMock);

			await communityPackagesService.executeNpmCommand('ls');

			expect(exec).toHaveBeenCalled();
		});

		test('should throw especial error when package is not found', async () => {
			const erroringExecMock = ((...args) => {
				const cb = args[args.length - 1] as ExecCallback;
				const msg = `Something went wrong - ${NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR}. Aborting.`;
				cb(new Error(msg), '', '');
			}) as typeof exec;

			mocked(exec).mockImplementation(erroringExecMock);

			const call = async () => await communityPackagesService.executeNpmCommand('ls');

			await expect(call).rejects.toThrowError(RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND);

			expect(exec).toHaveBeenCalled();
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

		const execMockForThisBlock = (command: string, optionsOrCallback: any, callback?: any) => {
			const actualCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
			if (command.startsWith('npm pack') && command.includes(PACKAGE_NAME)) {
				actualCallback(null, { stdout: testBlockTarballName, stderr: '' });
			} else {
				actualCallback(null, 'Done', '');
			}
		};

		beforeEach(() => {
			jest.clearAllMocks();

			mocked(exec).mockImplementation(execMockForThisBlock as typeof exec);

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

			expect(exec).toHaveBeenCalledTimes(3);
			expect(exec).toHaveBeenNthCalledWith(
				1,
				`npm pack ${PACKAGE_NAME}@latest --registry=${testBlockRegistry} --quiet`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				2,
				`tar -xzf ${testBlockTarballName} -C ${testBlockPackageDir} --strip-components=1`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				3,
				`npm install ${testBlockNpmInstallArgs}`,
				{ cwd: testBlockPackageDir },
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

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith('package-1', '1.0.0');
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

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith('package-1', '1.0.0');
			expect(logger.error).toHaveBeenCalledWith('n8n was unable to install the missing packages.');
			expect(communityPackagesService.missingPackages).toEqual(['package-1@1.0.0']);
		});

		test('should handle multiple missing packages and stop reinstalling after first failure', async () => {
			const installedPackages = [installedPackage1, installedPackage2];

			installedPackageRepository.find.mockResolvedValue(installedPackages);
			loadNodesAndCredentials.isKnownNode.mockReturnValue(false);
			config.reinstallMissing = true;

			// First installation succeeds, second fails
			communityPackagesService.installPackage = jest
				.fn()
				.mockResolvedValueOnce({} as InstalledPackages)
				.mockRejectedValueOnce(new Error('Installation failed'));

			await communityPackagesService.checkForMissingPackages();

			expect(communityPackagesService.installPackage).toHaveBeenCalledWith('package-1', '1.0.0');
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith('package-2', '2.0.0');
			expect(logger.error).toHaveBeenCalledWith('n8n was unable to install the missing packages.');
			expect(communityPackagesService.missingPackages).toEqual(['package-2@2.0.0']);
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
});
