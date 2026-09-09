import { PACKAGE_ENTITY_LAYOUT } from '@/modules/n8n-packages/io/manifest-entry';

import type { BaseBranchFile } from './base-branch-files';

export type PackageFileDifference = {
	key: string;
	type: BaseBranchFile['type'];
	change: 'created' | 'removed' | 'modified' | 'moved' | 'moved-and-modified';
	base?: BaseBranchFile;
	desired?: BaseBranchFile;
};

export function diffPackageFiles(
	base: BaseBranchFile[],
	desired: BaseBranchFile[],
): PackageFileDifference[] {
	const remaining = new Map<string, BaseBranchFile[]>();
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
		const identity = { key: file.key, type: file.type };
		if (!previous) {
			differences.push({ ...identity, change: 'created', desired: file });
			continue;
		}
		const moved = previous.path !== file.path;
		const modified = previous.blobSha !== file.blobSha;
		if (!moved && !modified) continue;
		differences.push({
			...identity,
			change: moved ? (modified ? 'moved-and-modified' : 'moved') : 'modified',
			base: previous,
			desired: file,
		});
	}

	for (const group of remaining.values()) {
		for (const file of group) {
			differences.push({ key: file.key, type: file.type, change: 'removed', base: file });
		}
	}
	return differences;
}

function packageFileIdentity(file: BaseBranchFile): string {
	const segments = file.path.split('/');
	const project = segments[1] === PACKAGE_ENTITY_LAYOUT.projects.directory ? segments[2] : '';
	return JSON.stringify([
		file.type,
		file.key,
		project.slice(project.lastIndexOf('-') + 1),
		segments.at(-1),
	]);
}
