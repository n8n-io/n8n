vi.mock('@/modules/community-packages/npm-utils', async () => ({
	...(await vi.importActual<typeof import('@/modules/community-packages/npm-utils')>(
		'@/modules/community-packages/npm-utils',
	)),
	executeNpmCommand: vi.fn(),
	verifyIntegrity: vi.fn(),
}));

import type { CommunityNodeType } from '@n8n/api-types';
import { mockInstance, testDb } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import type { ApiKeyScope } from '@n8n/permissions';
import { OWNER_API_KEY_SCOPES } from '@n8n/permissions';
import { mock } from 'vitest-mock-extended';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import { executeNpmCommand } from '@/modules/community-packages/npm-utils';

import { COMMUNITY_PACKAGE_VERSION } from '../shared/constants';
import { addApiKey, createOwner } from '../shared/db/users';
import { setupTestServer } from '../shared/utils';
import { mockNode, mockPackage, mockPackageName } from '../shared/utils/community-nodes';

const COMMUNITY_PACKAGE_API_SCOPES: ApiKeyScope[] = [
	'communityPackage:install',
	'communityPackage:list',
	'communityPackage:update',
	'communityPackage:uninstall',
];

const communityPackagesService = mockInstance(CommunityPackagesService);
const communityNodeTypesService = mockInstance(CommunityNodeTypesService);
const mockedExecuteNpmCommand = vi.mocked(executeNpmCommand);
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
		vi.resetAllMocks();
		communityPackagesService.withLoadStatus.mockImplementation((packages) => packages);
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
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('should return 400 for an undocumented query parameter', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.get('/community-packages')
				.query({ unknown: 'value' });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: "request/query Unrecognized key(s) in object: 'unknown'",
			});
		});

		it('should return an empty list when no packages are installed', async () => {
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([]);

			const response = await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(response.status).toBe(200);
			expect(response.body).toEqual([]);
			expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
		});

		it('should return installed packages when present', async () => {
			const packageName = mockPackageName();
			const node = mockNode(packageName);
			const pkg = mockPackage({
				packageName,
				authorName: 'Test Author',
				authorEmail: 'test@example.com',
				installedNodes: [node],
			});
			communityPackagesService.getAllInstalledPackages.mockResolvedValue([pkg]);
			communityPackagesService.withLoadStatus.mockReturnValue([
				{
					...pkg,
					updateAvailable: COMMUNITY_PACKAGE_VERSION.UPDATED,
					failedLoading: false,
				},
			]);

			const response = await testServer.publicApiAgentFor(owner).get('/community-packages');

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual([
				{
					packageName: pkg.packageName,
					installedVersion: pkg.installedVersion,
					authorName: pkg.authorName,
					authorEmail: pkg.authorEmail,
					installedNodes: [
						{
							name: node.name,
							type: node.type,
							latestVersion: node.latestVersion,
						},
					],
					createdAt: pkg.createdAt.toISOString(),
					updatedAt: pkg.updatedAt.toISOString(),
					updateAvailable: COMMUNITY_PACKAGE_VERSION.UPDATED,
					failedLoading: false,
				},
			]);
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
	});

	describe('POST /community-packages', () => {
		it('should return 403 when API key lacks communityPackage:install scope', async () => {
			const userWithoutCommunityScopes = await createOwner();
			const apiKey = await addApiKey(userWithoutCommunityScopes, {
				scopes: [...OWNER_API_KEY_SCOPES],
			});
			userWithoutCommunityScopes.apiKeys = [apiKey];

			const response = await testServer
				.publicApiAgentFor(userWithoutCommunityScopes)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('should return 400 when package name is missing', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({});

			expect(response.status).toBe(400);
			expect(response.body.message).toBeDefined();
		});

		it('should return 400 when the body contains an unknown field', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName(), unknown: true });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('unknown');
		});

		it('should return 400 when package is already installed and loaded', async () => {
			communityPackagesService.findInstalledPackage.mockResolvedValue(mockPackage());
			communityPackagesService.isPackageLoaded.mockReturnValue(true);
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({
				message: `Package "${parsedNpmPackageName.packageName}" is already installed`,
			});
		});

		it('should return 200 when package is installed successfully', async () => {
			const packageName = mockPackageName();
			const node = mockNode(packageName);
			const pkg = mockPackage({
				packageName,
				authorName: 'Test Author',
				authorEmail: 'author@example.com',
				installedNodes: [node],
			});
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
			communityPackagesService.installPackage.mockResolvedValue(pkg);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(200);
			expect(response.body).toStrictEqual({
				packageName: pkg.packageName,
				installedVersion: pkg.installedVersion,
				authorName: pkg.authorName,
				authorEmail: pkg.authorEmail,
				installedNodes: [
					{
						name: pkg.installedNodes[0].name,
						type: pkg.installedNodes[0].type,
						latestVersion: pkg.installedNodes[0].latestVersion,
					},
				],
				createdAt: pkg.createdAt.toISOString(),
				updatedAt: pkg.updatedAt.toISOString(),
			});
			// No version requested, so install() pins the latest vetted version:
			// the same catalog lookup provides both it and the checksum.
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				parsedNpmPackageName.packageName,
				mockedVettedPackage.npmVersion,
				mockedVettedPackage.checksum,
			);
		});

		it('should install with verification disabled when verify is false', async () => {
			const pkg = mockPackage();
			communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);
			communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
			communityPackagesService.installPackage.mockResolvedValue(pkg);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName(), verify: false });

			expect(response.status).toBe(200);
			expect(communityNodeTypesService.findVetted).not.toHaveBeenCalled();
			expect(communityPackagesService.installPackage).toHaveBeenCalledWith(
				parsedNpmPackageName.packageName,
				undefined,
				undefined,
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
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			const response = await testServer
				.publicApiAgentFor(owner)
				.post('/community-packages')
				.send({ name: mockPackageName() });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('banned');
		});
	});

	describe('PATCH /community-packages/:name', () => {
		it('should return 403 when API key lacks communityPackage:update scope', async () => {
			const userWithoutCommunityScopes = await createOwner();
			const apiKey = await addApiKey(userWithoutCommunityScopes, {
				scopes: [...OWNER_API_KEY_SCOPES],
			});
			userWithoutCommunityScopes.apiKeys = [apiKey];

			const response = await testServer
				.publicApiAgentFor(userWithoutCommunityScopes)
				.patch(`/community-packages/${encodeURIComponent(mockPackageName())}`)
				.send({ version: COMMUNITY_PACKAGE_VERSION.UPDATED });

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
		});

		it('should return 400 when update options are invalid', async () => {
			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/community-packages/${encodeURIComponent(mockPackageName())}`)
				.send({ verify: 'false' });

			expect(response.status).toBe(400);
			expect(response.body.message).toContain('verify');
			expect(communityPackagesService.updatePackage).not.toHaveBeenCalled();
		});

		it('should return 200 when package is updated successfully', async () => {
			const packageName = mockPackageName();
			const pkg = mockPackage({ packageName });
			const updatedNode = mockNode(packageName);
			const updatedPkg = mockPackage({
				packageName,
				installedVersion: COMMUNITY_PACKAGE_VERSION.UPDATED,
				authorName: 'Test Author',
				authorEmail: 'author@example.com',
				installedNodes: [updatedNode],
			});

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
			expect(response.body).toStrictEqual({
				packageName: pkg.packageName,
				installedVersion: COMMUNITY_PACKAGE_VERSION.UPDATED,
				authorName: updatedPkg.authorName,
				authorEmail: updatedPkg.authorEmail,
				installedNodes: [
					{
						name: updatedNode.name,
						type: updatedNode.type,
						latestVersion: updatedNode.latestVersion,
					},
				],
				createdAt: updatedPkg.createdAt.toISOString(),
				updatedAt: updatedPkg.updatedAt.toISOString(),
			});
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

		it('should pass a decoded scoped package name to the parser', async () => {
			const name = '@author/n8n-nodes-foo';
			const pkg = mockPackage({ packageName: name });
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				packageName: name,
				rawString: name,
				scope: '@author',
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(pkg);
			communityPackagesService.updatePackage.mockResolvedValue(pkg);

			const response = await testServer
				.publicApiAgentFor(owner)
				.patch(`/community-packages/${encodeURIComponent(name)}`)
				.send({});

			expect(response.status).toBe(200);
			expect(communityPackagesService.parseNpmPackageName).toHaveBeenCalledWith(name);
		});
	});

	describe('DELETE /community-packages/:name', () => {
		it('should return 403 when API key lacks communityPackage:uninstall scope', async () => {
			const userWithoutCommunityScopes = await createOwner();
			const apiKey = await addApiKey(userWithoutCommunityScopes, {
				scopes: [...OWNER_API_KEY_SCOPES],
			});
			userWithoutCommunityScopes.apiKeys = [apiKey];

			const response = await testServer
				.publicApiAgentFor(userWithoutCommunityScopes)
				.delete(`/community-packages/${encodeURIComponent(mockPackageName())}`);

			expect(response.status).toBe(403);
			expect(response.body).toStrictEqual({ message: 'Forbidden' });
		});

		it('should return 400 when package name is invalid', async () => {
			const name = 'invalid-package-name';
			communityPackagesService.parseNpmPackageName.mockImplementation(() => {
				throw new Error('Package name must start with n8n-nodes-');
			});

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/community-packages/${encodeURIComponent(name)}`);

			expect(response.status).toBe(400);
			expect(response.body).toStrictEqual({ message: 'Package name must start with n8n-nodes-' });
			expect(communityPackagesService.removePackage).not.toHaveBeenCalled();
		});

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

		it('should pass a decoded scoped package name to the parser', async () => {
			const name = '@author/n8n-nodes-foo';
			communityPackagesService.parseNpmPackageName.mockReturnValue({
				packageName: name,
				rawString: name,
				scope: '@author',
			});
			communityPackagesService.findInstalledPackage.mockResolvedValue(null);

			const response = await testServer
				.publicApiAgentFor(owner)
				.delete(`/community-packages/${encodeURIComponent(name)}`);

			expect(response.status).toBe(404);
			expect(communityPackagesService.parseNpmPackageName).toHaveBeenCalledWith(name);
		});
	});
});
