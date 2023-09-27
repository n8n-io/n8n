import path from 'path';

import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { Push } from '@/push';
import { CommunityPackageService } from '@/services/communityPackage.service';

import { COMMUNITY_PACKAGE_VERSION } from './shared/constants';
import * as testDb from './shared/testDb';
import {
	mockInstance,
	setupTestServer,
	mockPackage,
	mockNode,
	mockPackageName,
} from './shared/utils';

import type { InstalledPackages } from '@db/entities/InstalledPackages';
import type { InstalledNodes } from '@db/entities/InstalledNodes';
import type { SuperAgentTest } from 'supertest';

const communityPackageService = mockInstance(CommunityPackageService);
const mockLoadNodesAndCredentials = mockInstance(LoadNodesAndCredentials);
mockInstance(Push);

const testServer = setupTestServer({ endpointGroups: ['community-packages'] });

const commonUpdatesProps = {
	createdAt: new Date(),
	updatedAt: new Date(),
	installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
	updateAvailable: COMMUNITY_PACKAGE_VERSION.UPDATED,
};

const parsedNpmPackageName = {
	packageName: 'test',
	rawString: 'test',
};

let authAgent: SuperAgentTest;

beforeAll(async () => {
	const ownerShell = await testDb.createOwner();
	authAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(() => {
	jest.resetAllMocks();
});

describe('GET /community-packages', () => {
	test('should respond 200 if no nodes are installed', async () => {
		communityPackageService.getAllInstalledPackages.mockResolvedValue([]);
		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);

		expect(data).toHaveLength(0);
	});

	test('should return list of one installed package and node', async () => {
		const pkg = mockPackage();
		const node = mockNode(pkg.packageName);
		pkg.installedNodes = [node];
		communityPackageService.getAllInstalledPackages.mockResolvedValue([pkg]);
		communityPackageService.matchPackagesWithUpdates.mockReturnValue([pkg]);

		const {
			body: { data },
		} = await authAgent.get('/community-packages').expect(200);

		expect(data).toHaveLength(1);
		expect(data[0].installedNodes).toHaveLength(1);
	});

	test('should return list of multiple installed packages and nodes', async () => {
		const pkgA = mockPackage();
		const nodeA = mockNode(pkgA.packageName);

		const pkgB = mockPackage();
		const nodeB = mockNode(pkgB.packageName);
		const nodeC = mockNode(pkgB.packageName);

		communityPackageService.getAllInstalledPackages.mockResolvedValue([pkgA, pkgB]);

		communityPackageService.matchPackagesWithUpdates.mockReturnValue([
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

		const allNodes = data.reduce(
			(acc: InstalledNodes[], cur: InstalledPackages) => acc.concat(cur.installedNodes),
			[],
		);

		expect(allNodes).toHaveLength(3);
	});

	test('should not check for updates if no packages installed', async () => {
		await authAgent.get('/community-packages');

		expect(communityPackageService.executeNpmCommand).not.toHaveBeenCalled();
	});

	test('should check for updates if packages installed', async () => {
		communityPackageService.getAllInstalledPackages.mockResolvedValue([mockPackage()]);

		await authAgent.get('/community-packages').expect(200);

		const args = ['npm outdated --json', { doNotHandleError: true }];

		expect(communityPackageService.executeNpmCommand).toHaveBeenCalledWith(...args);
	});

	test('should report package updates if available', async () => {
		const pkg = mockPackage();
		communityPackageService.getAllInstalledPackages.mockResolvedValue([pkg]);

		communityPackageService.executeNpmCommand.mockImplementation(() => {
			throw {
				code: 1,
				stdout: JSON.stringify({
					[pkg.packageName]: {
						current: COMMUNITY_PACKAGE_VERSION.CURRENT,
						wanted: COMMUNITY_PACKAGE_VERSION.CURRENT,
						latest: COMMUNITY_PACKAGE_VERSION.UPDATED,
						location: path.join('node_modules', pkg.packageName),
					},
				}),
			};
		});

		communityPackageService.matchPackagesWithUpdates.mockReturnValue([
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

		expect(returnedPkg.installedVersion).toBe(COMMUNITY_PACKAGE_VERSION.CURRENT);
		expect(returnedPkg.updateAvailable).toBe(COMMUNITY_PACKAGE_VERSION.UPDATED);
	});
});

describe('POST /community-packages', () => {
	test('should reject if package name is missing', async () => {
		await authAgent.post('/community-packages').expect(400);
	});

	test('should reject if package is duplicate', async () => {
		communityPackageService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackageService.isPackageInstalled.mockResolvedValue(true);
		communityPackageService.hasPackageLoaded.mockReturnValue(true);
		communityPackageService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

		const {
			body: { message },
		} = await authAgent.post('/community-packages').send({ name: mockPackageName() }).expect(400);

		expect(message).toContain('already installed');
	});

	test('should allow installing packages that could not be loaded', async () => {
		communityPackageService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackageService.hasPackageLoaded.mockReturnValue(false);
		communityPackageService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
		communityPackageService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		mockLoadNodesAndCredentials.installNpmModule.mockResolvedValue(mockPackage());

		await authAgent.post('/community-packages').send({ name: mockPackageName() }).expect(200);

		expect(communityPackageService.removePackageFromMissingList).toHaveBeenCalled();
	});

	test('should not install a banned package', async () => {
		communityPackageService.checkNpmPackageStatus.mockResolvedValue({ status: 'Banned' });
		communityPackageService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

		const {
			body: { message },
		} = await authAgent.post('/community-packages').send({ name: mockPackageName() }).expect(400);

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
			.query({ name: mockPackageName() })
			.expect(400);

		expect(message).toContain('not installed');
	});

	test('should uninstall package', async () => {
		communityPackageService.findInstalledPackage.mockResolvedValue(mockPackage());

		await authAgent.delete('/community-packages').query({ name: mockPackageName() }).expect(200);

		expect(mockLoadNodesAndCredentials.removeNpmModule).toHaveBeenCalledTimes(1);
	});
});

describe('PATCH /community-packages', () => {
	test('should reject if package name is empty', async () => {
		await authAgent.patch('/community-packages').expect(400);
	});

	test('should reject if package is not installed', async () => {
		const {
			body: { message },
		} = await authAgent.patch('/community-packages').send({ name: mockPackageName() }).expect(400);

		expect(message).toContain('not installed');
	});

	test('should update a package', async () => {
		communityPackageService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackageService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

		await authAgent.patch('/community-packages').send({ name: mockPackageName() });

		expect(mockLoadNodesAndCredentials.updateNpmModule).toHaveBeenCalledTimes(1);
	});
});
