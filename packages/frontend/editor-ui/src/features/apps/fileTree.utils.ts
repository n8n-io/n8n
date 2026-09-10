import type { TreeBranch } from '@n8n/design-system';

/** Directories before files, alphabetical within each. */
function sortTree(nodes: TreeBranch[]): TreeBranch[] {
	return [...nodes]
		.sort((a, b) => {
			const aIsDir = a.children !== undefined;
			const bIsDir = b.children !== undefined;
			if (aIsDir !== bIsDir) return aIsDir ? -1 : 1;
			return a.label.localeCompare(b.label);
		})
		.map((node) => (node.children ? { ...node, children: sortTree(node.children) } : node));
}

/**
 * Builds a nested file tree from a flat list of `/`-separated file paths. Each
 * node's `id` is its full path from the root — the same string the file-content
 * API expects — so selecting a tree node is already the fetch key.
 */
export function buildFileTree(paths: string[]): TreeBranch[] {
	const root: TreeBranch[] = [];
	const dirsById = new Map<string, TreeBranch>();

	for (const filePath of paths) {
		const segments = filePath.split('/');
		let siblings = root;
		let id = '';
		segments.forEach((segment, index) => {
			id = id ? `${id}/${segment}` : segment;
			const isFile = index === segments.length - 1;
			if (isFile) {
				siblings.push({ id, label: segment });
				return;
			}
			let dir = dirsById.get(id);
			if (!dir) {
				dir = { id, label: segment, children: [] };
				dirsById.set(id, dir);
				siblings.push(dir);
			}
			siblings = dir.children as TreeBranch[];
		});
	}

	return sortTree(root);
}
