import { communityPackageResponseSchema } from '@n8n/api-types';
import type { PublicInstalledNode, PublicInstalledPackage } from 'n8n-workflow';

function toIsoString(value: Date | string): string {
	return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function optionalString(value: unknown): string | undefined {
	return typeof value === 'string' ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
	return typeof value === 'boolean' ? value : undefined;
}

/** Drop the circular `package` field; keep other npm/node fields as a loose object. */
function stripInstalledNode(node: PublicInstalledNode): Record<string, unknown> {
	const { package: _omitPackage, ...rest } = node;
	return rest;
}

export function mapToCommunityPackage(pkg: PublicInstalledPackage) {
	return communityPackageResponseSchema.parse({
		packageName: pkg.packageName,
		installedVersion: pkg.installedVersion,
		authorName: optionalString(pkg.authorName),
		authorEmail: optionalString(pkg.authorEmail),
		installedNodes: pkg.installedNodes.map(stripInstalledNode),
		createdAt: toIsoString(pkg.createdAt),
		updatedAt: toIsoString(pkg.updatedAt),
		updateAvailable: optionalString(pkg.updateAvailable),
		failedLoading: optionalBoolean(pkg.failedLoading),
	});
}

export function mapToCommunityPackageList(packages: PublicInstalledPackage[]) {
	return packages.map(mapToCommunityPackage);
}
