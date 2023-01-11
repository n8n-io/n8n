import path from 'path';

import express from 'express';
import { mocked } from 'jest-mock';

import * as utils from './shared/utils';
import * as testDb from './shared/testDb';
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

import type { Role } from '@db/entities/Role';
import type { AuthAgent } from './shared/types';
import type { InstalledNodes } from '@db/entities/InstalledNodes';
import { COMMUNITY_PACKAGE_VERSION } from './shared/constants';

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

let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let authAgent: AuthAgent;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['nodes'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	globalOwnerRole = await testDb.getGlobalOwnerRole();

	authAgent = utils.createAuthAgent(app);

	utils.initConfigFile();
	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['InstalledNodes', 'InstalledPackages', 'User'], testDbName);

	mocked(executeCommand).mockReset();
	mocked(findInstalledPackage).mockReset();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

/**
 * GET /nodes
 */

test('GET /nodes should respond 200 if no nodes are installed', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const {
		statusCode,
		body: { data },
	} = await authAgent(ownerShell).get('/nodes');

	expect(statusCode).toBe(200);
	expect(data).toHaveLength(0);
});

test('GET /nodes should return list of one installed package and node', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const { packageName } = await testDb.saveInstalledPackage(utils.installedPackagePayload());
	await testDb.saveInstalledNode(utils.installedNodePayload(packageName));

	const {
		statusCode,
		body: { data },
	} = await authAgent(ownerShell).get('/nodes');

	expect(statusCode).toBe(200);
	expect(data).toHaveLength(1);
	expect(data[0].installedNodes).toHaveLength(1);
});

test('GET /nodes should return list of multiple installed packages and nodes', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const first = await testDb.saveInstalledPackage(utils.installedPackagePayload());
	await testDb.saveInstalledNode(utils.installedNodePayload(first.packageName));

	const second = await testDb.saveInstalledPackage(utils.installedPackagePayload());
	await testDb.saveInstalledNode(utils.installedNodePayload(second.packageName));
	await testDb.saveInstalledNode(utils.installedNodePayload(second.packageName));

	const {
		statusCode,
		body: { data },
	} = await authAgent(ownerShell).get('/nodes');

	expect(statusCode).toBe(200);
	expect(data).toHaveLength(2);

	const allNodes = data.reduce(
		(acc: InstalledNodes[], cur: InstalledPackages) => acc.concat(cur.installedNodes),
		[],
	);

	expect(allNodes).toHaveLength(3);
});

test('GET /nodes should not check for updates if no packages installed', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	await authAgent(ownerShell).get('/nodes');

	expect(mocked(executeCommand)).toHaveBeenCalledTimes(0);
});

test('GET /nodes should check for updates if packages installed', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const { packageName } = await testDb.saveInstalledPackage(utils.installedPackagePayload());
	await testDb.saveInstalledNode(utils.installedNodePayload(packageName));

	await authAgent(ownerShell).get('/nodes');

	expect(mocked(executeCommand)).toHaveBeenCalledWith('npm outdated --json', {
		doNotHandleError: true,
	});
});

test('GET /nodes should report package updates if available', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

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
	} = await authAgent(ownerShell).get('/nodes');

	expect(data[0].installedVersion).toBe(COMMUNITY_PACKAGE_VERSION.CURRENT);
	expect(data[0].updateAvailable).toBe(COMMUNITY_PACKAGE_VERSION.UPDATED);
});

/**
 * POST /nodes
 */

test('POST /nodes should reject if package name is missing', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const { statusCode } = await authAgent(ownerShell).post('/nodes');

	expect(statusCode).toBe(400);
});

test('POST /nodes should reject if package is duplicate', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	mocked(findInstalledPackage).mockResolvedValueOnce(new InstalledPackages());
	mocked(isPackageInstalled).mockResolvedValueOnce(true);
	mocked(hasPackageLoaded).mockReturnValueOnce(true);

	const {
		statusCode,
		body: { message },
	} = await authAgent(ownerShell).post('/nodes').send({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(400);
	expect(message).toContain('already installed');
});

test('POST /nodes should allow installing packages that could not be loaded', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	mocked(findInstalledPackage).mockResolvedValueOnce(new InstalledPackages());
	mocked(hasPackageLoaded).mockReturnValueOnce(false);
	mocked(checkNpmPackageStatus).mockResolvedValueOnce({ status: 'OK' });

	jest.spyOn(LoadNodesAndCredentials(), 'loadNpmModule').mockImplementationOnce(mockedEmptyPackage);

	const { statusCode } = await authAgent(ownerShell).post('/nodes').send({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(200);
	expect(mocked(removePackageFromMissingList)).toHaveBeenCalled();
});

test('POST /nodes should not install a banned package', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);
	mocked(checkNpmPackageStatus).mockResolvedValueOnce({ status: 'Banned' });

	const {
		statusCode,
		body: { message },
	} = await authAgent(ownerShell).post('/nodes').send({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(400);
	expect(message).toContain('banned');
});

/**
 * DELETE /nodes
 */

test('DELETE /nodes should not delete if package name is empty', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).delete('/nodes');

	expect(response.statusCode).toBe(400);
});

test('DELETE /nodes should reject if package is not installed', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const {
		statusCode,
		body: { message },
	} = await authAgent(ownerShell).delete('/nodes').query({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(400);
	expect(message).toContain('not installed');
});

test('DELETE /nodes should uninstall package', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const removeSpy = jest
		.spyOn(LoadNodesAndCredentials(), 'removeNpmModule')
		.mockImplementationOnce(jest.fn());

	mocked(findInstalledPackage).mockImplementationOnce(mockedEmptyPackage);

	const { statusCode } = await authAgent(ownerShell).delete('/nodes').query({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(200);
	expect(removeSpy).toHaveBeenCalledTimes(1);
});

/**
 * PATCH /nodes
 */

test('PATCH /nodes should reject if package name is empty', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const response = await authAgent(ownerShell).patch('/nodes');

	expect(response.statusCode).toBe(400);
});

test('PATCH /nodes reject if package is not installed', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const {
		statusCode,
		body: { message },
	} = await authAgent(ownerShell).patch('/nodes').send({
		name: utils.installedPackagePayload().packageName,
	});

	expect(statusCode).toBe(400);
	expect(message).toContain('not installed');
});

test('PATCH /nodes should update a package', async () => {
	const ownerShell = await testDb.createUserShell(globalOwnerRole);

	const updateSpy = jest
		.spyOn(LoadNodesAndCredentials(), 'updateNpmModule')
		.mockImplementationOnce(mockedEmptyPackage);

	mocked(findInstalledPackage).mockImplementationOnce(mockedEmptyPackage);

	await authAgent(ownerShell).patch('/nodes').send({
		name: utils.installedPackagePayload().packageName,
	});

	expect(updateSpy).toHaveBeenCalledTimes(1);
});
