import path from 'path';
import { mocked } from 'jest-mock';
import type { SuperAgentTest } from 'supertest';
import {
	executeCommand,
	checkNpmPackageStatus,
	hasPackageLoaded,
	removePackageFromMissingList,
	isNpmError,
} from '@/CommunityNodes/helpers';
import { findInstalledPackage, isPackageInstalled } from '@/CommunityNodes/packageModel';
import { LoadNodesAndCredentials } from '@/LoadNodesAndCredentials';
import { InstalledPackages } from '@db/entities/InstalledPackages';
import type { User } from '@db/entities/User';
import type { InstalledNodes } from '@db/entities/InstalledNodes';
import { NodeTypes } from '@/NodeTypes';
import { Push } from '@/push';
import { COMMUNITY_PACKAGE_VERSION } from './shared/constants';
import * as utils from './shared/utils';
import * as testDb from './shared/testDb';

const mockLoadNodesAndCredentials = utils.mockInstance(LoadNodesAndCredentials);
utils.mockInstance(NodeTypes);
utils.mockInstance(Push);

jest.mock('@/CommunityNodes/helpers', () => {
	return {
		...jest.requireActual('@/CommunityNodes/helpers'),
		checkNpmPackageStatus: jest.fn(),
		executeCommand: jest.fn(),
		hasPackageLoaded: jest.fn(),
		isNpmError: jest.fn(),
		removePackageFromMissingList: jest.fn(),
	};
});

jest.mock('@/CommunityNodes/packageModel', () => {
	return {
		...jest.requireActual('@/CommunityNodes/packageModel'),
		isPackageInstalled: jest.fn(),
		findInstalledPackage: jest.fn(),
	};
});

const mockedEmptyPackage = mocked(utils.emptyPackage);

let ownerShell: User;
let authOwnerShellAgent: SuperAgentTest;

beforeAll(async () => {
	const app = await utils.initTestServer({ endpointGroups: ['nodes'] });

	const globalOwnerRole = await testDb.getGlobalOwnerRole();
	ownerShell = await testDb.createUserShell(globalOwnerRole);
	authOwnerShellAgent = utils.createAuthAgent(app)(ownerShell);

	utils.initConfigFile();
});

beforeEach(async () => {
	await testDb.truncate(['InstalledNodes', 'InstalledPackages']);

	mocked(executeCommand).mockReset();
	mocked(findInstalledPackage).mockReset();
});

afterAll(async () => {
	await testDb.terminate();
});

describe('GET /nodes', () => {
	test('should respond 200 if no nodes are installed', async () => {
		const {
			statusCode,
			body: { data },
		} = await authOwnerShellAgent.get('/nodes');

		expect(statusCode).toBe(200);
		expect(data).toHaveLength(0);
	});

	test('should return list of one installed package and node', async () => {
		const { packageName } = await testDb.saveInstalledPackage(utils.installedPackagePayload());
		await testDb.saveInstalledNode(utils.installedNodePayload(packageName));

		const {
			statusCode,
			body: { data },
		} = await authOwnerShellAgent.get('/nodes');

		expect(statusCode).toBe(200);
		expect(data).toHaveLength(1);
		expect(data[0].installedNodes).toHaveLength(1);
	});

	test('should return list of multiple installed packages and nodes', async () => {
		const first = await testDb.saveInstalledPackage(utils.installedPackagePayload());
		await testDb.saveInstalledNode(utils.installedNodePayload(first.packageName));

		const second = await testDb.saveInstalledPackage(utils.installedPackagePayload());
		await testDb.saveInstalledNode(utils.installedNodePayload(second.packageName));
		await testDb.saveInstalledNode(utils.installedNodePayload(second.packageName));

		const {
			statusCode,
			body: { data },
		} = await authOwnerShellAgent.get('/nodes');

		expect(statusCode).toBe(200);
		expect(data).toHaveLength(2);

		const allNodes = data.reduce(
			(acc: InstalledNodes[], cur: InstalledPackages) => acc.concat(cur.installedNodes),
			[],
		);

		expect(allNodes).toHaveLength(3);
	});

	test('should not check for updates if no packages installed', async () => {
		await authOwnerShellAgent.get('/nodes');

		expect(mocked(executeCommand)).toHaveBeenCalledTimes(0);
	});

	test('should check for updates if packages installed', async () => {
		const { packageName } = await testDb.saveInstalledPackage(utils.installedPackagePayload());
		await testDb.saveInstalledNode(utils.installedNodePayload(packageName));

		await authOwnerShellAgent.get('/nodes');

		expect(mocked(executeCommand)).toHaveBeenCalledWith('npm outdated --json', {
			doNotHandleError: true,
		});
	});

	test('should report package updates if available', async () => {
		const { packageName } = await testDb.saveInstalledPackage(utils.installedPackagePayload());
		await testDb.saveInstalledNode(utils.installedNodePayload(packageName));

		mocked(executeCommand).mockImplementationOnce(() => {
			throw {
				code: 1,
				stdout: JSON.stringify({
					[packageName]: {
						current: COMMUNITY_PACKAGE_VERSION.CURRENT,
						wanted: COMMUNITY_PACKAGE_VERSION.CURRENT,
						latest: COMMUNITY_PACKAGE_VERSION.UPDATED,
						location: path.join('node_modules', packageName),
					},
				}),
			};
		});

		mocked(isNpmError).mockReturnValueOnce(true);

		const {
			body: { data },
		} = await authOwnerShellAgent.get('/nodes');

		expect(data[0].installedVersion).toBe(COMMUNITY_PACKAGE_VERSION.CURRENT);
		expect(data[0].updateAvailable).toBe(COMMUNITY_PACKAGE_VERSION.UPDATED);
	});
});

