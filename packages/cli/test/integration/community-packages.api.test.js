'use strict';
var __importDefault =
	(this && this.__importDefault) ||
	function (mod) {
		return mod && mod.__esModule ? mod : { default: mod };
	};
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const path_1 = __importDefault(require('path'));
const load_nodes_and_credentials_1 = require('@/load-nodes-and-credentials');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const constants_1 = require('./shared/constants');
const users_1 = require('./shared/db/users');
const utils_1 = require('./shared/utils');
const communityPackagesService = (0, backend_test_utils_1.mockInstance)(
	community_packages_service_1.CommunityPackagesService,
	{
		hasMissingPackages: false,
	},
);
(0, backend_test_utils_1.mockInstance)(load_nodes_and_credentials_1.LoadNodesAndCredentials);
const testServer = (0, utils_1.setupTestServer)({ endpointGroups: ['community-packages'] });
const commonUpdatesProps = {
	createdAt: new Date(),
	updatedAt: new Date(),
	installedVersion: constants_1.COMMUNITY_PACKAGE_VERSION.CURRENT,
	updateAvailable: constants_1.COMMUNITY_PACKAGE_VERSION.UPDATED,
};
const parsedNpmPackageName = {
	packageName: 'test',
	rawString: 'test',
};
let authAgent;
beforeAll(async () => {
	const ownerShell = await (0, users_1.createOwner)();
	authAgent = testServer.authAgentFor(ownerShell);
});
beforeEach(() => {
	jest.resetAllMocks();
});
describe('GET /community-packages', () => {
	test('should respond 200 if no nodes are installed', async () => {
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([]);
		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);
		expect(data).toHaveLength(0);
	});
	test('should return list of one installed package and node', async () => {
		const pkg = (0, utils_1.mockPackage)();
		const node = (0, utils_1.mockNode)(pkg.packageName);
		pkg.installedNodes = [node];
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkg]);
		communityPackagesService.matchPackagesWithUpdates.mockReturnValue([pkg]);
		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);
		expect(data).toHaveLength(1);
		expect(data[0].installedNodes).toHaveLength(1);
	});
	test('should return list of multiple installed packages and nodes', async () => {
		const pkgA = (0, utils_1.mockPackage)();
		const nodeA = (0, utils_1.mockNode)(pkgA.packageName);
		const pkgB = (0, utils_1.mockPackage)();
		const nodeB = (0, utils_1.mockNode)(pkgB.packageName);
		const nodeC = (0, utils_1.mockNode)(pkgB.packageName);
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkgA, pkgB]);
		communityPackagesService.matchPackagesWithUpdates.mockReturnValue([
			{
				...commonUpdatesProps,
				packageName: pkgA.packageName,
				installedNodes: [nodeA],
			},
			{
				...commonUpdatesProps,
				packageName: pkgB.packageName,
				installedNodes: [nodeB, nodeC],
			},
		]);
		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);
		expect(data).toHaveLength(2);
		const allNodes = data.reduce((acc, cur) => acc.concat(cur.installedNodes), []);
		expect(allNodes).toHaveLength(3);
	});
	test('should not check for updates if no packages installed', async () => {
		await authAgent.get('/community-packages');
		expect(communityPackagesService.executeNpmCommand).not.toHaveBeenCalled();
	});
	test('should check for updates if packages installed', async () => {
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([
			(0, utils_1.mockPackage)(),
		]);
		await authAgent.get('/community-packages').expect(200);
		const args = ['npm outdated --json', { doNotHandleError: true }];
		expect(communityPackagesService.executeNpmCommand).toHaveBeenCalledWith(...args);
	});
	test('should report package updates if available', async () => {
		const pkg = (0, utils_1.mockPackage)();
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkg]);
		communityPackagesService.executeNpmCommand.mockImplementation(() => {
			throw {
				code: 1,
				stdout: JSON.stringify({
					[pkg.packageName]: {
						current: constants_1.COMMUNITY_PACKAGE_VERSION.CURRENT,
						wanted: constants_1.COMMUNITY_PACKAGE_VERSION.CURRENT,
						latest: constants_1.COMMUNITY_PACKAGE_VERSION.UPDATED,
						location: path_1.default.join('node_modules', pkg.packageName),
					},
				}),
			};
		});
		communityPackagesService.matchPackagesWithUpdates.mockReturnValue([
			{
				packageName: 'test',
				installedNodes: [],
				...commonUpdatesProps,
			},
		]);
		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);
		const [returnedPkg] = data;
		expect(returnedPkg.installedVersion).toBe(constants_1.COMMUNITY_PACKAGE_VERSION.CURRENT);
		expect(returnedPkg.updateAvailable).toBe(constants_1.COMMUNITY_PACKAGE_VERSION.UPDATED);
	});
});
describe('POST /community-packages', () => {
	test('should reject if package name is missing', async () => {
		await authAgent.post('/community-packages').expect(400);
	});
	test('should reject if package is duplicate', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue((0, utils_1.mockPackage)());
		communityPackagesService.isPackageInstalled.mockResolvedValue(true);
		communityPackagesService.hasPackageLoaded.mockReturnValue(true);
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		const {
			body: { message },
		} = await authAgent
			.post('/community-packages')
			.send({ name: (0, utils_1.mockPackageName)() })
			.expect(400);
		expect(message).toContain('already installed');
	});
	test('should allow installing packages that could not be loaded', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue((0, utils_1.mockPackage)());
		communityPackagesService.hasPackageLoaded.mockReturnValue(false);
		communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		communityPackagesService.installPackage.mockResolvedValue((0, utils_1.mockPackage)());
		await authAgent
			.post('/community-packages')
			.send({ name: (0, utils_1.mockPackageName)() })
			.expect(200);
		expect(communityPackagesService.removePackageFromMissingList).toHaveBeenCalled();
	});
	test('should not install a banned package', async () => {
		communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'Banned' });
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		const {
			body: { message },
		} = await authAgent
			.post('/community-packages')
			.send({ name: (0, utils_1.mockPackageName)() })
			.expect(400);
		expect(message).toContain('banned');
	});
});
describe('DELETE /community-packages', () => {
	test('should not delete if package name is empty', async () => {
		await authAgent.delete('/community-packages').expect(400);
	});
	test('should reject if package is not installed', async () => {
		const {
			body: { message },
		} = await authAgent
			.delete('/community-packages')
			.query({ name: (0, utils_1.mockPackageName)() })
			.expect(400);
		expect(message).toContain('not installed');
	});
	test('should uninstall package', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue((0, utils_1.mockPackage)());
		await authAgent
			.delete('/community-packages')
			.query({ name: (0, utils_1.mockPackageName)() })
			.expect(200);
		expect(communityPackagesService.removePackage).toHaveBeenCalledTimes(1);
	});
});
describe('PATCH /community-packages', () => {
	test('should reject if package name is empty', async () => {
		await authAgent.patch('/community-packages').expect(400);
	});
	test('should reject if package is not installed', async () => {
		const {
			body: { message },
		} = await authAgent
			.patch('/community-packages')
			.send({ name: (0, utils_1.mockPackageName)() })
			.expect(400);
		expect(message).toContain('not installed');
	});
	test('should update a package', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue((0, utils_1.mockPackage)());
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		await authAgent.patch('/community-packages').send({ name: (0, utils_1.mockPackageName)() });
		expect(communityPackagesService.updatePackage).toHaveBeenCalledTimes(1);
	});
});
//# sourceMappingURL=community-packages.api.test.js.map
