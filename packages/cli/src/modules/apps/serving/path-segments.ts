/** Express 5 hands a wildcard path over as its segments; an empty path has none. */
export const pathSegments = (path: unknown): string[] => {
	if (Array.isArray(path))
		return path.filter((segment): segment is string => typeof segment === 'string');
	return typeof path === 'string' && path !== '' ? [path] : [];
};
