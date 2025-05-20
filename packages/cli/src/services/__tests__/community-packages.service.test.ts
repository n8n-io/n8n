import type { GlobalConfig } from '@n8n/config';
import { LICENSE_FEATURES } from '@n8n/constants';
import { InstalledNodes } from '@n8n/db';
import { InstalledPackages } from '@n8n/db';
import { InstalledNodesRepository } from '@n8n/db';
import { InstalledPackagesRepository } from '@n8n/db';
import axios from 'axios';
import { exec } from 'child_process';
import { mkdir as fsMkdir, readFile, writeFile } from 'fs/promises';
import { mocked } from 'jest-mock';
import { mock } from 'jest-mock-extended';
import type { Logger, InstanceSettings, PackageDirectoryLoader } from 'n8n-core';
import type { PublicInstalledPackage } from 'n8n-workflow';

import {
	NODE_PACKAGE_PREFIX,
	NPM_COMMAND_TOKENS,
	NPM_PACKAGE_STATUS_GOOD,
	RESPONSE_ERROR_MESSAGES,
} from '@/constants';
import { FeatureNotLicensedError } from '@/errors/feature-not-licensed.error';
import type { CommunityPackages } from '@/interfaces';
import type { License } from '@/license';
import type { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import type { Publisher } from '@/scaling/pubsub/publisher.service';
import { CommunityPackagesService } from '@/services/community-packages.service';
import { mockInstance } from '@test/mocking';
import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '@test-integration/constants';
import { randomName } from '@test-integration/random';
import { mockPackageName, mockPackagePair } from '@test-integration/utils';

jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('axios');

type ExecOptions = NonNullable<Parameters<typeof exec>[1]>;
type ExecCallback = NonNullable<Parameters<typeof exec>[2]>;

const execMock = ((...args) => {
	const cb = args[args.length - 1] as ExecCallback;
	cb(null, 'Done', '');
}) as typeof exec;

describe('CommunityPackagesService', () => {
	const license = mock<License>();
	const globalConfig = mock<GlobalConfig>({
		nodes: {
			communityPackages: {
				reinstallMissing: false,
				registry: 'some.random.host',
				unverifiedEnabled: true,
			},
		},
	});
	const loadNodesAndCredentials = mock<LoadNodesAndCredentials>();

	const nodeName = randomName();
	const installedNodesRepository = mockInstance(InstalledNodesRepository);
	installedNodesRepository.create.mockImplementation(() => {
		return Object.assign(new InstalledNodes(), {
			name: nodeName,
			type: nodeName,
			latestVersion: COMMUNITY_NODE_VERSION.CURRENT.toString(),
			packageName: 'test',
		});
	});

	const installedPackageRepository = mockInstance(InstalledPackagesRepository);
	installedPackageRepository.create.mockImplementation(() => {
		return Object.assign(new InstalledPackages(), {
			packageName: mockPackageName(),
			installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
		});
	});

	const instanceSettings = mock<InstanceSettings>({
		nodesDownloadDir: '/tmp/n8n-jest-global-downloads',
	});

	const logger = mock<Logger>();
	const publisher = mock<Publisher>();

	const communityPackagesService = new CommunityPackagesService(
		instanceSettings,
		logger,
		installedPackageRepository,
		loadNodesAndCredentials,
		publisher,
		license,
		globalConfig,
	);

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
			mocked(fsMkdir).mockReset();
			mocked(fsMkdir).mockResolvedValue(undefined);
			mocked(exec).mockReset();
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

			expect(fsMkdir).toHaveBeenCalled();
			expect(exec).toHaveBeenCalled();
		});

		test('should make sure folder exists', async () => {
			mocked(exec).mockImplementation(execMock);

			await communityPackagesService.executeNpmCommand('ls');

			expect(fsMkdir).toHaveBeenCalled();
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

			expect(fsMkdir).toHaveBeenCalled();
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
		const testBlockRegistry = globalConfig.nodes.communityPackages.registry;
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

			mocked(fsMkdir).mockResolvedValue(undefined);
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
			expect(exec).toHaveBeenCalledTimes(5);

			expect(exec).toHaveBeenNthCalledWith(
				1,
				`rm -rf ${testBlockPackageDir}`,
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				2,
				`npm pack ${PACKAGE_NAME}@latest --registry=${testBlockRegistry} --quiet`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				3,
				`tar -xzf ${testBlockTarballName} -C ${testBlockPackageDir} --strip-components=1`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				4,
				`npm install ${testBlockNpmInstallArgs}`,
				{ cwd: testBlockPackageDir },
				expect.any(Function),
			);

			expect(exec).toHaveBeenNthCalledWith(
				5,
				`rm ${testBlockTarballName}`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);

			expect(fsMkdir).toHaveBeenCalledWith(testBlockPackageDir, { recursive: true });
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
			globalConfig.nodes.communityPackages.unverifiedEnabled = false;
			globalConfig.nodes.communityPackages.registry = 'https://registry.npmjs.org';
			await expect(communityPackagesService.installPackage('package', '0.1.0')).rejects.toThrow(
				'Installation of unverified community packages is forbidden!',
			);
		});
	});
});
