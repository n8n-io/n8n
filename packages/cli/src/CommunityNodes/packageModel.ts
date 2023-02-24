import { LoggerProxy } from 'n8n-workflow';
import type { PackageDirectoryLoader } from 'n8n-core';
import * as Db from '@/Db';
import { InstalledNodes } from '@db/entities/InstalledNodes';
import { InstalledPackages } from '@db/entities/InstalledPackages';

export async function findInstalledPackage(packageName: string): Promise<InstalledPackages | null> {
	return Db.collections.InstalledPackages.findOne({
		where: { packageName },
		relations: ['installedNodes'],
	});
}

export async function isPackageInstalled(packageName: string): Promise<boolean> {
	return Db.collections.InstalledPackages.exist({
		where: { packageName },
	});
}

export async function getAllInstalledPackages(): Promise<InstalledPackages[]> {
	return Db.collections.InstalledPackages.find({ relations: ['installedNodes'] });
}

export async function removePackageFromDatabase(
	packageName: InstalledPackages,
): Promise<InstalledPackages> {
	return Db.collections.InstalledPackages.remove(packageName);
}

export async function persistInstalledPackageData(
	packageLoader: PackageDirectoryLoader,
): Promise<InstalledPackages> {
	const { packageJson, nodeTypes, loadedNodes } = packageLoader;
	const { name: packageName, version: installedVersion, author } = packageJson;

	let installedPackage: InstalledPackages;

	try {
		await Db.transaction(async (transactionManager) => {
			const promises = [];

			const installedPackagePayload = Object.assign(new InstalledPackages(), {
				packageName,
				installedVersion,
				authorName: author?.name,
				authorEmail: author?.email,
			});
			installedPackage = await transactionManager.save<InstalledPackages>(installedPackagePayload);
			installedPackage.installedNodes = [];

			promises.push(
				...loadedNodes.map(async (loadedNode) => {
					const installedNodePayload = Object.assign(new InstalledNodes(), {
						name: nodeTypes[loadedNode.name].type.description.displayName,
						type: loadedNode.name,
						latestVersion: loadedNode.version,
						package: packageName,
					});
					installedPackage.installedNodes.push(installedNodePayload);
					return transactionManager.save<InstalledNodes>(installedNodePayload);
				}),
			);

			return promises;
		});
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		return installedPackage!;
	} catch (error) {
		LoggerProxy.error('Failed to save installed packages and nodes', {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			error,
			packageName,
		});
		throw error;
	}
}
