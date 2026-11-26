import type { User } from '@n8n/db';

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

/** What an instance Promote exports to the branch. */
export function instancePromotionExportRequest({
	user,
	projectIds,
}: {
	user: User;
	projectIds: string[];
}): ExportPackageRequest {
	return {
		user,
		projectIds,
		includeAgents: false,
		includeVariableValues: true,
		includeTags: true,
		// Archived workflows travel too, so the target archives them instead of removing them.
		includeArchived: true,
		// Personal projects stay out, so a sub-workflow of a personal project stays a reference.
		// Promote lists it as a missing dependency, and the caller confirms it.
		dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
		versionPolicy: ExportVersionPolicy.Latest,
		omitCredentialsOutsideExportedProjects: true,
	};
}

export async function exportInstancePackage(
	packagesService: N8nPackagesService,
	user: User,
	projectIds: string[],
	{
		keepContent,
		credentialIds,
	}: {
		keepContent?: (path: string) => boolean;
		/** Credentials of the exported projects to write although no workflow uses them. */
		credentialIds?: string[];
	} = {},
): Promise<InstancePackage> {
	const writer = new HashingPackageWriter();
	const contents = new Map<string, string>();
	const { manifest } = await packagesService.exportPackageToWriter(
		{
			user,
			projectIds,
			projectCredentialIds: credentialIds,
			includeAgents: false,
			includeArchived: true,
			includeTags: true,
			includeVariableValues: true,
			versionPolicy: ExportVersionPolicy.Latest,
			dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
			// As a Promote writes it, so a preview does not list a credential of another project.
			omitCredentialsOutsideExportedProjects: true,
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
