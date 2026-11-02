/** Format discovery paths without changing literal dots or brackets in secret keys. */
export function formatSecretPath(segments: string[]): string {
	return segments.reduce((path, segment) => {
		if (segment === '' || /\.|\[|\]/.test(segment)) {
			const escaped = segment.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
			return `${path}['${escaped}']`;
		}
		return path === '' ? segment : `${path}.${segment}`;
	}, '');
}
