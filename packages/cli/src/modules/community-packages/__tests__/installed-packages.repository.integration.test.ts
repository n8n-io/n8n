import { testDb, testModules } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { PackageDirectoryLoader } from 'n8n-core';

import { NODE_PACKAGE_PREFIX } from '@/constants';

import { InstalledNodesRepository } from '../installed-nodes.repository';
import { InstalledPackagesRepository } from '../installed-packages.repository';

const PACKAGE_NAME = `${NODE_PACKAGE_PREFIX}test`;

type LoaderNode = { name: string; displayName: string; version: number };

const buildLoader = (version: string, nodes: LoaderNode[]): PackageDirectoryLoader =>
	({
		packageJson: { name: PACKAGE_NAME, version, author: { name: 'Author', email: 'a@n8n.io' } },
		loadedNodes: nodes.map(({ name, version: nodeVersion }) => ({ name, version: nodeVersion })),
		nodeTypes: Object.fromEntries(
			nodes.map(({ name, displayName }) => [name, { type: { description: { displayName } } }]),
		),
	}) as unknown as PackageDirectoryLoader;

describe('InstalledPackagesRepository', () => {
	let repository: InstalledPackagesRepository;
	let installedNodesRepository: InstalledNodesRepository;

	beforeAll(async () => {
		await testModules.loadModules(['community-packages']);
		await testDb.init();
		repository = Container.get(InstalledPackagesRepository);
		installedNodesRepository = Container.get(InstalledNodesRepository);
	});

	beforeEach(async () => {
		// Delete nodes before packages to satisfy the foreign key
		await installedNodesRepository.delete({});
		await repository.delete({});
	});

	afterAll(async () => {
		await testDb.terminate();
	});

	describe('replaceInstalledPackageWithNodes', () => {
		test('should replace the previous package and its nodes in a single record', async () => {
			const previous = await repository.saveInstalledPackageWithNodes(
				buildLoader('1.0.0', [{ name: 'nodeA', displayName: 'Node A', version: 1 }]),
			);

			await repository.replaceInstalledPackageWithNodes(
				previous,
				buildLoader('2.0.0', [{ name: 'nodeA', displayName: 'Node A', version: 2 }]),
			);

			const packages = await repository.find({ relations: ['installedNodes'] });
			expect(packages).toHaveLength(1);
			expect(packages[0].packageName).toBe(PACKAGE_NAME);
			expect(packages[0].installedVersion).toBe('2.0.0');

			const nodes = await installedNodesRepository.find();
			expect(nodes).toHaveLength(1);
			expect(nodes[0].type).toBe(`${PACKAGE_NAME}.nodeA`);
			expect(nodes[0].latestVersion).toBe(2);
		});

		test('should preserve the previous record when persisting the new one fails', async () => {
			const previous = await repository.saveInstalledPackageWithNodes(
				buildLoader('1.0.0', [{ name: 'nodeA', displayName: 'Node A', version: 1 }]),
			);

			// A loader whose nodeTypes lack the loaded node makes the transaction throw mid-way
			const brokenLoader = {
				packageJson: { name: PACKAGE_NAME, version: '2.0.0' },
				loadedNodes: [{ name: 'missing', version: 1 }],
				nodeTypes: {},
			} as unknown as PackageDirectoryLoader;

			await expect(
				repository.replaceInstalledPackageWithNodes(previous, brokenLoader),
			).rejects.toThrow();

			const packages = await repository.find({ relations: ['installedNodes'] });
			expect(packages).toHaveLength(1);
			expect(packages[0].installedVersion).toBe('1.0.0');
			expect(packages[0].installedNodes).toHaveLength(1);
		});
	});
});
