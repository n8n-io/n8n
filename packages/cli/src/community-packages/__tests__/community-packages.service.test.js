'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const constants_1 = require('@n8n/constants');
const db_1 = require('@n8n/db');
const axios_1 = __importDefault(require('axios'));
const child_process_1 = require('child_process');
const promises_1 = require('fs/promises');
const jest_mock_1 = require('jest-mock');
const jest_mock_extended_1 = require('jest-mock-extended');
const node_path_1 = require('node:path');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const constants_2 = require('@/constants');
const feature_not_licensed_error_1 = require('@/errors/feature-not-licensed.error');
const constants_3 = require('@test-integration/constants');
const utils_1 = require('@test-integration/utils');
jest.mock('fs/promises');
jest.mock('child_process');
jest.mock('axios');
const execMock = (...args) => {
	const cb = args[args.length - 1];
	cb(null, 'Done', '');
};
describe('CommunityPackagesService', () => {
	const license = (0, jest_mock_extended_1.mock)();
	const config = (0, jest_mock_extended_1.mock)({
		reinstallMissing: false,
		registry: 'some.random.host',
		unverifiedEnabled: true,
	});
	const loadNodesAndCredentials = (0, jest_mock_extended_1.mock)();
	const installedNodesRepository = (0, backend_test_utils_1.mockInstance)(
		db_1.InstalledNodesRepository,
	);
	const installedPackageRepository = (0, backend_test_utils_1.mockInstance)(
		db_1.InstalledPackagesRepository,
	);
	const nodesDownloadDir = '/tmp/n8n-jest-global-downloads';
	const instanceSettings = (0, jest_mock_extended_1.mock)({ nodesDownloadDir });
	const logger = (0, jest_mock_extended_1.mock)();
	const publisher = (0, jest_mock_extended_1.mock)();
	const communityPackagesService = new community_packages_service_1.CommunityPackagesService(
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
		const nodeName = (0, backend_test_utils_1.randomName)();
		installedNodesRepository.create.mockImplementation(() => {
			return Object.assign(new db_1.InstalledNodes(), {
				name: nodeName,
				type: nodeName,
				latestVersion: constants_3.COMMUNITY_NODE_VERSION.CURRENT,
			});
		});
		installedPackageRepository.create.mockImplementation(() => {
			return Object.assign(new db_1.InstalledPackages(), {
				packageName: (0, utils_1.mockPackageName)(),
				installedVersion: constants_3.COMMUNITY_PACKAGE_VERSION.CURRENT,
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
			const name = (0, utils_1.mockPackageName)();
			const parsed = communityPackagesService.parseNpmPackageName(name);
			expect(parsed.rawString).toBe(name);
			expect(parsed.packageName).toBe(name);
			expect(parsed.scope).toBeUndefined();
			expect(parsed.version).toBeUndefined();
		});
		test('should parse valid package name and version', () => {
			const name = (0, utils_1.mockPackageName)();
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
			const name = (0, utils_1.mockPackageName)();
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
			(0, jest_mock_1.mocked)(child_process_1.exec).mockImplementation(execMock);
		});
		test('should call command with valid options', async () => {
			const execMock = (...args) => {
				const arg = args[1];
				expect(arg.cwd).toBeDefined();
				expect(arg.env).toBeDefined();
				const cb = args[args.length - 1];
				cb(null, 'Done', '');
			};
			(0, jest_mock_1.mocked)(child_process_1.exec).mockImplementation(execMock);
			await communityPackagesService.executeNpmCommand('ls');
			expect(child_process_1.exec).toHaveBeenCalled();
		});
		test('should make sure folder exists', async () => {
			(0, jest_mock_1.mocked)(child_process_1.exec).mockImplementation(execMock);
			await communityPackagesService.executeNpmCommand('ls');
			expect(child_process_1.exec).toHaveBeenCalled();
		});
		test('should throw especial error when package is not found', async () => {
			const erroringExecMock = (...args) => {
				const cb = args[args.length - 1];
				const msg = `Something went wrong - ${constants_2.NPM_COMMAND_TOKENS.NPM_PACKAGE_NOT_FOUND_ERROR}. Aborting.`;
				cb(new Error(msg), '', '');
			};
			(0, jest_mock_1.mocked)(child_process_1.exec).mockImplementation(erroringExecMock);
			const call = async () => await communityPackagesService.executeNpmCommand('ls');
			await expect(call).rejects.toThrowError(
				constants_2.RESPONSE_ERROR_MESSAGES.PACKAGE_NOT_FOUND,
			);
			expect(child_process_1.exec).toHaveBeenCalled();
		});
	});
	describe('crossInformationPackage()', () => {
		test('should return same list if availableUpdates is undefined', () => {
			const fakePkgs = (0, utils_1.mockPackagePair)();
			const crossedPkgs = communityPackagesService.matchPackagesWithUpdates(fakePkgs);
			expect(crossedPkgs).toEqual(fakePkgs);
		});
		test('should correctly match update versions for packages', () => {
			const [pkgA, pkgB] = (0, utils_1.mockPackagePair)();
			const updates = {
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
			const [crossedPkgA, crossedPkgB] = communityPackagesService.matchPackagesWithUpdates(
				[pkgA, pkgB],
				updates,
			);
			expect(crossedPkgA.updateAvailable).toBe('0.2.0');
			expect(crossedPkgB.updateAvailable).toBe('0.3.0');
		});
		test('should correctly match update versions for single package', () => {
			const [pkgA, pkgB] = (0, utils_1.mockPackagePair)();
			const updates = {
				[pkgB.packageName]: {
					current: pkgA.installedVersion,
					wanted: pkgA.installedVersion,
					latest: '0.3.0',
					location: pkgA.packageName,
				},
			};
			const [crossedPkgA, crossedPkgB] = communityPackagesService.matchPackagesWithUpdates(
				[pkgA, pkgB],
				updates,
			);
			expect(crossedPkgA.updateAvailable).toBeUndefined();
			expect(crossedPkgB.updateAvailable).toBe('0.3.0');
		});
	});
	describe('matchMissingPackages()', () => {
		test('should not match failed packages that do not exist', () => {
			const fakePkgs = (0, utils_1.mockPackagePair)();
			setMissingPackages([
				`${constants_2.NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
				`${constants_2.NODE_PACKAGE_PREFIX}another-very-long-name-that-never-is-seen`,
			]);
			const matchedPackages = communityPackagesService.matchMissingPackages(fakePkgs);
			expect(matchedPackages).toEqual(fakePkgs);
			const [first, second] = matchedPackages;
			expect(first.failedLoading).toBeUndefined();
			expect(second.failedLoading).toBeUndefined();
		});
		test('should match failed packages that should be present', () => {
			const [pkgA, pkgB] = (0, utils_1.mockPackagePair)();
			setMissingPackages([
				`${constants_2.NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
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
			const [pkgA, pkgB] = (0, utils_1.mockPackagePair)();
			setMissingPackages([
				`${constants_2.NODE_PACKAGE_PREFIX}very-long-name-that-should-never-be-generated@1.0.0`,
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
			await communityPackagesService.checkNpmPackageStatus((0, utils_1.mockPackageName)());
			expect(axios_1.default.post).toHaveBeenCalled();
		});
		test('should not fail if request fails', async () => {
			(0, jest_mock_1.mocked)(axios_1.default.post).mockImplementation(() => {
				throw new Error('Something went wrong');
			});
			const result = await communityPackagesService.checkNpmPackageStatus(
				(0, utils_1.mockPackageName)(),
			);
			expect(result.status).toBe(constants_2.NPM_PACKAGE_STATUS_GOOD);
		});
		test('should warn if package is banned', async () => {
			(0, jest_mock_1.mocked)(axios_1.default.post).mockResolvedValue({
				data: { status: 'Banned', reason: 'Not good' },
			});
			const result = await communityPackagesService.checkNpmPackageStatus(
				(0, utils_1.mockPackageName)(),
			);
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
	const setMissingPackages = (missingPackages) => {
		Object.assign(communityPackagesService, { missingPackages });
	};
	describe('updatePackage', () => {
		const PACKAGE_NAME = 'n8n-nodes-test';
		const installedPackageForUpdateTest = (0, jest_mock_extended_1.mock)({
			packageName: PACKAGE_NAME,
		});
		const packageDirectoryLoader = (0, jest_mock_extended_1.mock)({
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
		const execMockForThisBlock = (command, optionsOrCallback, callback) => {
			const actualCallback = typeof optionsOrCallback === 'function' ? optionsOrCallback : callback;
			if (command.startsWith('npm pack') && command.includes(PACKAGE_NAME)) {
				actualCallback(null, { stdout: testBlockTarballName, stderr: '' });
			} else {
				actualCallback(null, 'Done', '');
			}
		};
		beforeEach(() => {
			jest.clearAllMocks();
			(0, jest_mock_1.mocked)(child_process_1.exec).mockImplementation(execMockForThisBlock);
			(0, jest_mock_1.mocked)(promises_1.readFile).mockResolvedValue(
				JSON.stringify({
					name: PACKAGE_NAME,
					version: '1.0.0',
					dependencies: { 'some-actual-dep': '1.2.3' },
					devDependencies: { 'a-dev-dep': '1.0.0' },
					peerDependencies: { 'a-peer-dep': '2.0.0' },
					optionalDependencies: { 'an-optional-dep': '3.0.0' },
				}),
			);
			(0, jest_mock_1.mocked)(promises_1.writeFile).mockResolvedValue(undefined);
			loadNodesAndCredentials.loadPackage.mockResolvedValue(packageDirectoryLoader);
			loadNodesAndCredentials.unloadPackage.mockResolvedValue(undefined);
			loadNodesAndCredentials.postProcessLoaders.mockResolvedValue(undefined);
			installedPackageRepository.remove.mockResolvedValue(undefined);
			installedPackageRepository.saveInstalledPackageWithNodes.mockResolvedValue(
				installedPackageForUpdateTest,
			);
			publisher.publishCommand.mockResolvedValue(undefined);
		});
		test('should call `exec` with the correct sequence of commands, handle file ops, and interact with services', async () => {
			license.isCustomNpmRegistryEnabled.mockReturnValue(true);
			await communityPackagesService.updatePackage(
				installedPackageForUpdateTest.packageName,
				installedPackageForUpdateTest,
			);
			expect(promises_1.rm).toHaveBeenCalledTimes(2);
			expect(promises_1.rm).toHaveBeenNthCalledWith(1, testBlockPackageDir, {
				recursive: true,
				force: true,
			});
			expect(promises_1.rm).toHaveBeenNthCalledWith(
				2,
				`${nodesDownloadDir}/n8n-nodes-test-latest.tgz`,
			);
			expect(child_process_1.exec).toHaveBeenCalledTimes(3);
			expect(child_process_1.exec).toHaveBeenNthCalledWith(
				1,
				`npm pack ${PACKAGE_NAME}@latest --registry=${testBlockRegistry} --quiet`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);
			expect(child_process_1.exec).toHaveBeenNthCalledWith(
				2,
				`tar -xzf ${testBlockTarballName} -C ${testBlockPackageDir} --strip-components=1`,
				{ cwd: testBlockDownloadDir },
				expect.any(Function),
			);
			expect(child_process_1.exec).toHaveBeenNthCalledWith(
				3,
				`npm install ${testBlockNpmInstallArgs}`,
				{ cwd: testBlockPackageDir },
				expect.any(Function),
			);
			expect(promises_1.mkdir).toHaveBeenCalledWith(testBlockPackageDir, { recursive: true });
			expect(promises_1.readFile).toHaveBeenCalledWith(
				`${testBlockPackageDir}/package.json`,
				'utf-8',
			);
			expect(promises_1.writeFile).toHaveBeenCalledWith(
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
			license.isCustomNpmRegistryEnabled.mockReturnValue(false);
			await expect(
				communityPackagesService.updatePackage(
					installedPackageForUpdateTest.packageName,
					installedPackageForUpdateTest,
				),
			).rejects.toThrow(
				new feature_not_licensed_error_1.FeatureNotLicensedError(
					constants_1.LICENSE_FEATURES.COMMUNITY_NODES_CUSTOM_REGISTRY,
				),
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
		const packageJsonPath = (0, node_path_1.join)(nodesDownloadDir, 'package.json');
		test('should not create package.json if it already exists', async () => {
			(0, jest_mock_1.mocked)(promises_1.access).mockResolvedValue(undefined);
			await communityPackagesService.ensurePackageJson();
			expect(promises_1.access).toHaveBeenCalledWith(packageJsonPath, promises_1.constants.F_OK);
			expect(promises_1.mkdir).not.toHaveBeenCalled();
			expect(promises_1.writeFile).not.toHaveBeenCalled();
		});
		test('should create package.json if it does not exist', async () => {
			(0, jest_mock_1.mocked)(promises_1.access).mockRejectedValue(new Error('ENOENT'));
			await communityPackagesService.ensurePackageJson();
			expect(promises_1.access).toHaveBeenCalledWith(packageJsonPath, promises_1.constants.F_OK);
			expect(promises_1.mkdir).toHaveBeenCalledWith(nodesDownloadDir, { recursive: true });
			expect(promises_1.writeFile).toHaveBeenCalledWith(
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
		const installedPackage1 = (0, jest_mock_extended_1.mock)({
			packageName: 'package-1',
			installedVersion: '1.0.0',
			installedNodes: [{ type: 'node-type-1' }],
		});
		const installedPackage2 = (0, jest_mock_extended_1.mock)({
			packageName: 'package-2',
			installedVersion: '2.0.0',
			installedNodes: [{ type: 'node-type-2' }],
		});
		beforeEach(() => {
			jest.spyOn(communityPackagesService, 'installPackage').mockResolvedValue({});
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
			communityPackagesService.installPackage = jest
				.fn()
				.mockResolvedValueOnce({})
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
			(0, jest_mock_1.mocked)(promises_1.readFile).mockResolvedValue(
				JSON.stringify({ dependencies: {} }),
			);
		});
		test('should update package dependencies', async () => {
			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				`${nodesDownloadDir}/package.json`,
				JSON.stringify({ dependencies: { 'test-package': '1.0.0' } }, null, 2),
				'utf-8',
			);
		});
		test('should create file and update package dependencies', async () => {
			await communityPackagesService.updatePackageJsonDependency('test-package', '1.0.0');
			expect(promises_1.writeFile).toHaveBeenCalledWith(
				`${nodesDownloadDir}/package.json`,
				JSON.stringify({ dependencies: { 'test-package': '1.0.0' } }, null, 2),
				'utf-8',
			);
		});
	});
});
//# sourceMappingURL=community-packages.service.test.js.map
