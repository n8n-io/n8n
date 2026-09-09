import type { PackageFile } from './base-branch-files';

export type PackageFileDifference =
	| { change: 'created'; desired: PackageFile }
	| { change: 'removed'; base: PackageFile }
	| {
			change: 'modified' | 'moved' | 'moved-and-modified';
			base: PackageFile;
			desired: PackageFile;
	  };

export function diffPackageFiles(
	base: readonly PackageFile[],
	desired: readonly PackageFile[],
): PackageFileDifference[] {
	const remaining = new Map<string, PackageFile[]>();
	for (const file of base) {
		const identity = packageFileIdentity(file);
		const group = remaining.get(identity) ?? [];
		group.push(file);
		remaining.set(identity, group);
	}

	const differences: PackageFileDifference[] = [];
	const desiredPaths = new Set(desired.map(({ path }) => path));
	for (const file of desired) {
		const group = remaining.get(packageFileIdentity(file));
		const index = group?.findIndex(({ path }) => path === file.path) ?? -1;
		const match =
			index >= 0 ? index : (group?.findIndex(({ path }) => !desiredPaths.has(path)) ?? -1);
		const previous = match >= 0 ? group?.splice(match, 1)[0] : undefined;
		if (!previous) {
			differences.push({ change: 'created', desired: file });
			continue;
		}
		const moved = previous.path !== file.path;
		const modified = previous.blobSha !== file.blobSha;
		if (!moved && !modified) continue;
		differences.push({
			change: moved ? (modified ? 'moved-and-modified' : 'moved') : 'modified',
			base: previous,
			desired: file,
		});
	}

	for (const group of remaining.values()) {
		for (const file of group) {
			differences.push({ change: 'removed', base: file });
		}
	}
	return differences;
}

function packageFileIdentity(file: PackageFile): string {
	return JSON.stringify([
		file.type,
		file.type === 'variable' ? file.slug : file.id,
		file.projectId,
		file.fileName,
	]);
}
