import { randomName } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { NODE_PACKAGE_PREFIX } from '@/constants';
import { InstalledNodesRepository } from '@/modules/community-packages/installed-nodes.repository';
import { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';
import { InstalledPackagesRepository } from '@/modules/community-packages/installed-packages.repository';

import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '../constants';

export const mockPackageName = () => NODE_PACKAGE_PREFIX + randomName();

export const mockPackage = (overrides: Partial<InstalledPackages> = {}): InstalledPackages => {
	const now = new Date();

	return Container.get(InstalledPackagesRepository).create({
		packageName: mockPackageName(),
		installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
		installedNodes: [],
		createdAt: now,
		updatedAt: now,
		...overrides,
	});
};

export const mockNode = (packageName: string) => {
	const nodeName = randomName();

	return Container.get(InstalledNodesRepository).create({
		name: nodeName,
		type: `${packageName}.${nodeName}`,
		latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
		package: { packageName },
	});
};

export function mockPackagePair(): InstalledPackages[] {
	const packageNameA = mockPackageName();
	const packageNameB = mockPackageName();

	return [
		mockPackage({ packageName: packageNameA, installedNodes: [mockNode(packageNameA)] }),
		mockPackage({
			packageName: packageNameB,
			installedNodes: [mockNode(packageNameB), mockNode(packageNameB)],
		}),
	];
}
