import { randomName } from '@n8n/backend-test-utils';
import { InstalledPackages, InstalledNodesRepository, InstalledPackagesRepository } from '@n8n/db';
import { Container } from '@n8n/di';

import { NODE_PACKAGE_PREFIX } from '@/constants';

import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '../constants';

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
		type: `${packageName}.${nodeName}`,
		latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
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
