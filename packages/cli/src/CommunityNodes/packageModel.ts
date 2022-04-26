/* eslint-disable import/no-cycle */
import { Db } from '..';
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
