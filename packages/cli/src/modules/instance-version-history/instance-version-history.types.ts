import semver from 'semver';

export interface SemVer {
	major: number;
	minor: number;
	patch: number;
}

export interface VersionEntry extends SemVer {
	createdAt: Date;
}

export function formatVersion(v: SemVer): string {
	return `${v.major}.${v.minor}.${v.patch}`;
}

export function parseVersion(versionString: string): SemVer {
	const parsed = semver.parse(versionString);
	if (!parsed) {
		throw new Error(`Invalid version string: ${versionString}`);
	}
	return { major: parsed.major, minor: parsed.minor, patch: parsed.patch };
}

export function compareVersions(a: SemVer, b: SemVer): -1 | 0 | 1 {
	return semver.compare(formatVersion(a), formatVersion(b));
}

export function versionGte(a: SemVer, b: SemVer): boolean {
	return semver.gte(formatVersion(a), formatVersion(b));
}
