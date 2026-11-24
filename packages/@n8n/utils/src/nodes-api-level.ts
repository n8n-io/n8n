import { coerce, type SemVer } from 'semver';

// A float is rejected, since an unquoted `3.10` in package.json is read as
// the number `3.1`. The input must print back from its coerced version as
// `<major>` or `<major>.<minor>`.
export function parseNodesApiLevel(value: unknown): SemVer | null {
	const text = typeof value === 'number' && Number.isInteger(value) ? String(value) : value;
	if (typeof text !== 'string') return null;

	const version = coerce(text);
	if (version === null || version.major < 1) return null;
	if (text !== `${version.major}` && text !== `${version.major}.${version.minor}`) return null;

	return version;
}

export function formatNodesApiLevel({ major, minor }: SemVer): string {
	return `${major}.${minor}`;
}
