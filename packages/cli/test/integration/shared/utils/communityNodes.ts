import { NODE_PACKAGE_PREFIX } from '@/constants';
import { InstalledPackages } from '@db/entities/InstalledPackages';

import { randomName } from '../random';
import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '../constants';
import { InstalledNodesRepository } from '@db/repositories/installedNodes.repository';
import { InstalledPackagesRepository } from '@db/repositories/installedPackages.repository';
import Container from 'typedi';

export const mockPackageName = () => NODE_PACKAGE_PREFIX + randomName();

export const mockPackage = () =>
	Container.get(InstalledPackagesRepository).create({
		packageName: mockPackageName(),
		installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
		installedNodes: [],
	});

export const mockNode = (packageName: string) => {
	const nodeName = randomName();

	return Container.get(InstalledNodesRepository).create({
		name: nodeName,
		type: nodeName,
		latestVersion: COMMUNITY_NODE_VERSION.CURRENT.toString(),
		package: { packageName },
	});
};

export const emptyPackage = async () => {
	const installedPackage = new InstalledPackages();
	installedPackage.installedNodes = [];
	return installedPackage;
};

export function mockPackagePair(): InstalledPackages[] {
	const pkgA = mockPackage();
	const nodeA = mockNode(pkgA.packageName);
	pkgA.installedNodes = [nodeA];

	const pkgB = mockPackage();
	const nodeB1 = mockNode(pkgB.packageName);
	const nodeB2 = mockNode(pkgB.packageName);
	pkgB.installedNodes = [nodeB1, nodeB2];

	return [pkgA, pkgB];
}
