export function normalizeWorkspaceRelativePath(
	path: string,
	options: { resourceLabel?: string } = {},
): string {
	const label = options.resourceLabel ?? 'Workspace';
	const trimmed = path.trim().replace(/^\.\/+/, '');
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
		throw new Error(`${label} path must stay within the workspace root: ${path}`);
	}

	return normalized;
}

export function joinWorkspacePath(root: string, path: string): string {
	const normalizedRoot = root.replace(/\/+$/, '') || '/';
	const normalizedPath = normalizeWorkspaceRelativePath(path);

	return normalizedRoot === '/' ? `/${normalizedPath}` : `${normalizedRoot}/${normalizedPath}`;
}
