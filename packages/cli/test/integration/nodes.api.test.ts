import { exec } from 'child_process';
import express from 'express';
import * as utils from './shared/utils';
import type { InstalledNodePayload, InstalledPackagePayload } from './shared/types';
import type { Role } from '../../src/databases/entities/Role';
import type { User } from '../../src/databases/entities/User';
import * as testDb from './shared/testDb';

jest.mock('../../src/CommunityNodes/helpers',  () => ({
  matchPackagesWithUpdates: jest.requireActual('../../src/CommunityNodes/helpers').matchPackagesWithUpdates,
	parsePackageName: jest.requireActual('../../src/CommunityNodes/helpers').parsePackageName,
	hasPackageLoadedSuccessfully: jest.fn(),
	searchInstalledPackage: jest.fn(),
  executeCommand: jest.fn(),
	checkPackageStatus: jest.fn(),
	removePackageFromMissingList: jest.fn(),
}));

jest.mock('../../src/CommunityNodes/packageModel',  () => ({
	getAllInstalledPackages: jest.requireActual('../../src/CommunityNodes/packageModel').getAllInstalledPackages,
	removePackageFromDatabase: jest.fn(),
	searchInstalledPackage: jest.fn(),
}));

import { executeCommand, checkPackageStatus, hasPackageLoadedSuccessfully, removePackageFromMissingList } from '../../src/CommunityNodes/helpers';
import { getAllInstalledPackages, searchInstalledPackage, removePackageFromDatabase } from '../../src/CommunityNodes/packageModel';
import { CURRENT_PACKAGE_VERSION, UPDATED_PACKAGE_VERSION } from './shared/constants';
import { installedPackagePayload } from './shared/utils';

jest.mock('../../src/telemetry');

jest.mock('../../src/LoadNodesAndCredentials', () => ({
	LoadNodesAndCredentials: jest.fn(),
}));
import { LoadNodesAndCredentials } from '../../src/LoadNodesAndCredentials';



let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let ownerShell: User;

beforeAll(async () => {
	app = await utils.initTestServer({ endpointGroups: ['nodes'], applyAuth: true });
	const initResult = await testDb.init();
	testDbName = initResult.testDbName;

	utils.initConfigFile();

	globalOwnerRole = await testDb.getGlobalOwnerRole();
	globalMemberRole = await testDb.getGlobalMemberRole();
	ownerShell = await testDb.createUserShell(globalOwnerRole);

	utils.initTestLogger();
	utils.initTestTelemetry();
});

beforeEach(async () => {
	await testDb.truncate(['InstalledNodes', 'InstalledPackages'], testDbName);
	// @ts-ignore
	executeCommand.mockReset();
	// @ts-ignore
	checkPackageStatus.mockReset();
	// @ts-ignore
	searchInstalledPackage.mockReset();
		// @ts-ignore
	hasPackageLoadedSuccessfully.mockReset();
});

afterAll(async () => {
	await testDb.terminate(testDbName);
});

test('GET /nodes should return empty list when no nodes are installed', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	const response = await authOwnerAgent.get('/nodes').send();

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(0);
});

test('GET /nodes should return list with installed package and node', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const installedPackage = await saveMockPackage(installedPackagePayload());
	await saveMockNode(utils.installedNodePayload(installedPackage.packageName));

	const response = await authOwnerAgent.get('/nodes').send();

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(1);
	expect(response.body.data[0].installedNodes).toHaveLength(1);
});

test('GET /nodes should return list with multiple installed package and node', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const installedPackage1 = await saveMockPackage(installedPackagePayload());
	await saveMockNode(utils.installedNodePayload(installedPackage1.packageName));

	const installedPackage2 = await saveMockPackage(installedPackagePayload());
	await saveMockNode(utils.installedNodePayload(installedPackage2.packageName));
	await saveMockNode(utils.installedNodePayload(installedPackage2.packageName));

	const response = await authOwnerAgent.get('/nodes').send();

	expect(response.statusCode).toBe(200);
	expect(response.body.data).toHaveLength(2);
	expect([...response.body.data[0].installedNodes, ...response.body.data[1].installedNodes]).toHaveLength(3);
});

test('GET /nodes should not check for updates when there are no packages installed', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });

	await authOwnerAgent.get('/nodes').send();

	expect(executeCommand).toHaveBeenCalledTimes(0);
});

test('GET /nodes should check for updates when there are packages installed', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const installedPackage = await saveMockPackage(installedPackagePayload());
	await saveMockNode(utils.installedNodePayload(installedPackage.packageName));

	await authOwnerAgent.get('/nodes').send();

	expect(executeCommand).toHaveBeenCalledWith('npm outdated --json', {"doNotHandleError": true});
});

test('GET /nodes should mention updates when available', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const installedPackage = await saveMockPackage(installedPackagePayload());
	await saveMockNode(utils.installedNodePayload(installedPackage.packageName));

	// @ts-ignore
	executeCommand.mockImplementation(() => {
		throw getNpmOutdatedError(installedPackage.packageName);
	});

	const response = await authOwnerAgent.get('/nodes').send();
	expect(response.body.data[0].installedVersion).toBe(CURRENT_PACKAGE_VERSION);
	expect(response.body.data[0].updateAvailable).toBe(UPDATED_PACKAGE_VERSION);
});

