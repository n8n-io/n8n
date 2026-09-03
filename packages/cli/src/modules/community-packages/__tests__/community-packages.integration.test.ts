vi.mock('../npm-utils', async () => ({
	...(await vi.importActual<typeof import('../npm-utils')>('../npm-utils')),
	executeNpmCommand: vi.fn(),
}));

import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { N8N_NODES_API_VERSION } from 'n8n-workflow';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'path';

import { LoadNodesAndCredentials } from '@/load-nodes-and-credentials';
import { CommunityPackagesConfig } from '@/modules/community-packages/community-packages.config';
import { CommunityPackagesModule } from '@/modules/community-packages/community-packages.module';
import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';
import type { InstalledNodes } from '@/modules/community-packages/installed-nodes.entity';
import type { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';
import { executeNpmCommand } from '@/modules/community-packages/npm-utils';

import { COMMUNITY_PACKAGE_VERSION } from '../../../../test/integration/shared/constants';
import { createOwner } from '../../../../test/integration/shared/db/users';
import type { SuperAgentTest } from '../../../../test/integration/shared/types';
import {
	setupTestServer,
	mockPackage,
	mockNode,
	mockPackageName,
} from '../../../../test/integration/shared/utils';

const communityPackagesService = mockInstance(CommunityPackagesService);
const mockedExecuteNpmCommand = vi.mocked(executeNpmCommand);
mockInstance(LoadNodesAndCredentials);

const testServer = setupTestServer({
	endpointGroups: ['community-packages'],
	modules: ['community-packages'],
});

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
	const ownerShell = await createOwner();
	authAgent = testServer.authAgentFor(ownerShell);
});

beforeEach(() => {
	vi.resetAllMocks();
	// Most tests here assert the npm-based update check, which only runs when
	// unverified packages are enabled - opt in instead of relying on the default.
	Container.get(CommunityPackagesConfig).unverifiedEnabled = true;
	communityPackagesService.withLoadStatus.mockImplementation((packages) => packages);
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
		const pkg = mockPackage();
		const node = mockNode(pkg.packageName);
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
		const pkgA = mockPackage();
		const nodeA = mockNode(pkgA.packageName);

		const pkgB = mockPackage();
		const nodeB = mockNode(pkgB.packageName);
		const nodeC = mockNode(pkgB.packageName);

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

		const allNodes = data.reduce(
			(acc: InstalledNodes[], cur: InstalledPackages) => acc.concat(cur.installedNodes),
			[],
		);

		expect(allNodes).toHaveLength(3);
	});

	test('should not check for updates if no packages installed', async () => {
		await authAgent.get('/community-packages');

		expect(mockedExecuteNpmCommand).not.toHaveBeenCalled();
	});

	test('should check for updates if packages installed', async () => {
		communityPackagesService.getAllInstalledPackages.mockResolvedValue([mockPackage()]);

		await authAgent.get('/community-packages').expect(200);

		const args = [['outdated', '--json'], { doNotHandleError: true, cwd: expect.any(String) }];

		expect(mockedExecuteNpmCommand).toHaveBeenCalledWith(...args);
	});

	test('should report package updates if available', async () => {
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
		communityPackagesService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackagesService.isPackageLoaded.mockReturnValue(true);
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

		const {
			body: { message },
		} = await authAgent.post('/community-packages').send({ name: mockPackageName() }).expect(400);

		expect(message).toContain('already installed');
	});

	test('should allow installing packages that could not be loaded', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackagesService.isPackageLoaded.mockReturnValue(false);
		communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'OK' });
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);
		communityPackagesService.installPackage.mockResolvedValue(mockPackage());

		await authAgent.post('/community-packages').send({ name: mockPackageName() }).expect(200);

		expect(communityPackagesService.installPackage).toHaveBeenCalled();
	});

	test('should not install a banned package', async () => {
		communityPackagesService.checkNpmPackageStatus.mockResolvedValue({ status: 'Banned' });
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

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
		communityPackagesService.findInstalledPackage.mockResolvedValue(mockPackage());

		await authAgent.delete('/community-packages').query({ name: mockPackageName() }).expect(200);

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
		} = await authAgent.patch('/community-packages').send({ name: mockPackageName() }).expect(400);

		expect(message).toContain('not installed');
	});

	test('should update a package', async () => {
		communityPackagesService.findInstalledPackage.mockResolvedValue(mockPackage());
		communityPackagesService.parseNpmPackageName.mockReturnValue(parsedNpmPackageName);

		await authAgent.patch('/community-packages').send({ name: mockPackageName() });

		expect(communityPackagesService.updatePackage).toHaveBeenCalledTimes(1);
	});
});

// The module's `nodeLoaders()` provider is what startup goes through
// (`ModuleRegistry` → `LoadNodesAndCredentials`). An incompatible package
// already on disk must yield no loader, so its node code is never imported,
// its node types stay unknown to `LoadNodesAndCredentials`, and the settings
// UI reports the package as failed-loading via `withLoadStatus`.
describe('node API compatibility at startup', () => {
	let downloadDir: string;
	let nodeModulesDir: string;

	const writePackage = (name: string, n8n?: object) => {
		const dir = path.join(nodeModulesDir, name);
		mkdirSync(dir);
		writeFileSync(
			path.join(dir, 'package.json'),
			JSON.stringify({ name, version: '1.0.0', ...(n8n ? { n8n } : {}) }),
		);
	};

	beforeEach(() => {
		downloadDir = mkdtempSync(path.join(tmpdir(), 'n8n-community-packages-'));
		nodeModulesDir = path.join(downloadDir, 'node_modules');
		mkdirSync(nodeModulesDir);
	});

	afterEach(() => {
		rmSync(downloadDir, { recursive: true, force: true });
	});

	test('boots with an incompatible package on disk and registers no loader for it', async () => {
		writePackage('n8n-nodes-future', {
			nodes: ['dist/nodes/Future.node.js'],
			n8nNodesApiVersion: N8N_NODES_API_VERSION + 1,
		});
		writePackage('n8n-nodes-good');

		const originalSettings = Container.get(InstanceSettings);
		mockInstance(InstanceSettings, { nodesDownloadDir: downloadDir });

		const loaders = await Container.get(CommunityPackagesModule).nodeLoaders();

		Container.set(InstanceSettings, originalSettings);

		expect(loaders.map((loader) => loader.packageName)).toEqual(['n8n-nodes-good']);
		expect(Container.get(Logger).warn).toHaveBeenCalledWith(
			expect.stringContaining('n8n-nodes-future'),
		);
	});

	test('registers loaders for compatible and legacy packages on disk', async () => {
		writePackage('n8n-nodes-explicit', { n8nNodesApiVersion: N8N_NODES_API_VERSION });
		writePackage('n8n-nodes-legacy');

		const originalSettings = Container.get(InstanceSettings);
		mockInstance(InstanceSettings, { nodesDownloadDir: downloadDir });

		const loaders = await Container.get(CommunityPackagesModule).nodeLoaders();

		Container.set(InstanceSettings, originalSettings);

		expect(loaders.map((loader) => loader.packageName).sort()).toEqual([
			'n8n-nodes-explicit',
			'n8n-nodes-legacy',
		]);
	});
});
