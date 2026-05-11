jest.mock('@/modules/community-packages/npm-utils', () => ({
	...jest.requireActual('@/modules/community-packages/npm-utils'),
	executeNpmCommand: jest.fn(),
	verifyIntegrity: jest.fn(),
}));

import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { CommunityNodeType } from '@n8n/api-types';
import type { User } from '@n8n/db';
import type { ApiKeyScope } from '@n8n/permissions';
import { OWNER_API_KEY_SCOPES } from '@n8n/permissions';
import { mock } from 'jest-mock-extended';
import path from 'node:path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { executeNpmCommand } from '@/modules/community-packages/npm-utils';

import { COMMUNITY_PACKAGE_VERSION } from '../shared/constants';
import { addApiKey, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';
import { mockPackage, mockPackageName } from '../shared/utils/community-nodes';

const COMMUNITY_PACKAGE_API_SCOPES: ApiKeyScope[] = [
	'communityPackage:install',
	'communityPackage:list',
	'communityPackage:update',
	'communityPackage:uninstall',
];

const communityPackagesService = mockInstance(CommunityPackagesService, {
	missingPackages: [],
	hasMissingPackages: false,
});
const communityNodeTypesService = mockInstance(CommunityNodeTypesService);
const mockedExecuteNpmCommand = jest.mocked(executeNpmCommand);
mockInstance(LoadNodesAndCredentials);

const mockedVettedPackage = mock<CommunityNodeType>({
	checksum: 'test-checksum',
	npmVersion: COMMUNITY_PACKAGE_VERSION.UPDATED,
	nodeVersions: [],
});

const testServer = setupTestServer({
	endpointGroups: ['publicApi'],
	modules: ['community-packages'],
});

const parsedNpmPackageName = {
	packageName: 'test',
	rawString: 'description',
};

let owner: User;

describe('Community packages (Public API)', () => {
	beforeAll(async () => {
		await testDb.init();
	});

	beforeEach(async () => {
		jest.resetAllMocks();
		communityNodeTypesService.findVetted.mockResolvedValue(mockedVettedPackage);
		await testDb.truncate(['User']);
		const ownerUser = await createOwner();
		const scopes = [
			...new Set([...OWNER_API_KEY_SCOPES, ...COMMUNITY_PACKAGE_API_SCOPES]),
		] as ApiKeyScope[];
		const apiKey = await addApiKey(ownerUser, { scopes });
		ownerUser.apiKeys = [apiKey];
		owner = ownerUser;
	});

	describe('GET /community-packages', () => {
		it('should return 401 without API key', async () => {
			const response = await testServer.publicApiAgentWithoutApiKey().get('/community-packages');
			expect(response.status).toBe(401);
		});

		it('should return 403 when API key lacks communityPackage:list scope', async () => {
			const userWithoutCommunityScopes = await createOwner();
			const apiKey = await addApiKey(userWithoutCommunityScopes, {
				scopes: [...OWNER_API_KEY_SCOPES],
			});
			userWithoutCommunityScopes.apiKeys = [apiKey];

			const response = await testServer
				.publicApiAgentFor(userWithoutCommunityScopes)
				.get('/community-packages');

			expect(response.status).toBe(403);
			expect(response.body).toEqual({ message: 'Forbidden' });
		});

		it('should return an empty list when no packages are installed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([]);

			const response = await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(response.status).toBe(200);
			expect(response.body).toEqual([]);
			expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
		});

		it('should return installed packages when present', async () => {
			const pkg = mockPackage();
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkg]);
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([pkg]);

			const response = await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(response.status).toBe(200);
			expect(response.body).toHaveLength(1);
			expect(response.body[0].packageName).toBe(pkg.packageName);
		});

		it('should run npm outdated when packages exist', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([mockPackage()]);
			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([]);

			await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(mockedExecuteNpmCommand).toHaveBeenCalledWith(
				['outdated', '--json'],
				expect.objectContaining({ doNotHandleError: true, cwd: expect.any(String) }),
			);
		});

		it('should return packages with updateAvailable when outdated', async () => {
			const pkg = mockPackage();
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkg]);

			mockedExecuteNpmCommand.mockImplementation(() => {
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

			communityPackagesService.matchPackagesWithUpdates.mockReturnValue([
				{
					...pkg,
					updateAvailable: COMMUNITY_PACKAGE_VERSION.UPDATED,
				},
			]);

			const response = await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(response.status).toBe(200);
			expect(response.body[0].updateAvailable).toBe(COMMUNITY_PACKAGE_VERSION.UPDATED);
		});
	});

	describe('POST /community-packages', () => {
		it('should return 400 when package name is missing', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBeDefined();
		});

		it('should return 400 when package is already installed and loaded', async () => {
			communityPackagesService.isPackageInstalled.mockResolvedValue(true);
			communityPackagesService.hasPackageLoaded.mockReturnValue(true);
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('already installed');
		});

		it('should return 200 when package is installed successfully', async () => {
			const pkg = mockPackage();
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
			communityPackagesService.isPackageInstalled.mockResolvedValue(false);
			communityPackagesService.hasPackageLoaded.mockReturnValue(true);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
			communityPackagesService.installPackage.mockResolvedValue(pkg);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(200);
			expect(response.body.packageName).toBe(pkg.packageName);
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				parsedNpmPackageName.packageName,
				undefined,
				mockedVettedPackage.checksum,
			);
		});

		it('should return 400 when package is not vetted', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('not vetted');
		});

		it('should return 400 when package is banned', async () => {
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'Banned' });
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
			communityPackagesService.isPackageInstalled.mockResolvedValue(false);
			communityPackagesService.hasPackageLoaded.mockReturnValue(true);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('banned');
		});
	});

	describe('PATCH /community-packages/:name', () => {
		it('should return 200 when package is updated successfully', async () => {
			const pkg = mockPackage();
			const updatedPkg = mockPackage();
			updatedPkg.packageName = pkg.packageName;
			updatedPkg.installedVersion = COMMUNITY_PACKAGE_VERSION.UPDATED;

			communityPackagesService.findInstalledPackage.mockResolvedValue(pkg);
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				packageName: pkg.packageName,
				rawString: pkg.packageName,
			});
			communityPackagesService.updatePackage.mockResolvedValue(updatedPkg);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/community-packages/${encodeURIComponent(pkg.packageName)}`)
				.send({ version: COMMUNITY_PACKAGE_VERSION.UPDATED });

			expect(response.status).toBe(200);
			expect(response.body.packageName).toBe(pkg.packageName);
			expect(communityPackagesService.updatePackage).toHaveBeenCalledWith(
				pkg.packageName,
				pkg,
				COMMUNITY_PACKAGE_VERSION.UPDATED,
				mockedVettedPackage.checksum,
			);
		});

		it('should return 404 when package is not installed', async () => {
			const name = mockPackageName();
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/community-packages/${encodeURIComponent(name)}`)
				.send({});

			expect(response.status).toBe(404);
			expect(response.body.message).toBeDefined();
		});
	});

	describe('DELETE /community-packages/:name', () => {
		it('should return 404 when package is not installed', async () => {
			const name = mockPackageName();
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				packageName: name,
				rawString: name,
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/community-packages/${encodeURIComponent(name)}`);

			expect(response.status).toBe(404);
			expect(response.body.message).toBeDefined();
		});

		it('should return 204 when uninstall succeeds', async () => {
			const pkg = mockPackage();
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				packageName: pkg.packageName,
				rawString: pkg.packageName,
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(pkg);
			communityPackagesService.removePackage.mockResolvedValue(undefined);

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/community-packages/${encodeURIComponent(pkg.packageName)}`);

			expect(response.status).toBe(204);
			expect(communityPackagesService.removePackage).toHaveBeenCalledTimes(1);
		});
	});
});