// TEST POST ENDPOINT

test('POST /nodes package name should not be empty', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const response = await authOwnerAgent.post('/nodes').send();

	expect(response.statusCode).toBe(400);
});

test('POST /nodes Should not install duplicate packages', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};
	// @ts-ignore
	searchInstalledPackage.mockImplementation(() => {
		return true;
	});
	// @ts-ignore
	hasPackageLoadedSuccessfully.mockImplementation(() => {
		return true;
	});

	const response = await authOwnerAgent.post('/nodes').send(requestBody);
	expect(response.status).toBe(400);
	expect(response.body.message).toContain('already installed');
});

test('POST /nodes Should allow installing packages that could not be loaded', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};
	// @ts-ignore
	searchInstalledPackage.mockImplementation(() => {
		return true;
	});
	// @ts-ignore
	hasPackageLoadedSuccessfully.mockImplementation(() => {
		return false;
	});

	// @ts-ignore
	checkPackageStatus.mockImplementation(() => {
		return {status:'OK'};
	});

	// @ts-ignore
	LoadNodesAndCredentials.mockImplementation(() => {
		return {
			loadNpmModule: () => {
				return {
					installedNodes: [],
				};
			},
		};
	});

	const response = await authOwnerAgent.post('/nodes').send(requestBody);

	expect(removePackageFromMissingList).toHaveBeenCalled();
	expect(response.status).toBe(200);
});

test('POST /nodes package should not install banned package', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const installedPackage = installedPackagePayload();
	const requestBody = {
		name: installedPackage.packageName,
	};

	// @ts-ignore
	checkPackageStatus.mockImplementation(() => {
		return {status:'Banned'};
	});
	const response = await authOwnerAgent.post('/nodes').send(requestBody);
	expect(response.statusCode).toBe(400);
	expect(response.body.message).toContain('banned');
});

// TEST DELETE ENDPOINT
test('DELETE /nodes package name should not be empty', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const response = await authOwnerAgent.delete('/nodes').send();

	expect(response.statusCode).toBe(400);
});

test('DELETE /nodes Should return error when package was not installed', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};

	const response = await authOwnerAgent.delete('/nodes').send(requestBody);
	expect(response.status).toBe(400);
	expect(response.body.message).toContain('not installed');
});

// Useful test ?
test('DELETE /nodes package should be uninstall all conditions are true', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};
	// @ts-ignore
	searchInstalledPackage.mockImplementation(() => {
		return {
			installedNodes: [],
		};
	});

	const removeNpmModuleMock = jest.fn();
	// @ts-ignore
	LoadNodesAndCredentials.mockImplementation(() => {
		return {
			removeNpmModule: removeNpmModuleMock,
		};
	});

	const response = await authOwnerAgent.delete('/nodes').send(requestBody);
	expect(response.statusCode).toBe(200);
	expect(removeNpmModuleMock).toHaveBeenCalledTimes(1);
});

// TEST PATCH ENDPOINT

test('PATCH /nodes package name should not be empty', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const response = await authOwnerAgent.patch('/nodes').send();

	expect(response.statusCode).toBe(400);
});

test('PATCH /nodes Should return error when package was not installed', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};

	const response = await authOwnerAgent.patch('/nodes').send(requestBody);
	expect(response.status).toBe(400);
	expect(response.body.message).toContain('not installed');
});

test('PATCH /nodes package should be updated if all conditions are true', async () => {
	const authOwnerAgent = utils.createAgent(app, { auth: true, user: ownerShell });
	const requestBody = {
		name: installedPackagePayload().packageName,
	};
	// @ts-ignore
	searchInstalledPackage.mockImplementation(() => {
		return {
			installedNodes: [],
		};
	});

	const updatedNpmModuleMock = jest.fn(() => ({
		installedNodes: [],
	}));

	// @ts-ignore
	LoadNodesAndCredentials.mockImplementation(() => {
		return {
			updateNpmModule: updatedNpmModuleMock,
		};
	});

	const response = await authOwnerAgent.patch('/nodes').send(requestBody);
	expect(updatedNpmModuleMock).toHaveBeenCalledTimes(1);
});

async function saveMockPackage(payload: InstalledPackagePayload) {
	return await testDb.saveInstalledPackage(payload);
}

async function saveMockNode(payload: InstalledNodePayload) {
	return await testDb.saveInstalledNode(payload);
}

function getNpmOutdatedError(packageName: string) {
	const errorOutput = new Error('Something went wrong');
	// @ts-ignore
	errorOutput.code = 1;
	// @ts-ignore
	errorOutput.stdout = '{' +
		`"${packageName}": {` +
			`"current": "${CURRENT_PACKAGE_VERSION}",` +
			`"wanted": "${CURRENT_PACKAGE_VERSION}",` +
			`"latest": "${UPDATED_PACKAGE_VERSION}",` +
			`"location": "node_modules/${packageName}"` +
		'}' +
	'}';

	return errorOutput;
}
