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

/** The project as this instance would export it, without writing any file. */
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
		includeArchivedWorkflows: true,
		// personal projects are excluded, so a team workflow calling a personal
		// sub-workflow blocks the whole promotion; intended for now, see LIGO-1089
		dependencyPolicy: ExportDependencyPolicy.Fail,
		versionPolicy: ExportVersionPolicy.Latest,
	};
}

export async function exportInstancePackage(
	packagesService: N8nPackagesService,
	user: User,
	projectId: string,
	{ keepContent }: { keepContent?: (path: string) => boolean } = {},
): Promise<InstancePackage> {
	const writer = new HashingPackageWriter();
	const contents = new Map<string, string>();
	const { manifest } = await packagesService.exportPackageToWriter(
		{
			user,
			projectIds: [projectId],
			includeAgents: false,
			includeArchivedWorkflows: true,
			includeTags: true,
			includeVariableValues: true,
			versionPolicy: ExportVersionPolicy.Latest,
			dependencyPolicy: ExportDependencyPolicy.ReferenceOnly,
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
		{ exportRoot: PACKAGE_SUBFOLDER, projectId },
	);
	return { files, manifest, contents };
}
