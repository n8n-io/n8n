#!/usr/bin/env node
/**
 * Publish the pnpm version pinned in the root `package.json` and the cache key
 * for the pnpm executable to `$GITHUB_OUTPUT`.
 *
 * `setup-nodejs` feeds the setup step, the executable cache key and the version
 * check from these two outputs. A second copy of the version can therefore not
 * drift from the pin, and a cache hit can not hide a stale pin.
 *
 * The step runs before `pnpm install`, so this script uses node builtins only.
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const PNPM_PREFIX = 'pnpm@';
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

/** The root `package.json`, resolved from this file so the cwd does not matter. */
export const ROOT_PACKAGE_JSON = new URL('../../package.json', import.meta.url);

/**
 * @param {unknown} packageManager Value of the `packageManager` field.
 * @returns {string} The pinned pnpm version.
 */
export function parsePnpmVersion(packageManager) {
	if (typeof packageManager !== 'string' || !packageManager.startsWith(PNPM_PREFIX)) {
		throw new Error(
			`packageManager in package.json does not pin pnpm (got '${packageManager ?? ''}')`,
		);
	}

	// Corepack allows an integrity suffix, as in `pnpm@1.2.3+sha512.abc`.
	const version = packageManager.slice(PNPM_PREFIX.length).split('+')[0];

	if (!VERSION_PATTERN.test(version)) {
		throw new Error(`packageManager in package.json pins no exact pnpm version (got '${version}')`);
	}

	return version;
}

/**
 * @param {string} version
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string}
 */
export function buildCacheKey(version, env = process.env) {
	return `pnpm-exe-v1-${env.RUNNER_OS}-${env.RUNNER_ARCH}-${version}`;
}

/**
 * @param {object} [options]
 * @param {URL | string} [options.packageJsonPath]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @returns {{ version: string, cacheKey: string }}
 */
export function resolvePnpmVersion({
	packageJsonPath = ROOT_PACKAGE_JSON,
	env = process.env,
} = {}) {
	const { packageManager } = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
	const version = parsePnpmVersion(packageManager);
	const cacheKey = buildCacheKey(version, env);

	if (env.GITHUB_OUTPUT) {
		appendFileSync(env.GITHUB_OUTPUT, `version=${version}\ncache-key=${cacheKey}\n`, 'utf8');
	}

	return { version, cacheKey };
}

// only run when executed directly, not when imported by tests
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	try {
		const { version, cacheKey } = resolvePnpmVersion();
		console.log(`pnpm ${version}, cache key ${cacheKey}`);
	} catch (error) {
		console.error(`::error::${error.message}`);
		process.exit(1);
	}
}
