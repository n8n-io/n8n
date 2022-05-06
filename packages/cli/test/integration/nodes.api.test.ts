import express from 'express';
import * as utils from './shared/utils';
import type { InstalledNodePayload, InstalledPackagePayload } from './shared/types';
import type { Role } from '../../src/databases/entities/Role';
import type { User } from '../../src/databases/entities/User';
import * as testDb from './shared/testDb';

jest.mock('../../src/CommunityNodes/helpers',  () => ({
  matchPackagesWithUpdates: jest.requireActual('../../src/CommunityNodes/helpers').matchPackagesWithUpdates,
  executeCommand: jest.fn(),
}));
import { executeCommand } from '../../src/CommunityNodes/helpers';
import { CURRENT_PACKAGE_VERSION, UPDATED_PACKAGE_VERSION } from './shared/constants';
import { installedPackagePayload } from './shared/utils';

jest.mock('../../src/telemetry');


let app: express.Application;
let testDbName = '';
let globalOwnerRole: Role;
let globalMemberRole: Role;
let ownerShell: User;

beforeAll(async () => {
	app = utils.initTestServer({
		endpointGroups: ['nodes'],
		applyAuth: true,
	});
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

	expect(executeCommand).toHaveBeenCalledWith('npm outdated --json');
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
