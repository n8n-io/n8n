import type { PackageFile } from './base-branch-files';

export type PackageFileChange =
	| { change: 'added'; desired: PackageFile }
	| { change: 'deleted'; base: PackageFile }
	| {
			change: 'modified' | 'renamed' | 'renamed-and-modified';
			base: PackageFile;
			desired: PackageFile;
	  };

export function diffPackageFiles(
	base: readonly PackageFile[],
	desired: readonly PackageFile[],
): PackageFileChange[] {
	const remaining = new Map<string, PackageFile[]>();
	for (const file of base) {
		const matchKey = fileMatchKey(file);
		const group = remaining.get(matchKey) ?? [];
		group.push(file);
		remaining.set(matchKey, group);
	}

	const changes: PackageFileChange[] = [];
	const desiredPaths = new Set(desired.map(({ path }) => path));
	for (const file of desired) {
		const group = remaining.get(fileMatchKey(file));
		const index = group?.findIndex(({ path }) => path === file.path) ?? -1;
		const match =
			index >= 0 ? index : (group?.findIndex(({ path }) => !desiredPaths.has(path)) ?? -1);
		const previous = match >= 0 ? group?.splice(match, 1)[0] : undefined;
		if (!previous) {
			changes.push({ change: 'added', desired: file });
			continue;
		}
		const renamed = previous.path !== file.path;
		const modified = previous.blobSha !== file.blobSha;
		if (!renamed && !modified) continue;
		changes.push({
			change: renamed ? (modified ? 'renamed-and-modified' : 'renamed') : 'modified',
			base: previous,
			desired: file,
		});
	}

	for (const group of remaining.values()) {
		for (const file of group) {
			changes.push({ change: 'deleted', base: file });
		}
	}
	return changes;
}

function fileMatchKey(file: PackageFile): string {
	return JSON.stringify([
		file.type,
		file.type === 'variable' ? file.slug : file.entityId,
		file.projectId,
		file.fileName,
	]);
}
