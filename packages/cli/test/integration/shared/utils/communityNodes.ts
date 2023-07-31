import { NODE_PACKAGE_PREFIX } from '@/constants';
import { InstalledPackages } from '@db/entities/InstalledPackages';

import { randomName } from '../random';
import { COMMUNITY_NODE_VERSION, COMMUNITY_PACKAGE_VERSION } from '../constants';
import type { InstalledNodePayload, InstalledPackagePayload } from '../types';

export function installedPackagePayload(): InstalledPackagePayload {
	return {
		packageName: NODE_PACKAGE_PREFIX + randomName(),
		installedVersion: COMMUNITY_PACKAGE_VERSION.CURRENT,
	};
}

export function installedNodePayload(packageName: string): InstalledNodePayload {
	const nodeName = randomName();
	return {
		name: nodeName,
		type: nodeName,
		latestVersion: COMMUNITY_NODE_VERSION.CURRENT,
		package: packageName,
	};
}

export const emptyPackage = async () => {
	const installedPackage = new InstalledPackages();
	installedPackage.installedNodes = [];
	return installedPackage;
};
