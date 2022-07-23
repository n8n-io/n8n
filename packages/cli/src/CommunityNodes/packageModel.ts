/* eslint-disable import/no-cycle */
import { INodeTypeData, INodeTypeNameVersion, LoggerProxy } from 'n8n-workflow';
import { Db } from '..';
import { InstalledNodes } from '../databases/entities/InstalledNodes';
import { InstalledPackages } from '../databases/entities/InstalledPackages';

export async function searchInstalledPackage(
	packageName: string,
): Promise<InstalledPackages | undefined> {
	const installedPackage = await Db.collections.InstalledPackages.findOne(packageName, {
		relations: ['installedNodes'],
	});
	return installedPackage;
}

export async function getAllInstalledPackages(): Promise<InstalledPackages[]> {
	const installedPackages = await Db.collections.InstalledPackages.find({
		relations: ['installedNodes'],
	});
	return installedPackages;
}

export async function removePackageFromDatabase(packageName: InstalledPackages): Promise<void> {
	void (await Db.collections.InstalledPackages.remove(packageName));
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
