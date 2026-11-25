/*
 * Regression test — resolved ip-address versions stay at or above 10.7.4
 * Ref: SEC-1688
 */
import { isRecord } from '@n8n/utils/is-record';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { gte, valid } from 'semver';
import { parseAllDocuments } from 'yaml';

const MIN_IP_ADDRESS_VERSION = '10.7.4';

interface PackageManifest {
	name: string;
	version: string;
}

function readPackageManifest(entryPath: string, expectedName: string): PackageManifest {
	let dir = path.dirname(entryPath);
	while (dir !== path.dirname(dir)) {
		const manifestPath = path.join(dir, 'package.json');
		if (existsSync(manifestPath)) {
			const parsed: unknown = JSON.parse(readFileSync(manifestPath, 'utf8'));
			if (isRecord(parsed) && parsed.name === expectedName && typeof parsed.version === 'string') {
				return { name: parsed.name, version: parsed.version };
			}
		}
		dir = path.dirname(dir);
	}
	throw new Error(`Could not locate package.json for ${expectedName}`);
}

function findWorkspaceRoot(startDir: string): string {
	let dir = startDir;
	while (dir !== path.dirname(dir)) {
		if (
			existsSync(path.join(dir, 'pnpm-workspace.yaml')) &&
			existsSync(path.join(dir, 'pnpm-lock.yaml'))
		) {
			return dir;
		}
		dir = path.dirname(dir);
	}
	throw new Error(
		'Could not locate workspace root containing pnpm-workspace.yaml and pnpm-lock.yaml',
	);
}

function resolveLockfilePackageVersions(lockfileContent: string, packageName: string): string[] {
	const document = parseAllDocuments(lockfileContent).at(-1);
	if (!document) {
		throw new Error('pnpm-lock.yaml is empty');
	}
	if (document.errors.length > 0) {
		throw document.errors[0];
	}

	const parsed: unknown = document.toJS();
	if (!isRecord(parsed) || !isRecord(parsed.packages)) {
		return [];
	}

	const prefix = `${packageName}@`;
	const versions: string[] = [];

	for (const rawKey of Object.keys(parsed.packages)) {
		const parenIdx = rawKey.indexOf('(');
		const cleanKey = parenIdx === -1 ? rawKey : rawKey.slice(0, parenIdx);
		if (!cleanKey.startsWith(prefix)) continue;
		versions.push(cleanKey.slice(prefix.length));
	}

	return versions.sort();
}

describe('ip-address dependency resolution', () => {
	const cliRoot = path.resolve(__dirname, '../..');
	const requireFromCli = createRequire(path.join(cliRoot, 'package.json'));
	const rateLimitEntry = requireFromCli.resolve('express-rate-limit');
	const requireFromRateLimit = createRequire(rateLimitEntry);
	const ipAddressPkg = readPackageManifest(
		requireFromRateLimit.resolve('ip-address'),
		'ip-address',
	);

	it('resolves ip-address for express-rate-limit with a valid semver version', () => {
		expect(ipAddressPkg.name).toBe('ip-address');
		expect(valid(ipAddressPkg.version)).not.toBeNull();
	});

	it('resolves ip-address to 10.7.4 or newer for express-rate-limit', () => {
		// express-rate-limit relies on ip-address for IPv6 subnet normalization.
		expect(
			gte(ipAddressPkg.version, MIN_IP_ADDRESS_VERSION),
			`Expected express-rate-limit to resolve ip-address >= ${MIN_IP_ADDRESS_VERSION}, found ${ipAddressPkg.version}`,
		).toBe(true);
	});

	it('resolves every ip-address entry in pnpm-lock.yaml to 10.7.4 or newer', () => {
		// Every transitive consumer in the lockfile must resolve to at least the required version.
		const workspaceRoot = findWorkspaceRoot(cliRoot);
		const lockfileContent = readFileSync(path.join(workspaceRoot, 'pnpm-lock.yaml'), 'utf8');
		const versions = resolveLockfilePackageVersions(lockfileContent, 'ip-address');

		expect(versions.length).toBeGreaterThan(0);

		const outdated = versions.filter(
			(version) => !valid(version) || !gte(version, MIN_IP_ADDRESS_VERSION),
		);
		expect(outdated).toEqual([]);
	});
});
