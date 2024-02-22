import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { InstalledPackages } from '../entities/InstalledPackages';
import { InstalledNodesRepository } from './installedNodes.repository';
import type { PackageDirectoryLoader } from 'n8n-core';

@Service()
export class InstalledPackagesRepository extends Repository<InstalledPackages> {
	constructor(
		dataSource: DataSource,
		private installedNodesRepository: InstalledNodesRepository,
	) {
		super(InstalledPackages, dataSource.manager);
	}

	async saveInstalledPackageWithNodes(packageLoader: PackageDirectoryLoader) {
		const { packageJson, nodeTypes, loadedNodes } = packageLoader;
		const { name: packageName, version: installedVersion, author } = packageJson;

		let installedPackage: InstalledPackages;

		await this.manager.transaction(async (manager) => {
			installedPackage = await manager.save(
				this.create({
					packageName,
					installedVersion,
					authorName: author?.name,
					authorEmail: author?.email,
				}),
			);

			installedPackage.installedNodes = [];

			return loadedNodes.map(async (loadedNode) => {
				const installedNode = this.installedNodesRepository.create({
					name: nodeTypes[loadedNode.name].type.description.displayName,
					type: loadedNode.name,
					latestVersion: loadedNode.version.toString(),
					package: { packageName },
				});

				installedPackage.installedNodes.push(installedNode);

				return await manager.save(installedNode);
			});
		});

		return installedPackage!;
	}
}
