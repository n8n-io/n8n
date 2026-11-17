import { SharedCredentialsRepository, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { HashingPackageWriter } from '@/modules/n8n-packages/io/hashing-package-writer';
import type { N8nPackagesService } from '@/modules/n8n-packages/n8n-packages.service';
import {
	ExportDependencyPolicy,
	ExportVersionPolicy,
	type ExportPackageRequest,
} from '@/modules/n8n-packages/n8n-packages.types';
import type { PackageManifest } from '@/modules/n8n-packages/spec/manifest.schema';

import { parsePackageFiles, type PackageFile } from './base-branch-files';
import { PACKAGE_SUBFOLDER } from './constants';

/** The projects as this instance would export them, without writing any file. */
export type InstancePackage = {
	files: readonly PackageFile[];
	manifest: PackageManifest;
	/** File content by package path, for the files that the caller asked to keep. */
	contents: ReadonlyMap<string, string>;
};

/** The export of no project. A view without an exportable project compares with it. */
export const EMPTY_INSTANCE_PACKAGE: InstancePackage = {
	files: [],
	manifest: { packageFormatVersion: '1', sourceN8nVersion: '', sourceId: '' },
	contents: new Map(),
};

/** What an instance Promote exports to the branch. */
export function instancePromotionExportRequest({
	user,
	projectIds,
	canExportVariableValues,
}: {
	user: User;
	projectIds: string[];
	canExportVariableValues: boolean;
}): ExportPackageRequest {
	return {
		user,
		projectIds,
		includeAgents: false,
		includeVariableValues: true,
		canExportVariableValues,
		includeTags: true,
		// Archived workflows travel too, so the target archives them instead of removing them.
		includeArchived: true,
		// A reference to an item outside the export stays a requirement row, as for a selection.
		// The dependency check decides before the export whether such a reference stops the Promote.
		dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
		versionPolicy: ExportVersionPolicy.Latest,
	};
}

/**
 * The credentials that the projects own and that a package can hold. A placeholder is never
 * content, and an instance credential is not promoted.
 */
async function ownedProjectCredentialIds(projectIds: readonly string[]): Promise<string[]> {
	if (projectIds.length === 0) return [];
	const owned = await Container.get(SharedCredentialsRepository).findOwnedCredentialsByProjects([
		...projectIds,
	]);
	return owned
		.filter(({ usageScope, isPlaceholder }) => usageScope !== 'instance' && !isPlaceholder)
		.map(({ id }) => id);
}

/**
 * The export holds each credential of the projects, also one that no workflow of the projects
 * uses: the owner promotes or applies it for the projects that use it.
 */
export async function exportInstancePackage(
	packagesService: N8nPackagesService,
	user: User,
	projectIds: string[],
	{ keepContent }: { keepContent?: (path: string) => boolean } = {},
): Promise<InstancePackage> {
	const credentialIds = await ownedProjectCredentialIds(projectIds);
	const writer = new HashingPackageWriter();
	const contents = new Map<string, string>();
	const { manifest } = await packagesService.exportPackageToWriter(
		{
			user,
			projectIds,
			includeAgents: false,
			includeArchived: true,
			includeTags: true,
			includeVariableValues: true,
			versionPolicy: ExportVersionPolicy.Latest,
			dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
			...(credentialIds.length > 0 ? { credentialIds } : {}),
		},
		{
			writeDirectory: (path) => writer.writeDirectory(path),
			writeFile(path, content) {
				writer.writeFile(path, content);
				const packagePath = `${PACKAGE_SUBFOLDER}/${path}`;
				if (keepContent?.(packagePath)) contents.set(packagePath, String(content));
			},
		},
	);
	const files = parsePackageFiles(
		writer.finalize().map((file) => ({
			...file,
			path: `${PACKAGE_SUBFOLDER}/${file.path}`,
		})),
		{ exportRoot: PACKAGE_SUBFOLDER, projectIds },
	);
	return { files, manifest, contents };
}
