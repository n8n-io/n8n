import { INodeTypeData, INodeTypeNameVersion, LoggerProxy } from 'n8n-workflow';
import * as Db from '@/Db';
import { InstalledNodes } from '@db/entities/InstalledNodes';
import { InstalledPackages } from '@db/entities/InstalledPackages';

export async function findInstalledPackage(
	packageName: string,
): Promise<InstalledPackages | undefined> {
	return Db.collections.InstalledPackages.findOne(packageName, { relations: ['installedNodes'] });
}

export async function isPackageInstalled(packageName: string): Promise<boolean> {
	const installedPackage = await findInstalledPackage(packageName);
	return installedPackage !== undefined;
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
	installedPackageName: string,
	installedPackageVersion: string,
	installedNodes: INodeTypeNameVersion[],
	loadedNodeTypes: INodeTypeData,
	authorName?: string,
	authorEmail?: string,
): Promise<InstalledPackages> {
	let installedPackage: InstalledPackages;

	try {
		await Db.transaction(async (transactionManager) => {
			const promises = [];

			const installedPackagePayload = Object.assign(new InstalledPackages(), {
				packageName: installedPackageName,
				installedVersion: installedPackageVersion,
				authorName,
				authorEmail,
			});
			installedPackage = await transactionManager.save<InstalledPackages>(installedPackagePayload);
			installedPackage.installedNodes = [];

			promises.push(
				...installedNodes.map(async (loadedNode) => {
					const installedNodePayload = Object.assign(new InstalledNodes(), {
						name: loadedNodeTypes[loadedNode.name].type.description.displayName,
						type: loadedNode.name,
						latestVersion: loadedNode.version,
						package: installedPackageName,
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
			packageName: installedPackageName,
		});
		throw error;
	}
}
