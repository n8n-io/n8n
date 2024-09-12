import { DataSource, Repository } from '@n8n/typeorm';
import type { PackageDirectoryLoader } from 'n8n-core';
import { Service } from 'typedi';

import { InstalledNodesRepository } from './installed-nodes.repository';
import { InstalledPackages } from '../entities/installed-packages';

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

			for (const loadedNode of loadedNodes) {
				const installedNode = this.installedNodesRepository.create({
					name: nodeTypes[loadedNode.name].type.description.displayName,
					type: loadedNode.name,
					latestVersion: loadedNode.version,
					package: { packageName },
				});

				installedPackage.installedNodes.push(installedNode);

				await manager.save(installedNode);
			}
		});

		return installedPackage!;
	}
}