describe('POST /nodes', () => {
	test('should reject if package name is missing', async () => {
		const { statusCode } = await authOwnerShellAgent.post('/nodes');

		expect(statusCode).toBe(400);
	});

	test('should reject if package is duplicate', async () => {
		mocked(findInstalledPackage).mockResolvedValueOnce(new InstalledPackages());
		mocked(isPackageInstalled).mockResolvedValueOnce(true);
		mocked(hasPackageLoaded).mockReturnValueOnce(true);

		const {
			statusCode,
			body: { message },
		} = await authOwnerShellAgent.post('/nodes').send({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(400);
		expect(message).toContain('already installed');
	});

	test('should allow installing packages that could not be loaded', async () => {
		mocked(findInstalledPackage).mockResolvedValueOnce(new InstalledPackages());
		mocked(hasPackageLoaded).mockReturnValueOnce(false);
		mocked(checkNpmPackageStatus).mockResolvedValueOnce({ status: 'OK' });

		mockLoadNodesAndCredentials.loadNpmModule.mockImplementationOnce(mockedEmptyPackage);

		const { statusCode } = await authOwnerShellAgent.post('/nodes').send({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(200);
		expect(mocked(removePackageFromMissingList)).toHaveBeenCalled();
	});

	test('should not install a banned package', async () => {
		mocked(checkNpmPackageStatus).mockResolvedValueOnce({ status: 'Banned' });

		const {
			statusCode,
			body: { message },
		} = await authOwnerShellAgent.post('/nodes').send({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(400);
		expect(message).toContain('banned');
	});
});

describe('DELETE /nodes', () => {
	test('should not delete if package name is empty', async () => {
		const response = await authOwnerShellAgent.delete('/nodes');

		expect(response.statusCode).toBe(400);
	});

	test('should reject if package is not installed', async () => {
		const {
			statusCode,
			body: { message },
		} = await authOwnerShellAgent.delete('/nodes').query({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(400);
		expect(message).toContain('not installed');
	});

	test('should uninstall package', async () => {
		const removeSpy = mockLoadNodesAndCredentials.removeNpmModule.mockImplementationOnce(jest.fn());

		mocked(findInstalledPackage).mockImplementationOnce(mockedEmptyPackage);

		const { statusCode } = await authOwnerShellAgent.delete('/nodes').query({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(200);
		expect(removeSpy).toHaveBeenCalledTimes(1);
	});
});

describe('PATCH /nodes', () => {
	test('should reject if package name is empty', async () => {
		const response = await authOwnerShellAgent.patch('/nodes');

		expect(response.statusCode).toBe(400);
	});

	test('reject if package is not installed', async () => {
		const {
			statusCode,
			body: { message },
		} = await authOwnerShellAgent.patch('/nodes').send({
			name: utils.installedPackagePayload().packageName,
		});

		expect(statusCode).toBe(400);
		expect(message).toContain('not installed');
	});

	test('should update a package', async () => {
		const updateSpy =
			mockLoadNodesAndCredentials.updateNpmModule.mockImplementationOnce(mockedEmptyPackage);

		mocked(findInstalledPackage).mockImplementationOnce(mockedEmptyPackage);

		await authOwnerShellAgent.patch('/nodes').send({
			name: utils.installedPackagePayload().packageName,
		});

		expect(updateSpy).toHaveBeenCalledTimes(1);
	});
});
