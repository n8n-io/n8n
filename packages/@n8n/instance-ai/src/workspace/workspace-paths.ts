export interface NormalizeWorkspaceRelativePathOptions {
	resourceLabel?: string;
	/**
	 * Absolute workspace root (e.g. `/home/user/workspace`). When set, absolute
	 * paths under this root are accepted and converted to workspace-relative —
	 * models routinely echo the absolute sandbox paths they see in prompts and
	 * shell output, so rejecting them outright derails otherwise-valid calls.
	 */
	workspaceRoot?: string;
}

function stripWorkspaceRootPrefix(path: string, workspaceRoot: string): string {
	const root = workspaceRoot.replace(/\/+$/, '');
	if (root.length === 0) return path;
	// Collapse redundant slashes so echoed paths like `/root//src/...` still match.
	const collapsed = path.replace(/\/{2,}/g, '/');
	if (collapsed === root) return '';
	return collapsed.startsWith(`${root}/`) ? collapsed.slice(root.length + 1) : path;
}

export function normalizeWorkspaceRelativePath(
	path: string,
	options: NormalizeWorkspaceRelativePathOptions = {},
): string {
	const label = options.resourceLabel ?? 'Workspace';
	let trimmed = path.trim().replace(/^\.\/+/, '');
	if (options.workspaceRoot && trimmed.startsWith('/')) {
		trimmed = stripWorkspaceRootPrefix(trimmed, options.workspaceRoot);
	}
	const segments = trimmed.split('/');
	const normalized = segments.filter((segment) => segment.length > 0 && segment !== '.').join('/');

	if (
		normalized.length === 0 ||
		trimmed.startsWith('/') ||
		trimmed.startsWith('~/') ||
		trimmed.includes('\\') ||
		trimmed.includes('\0') ||
		segments.some((segment) => segment === '..')
	) {
		throw new Error(
			`${label} path must stay within the workspace root: ${path}. ` +
				'Pass a workspace-relative path like src/workflows/my-workflow.workflow.ts.',
		);
	}

	return normalized;
}

export function joinWorkspacePath(root: string, path: string): string {
	const normalizedRoot = root.replace(/\/+$/, '') || '/';
	const normalizedPath = normalizeWorkspaceRelativePath(path);

	return normalizedRoot === '/' ? `/${normalizedPath}` : `${normalizedRoot}/${normalizedPath}`;
}
