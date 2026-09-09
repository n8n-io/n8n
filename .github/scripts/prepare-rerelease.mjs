/**
 * Prepares a re-release of a version whose publish pipeline failed after the
 * version was already on npm. npm versions are immutable, so the only way
 * forward is a new patch version built from identical code.
 *
 * Bumps only the root and `packages/cli` package.json files: the root version
 * drives every publish output (git tag, Docker tags, GitHub Release, SBOM) and
 * `packages/cli` drives the runtime `N8N_VERSION`. Every other package keeps
 * its version, so `pnpm publish -r` skips the ones already on npm and publishes
 * whichever ones the failed run never got to.
 *
 * Env:
 *   FAILED_VERSION        required, e.g. "2.27.2"
 *   SKIP_REGISTRY_CHECK   set to skip the npm registry safety check
 *
 * Prints the new version to stdout; diagnostics go to stderr, since the
 * caller captures stdout.
 */
import semver from 'semver';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ensureEnvVar } from './github-helpers.mjs';

const REGISTRY = 'https://registry.npmjs.org';
const RELEASE_PACKAGE_FILES = ['package.json', 'packages/cli/package.json'];

/**
 * All three versions must agree. Equality with `failedVersion` is the
 * load-bearing check: it proves we are on `release/<failedVersion>` *and* that
 * its release PR was merged (the bump commit only lands on merge).
 *
 * @param {string} rootVersion
 * @param {string} cliVersion
 * @param {string} failedVersion
 */
export function assertRereleaseTarget(rootVersion, cliVersion, failedVersion) {
	if (!semver.valid(failedVersion)) {
		throw new Error(`FAILED_VERSION is not a valid semver: ${failedVersion}`);
	}

	// `semver.inc('2.28.0-rc.1', 'patch')` returns 2.28.0, which would collide.
	if (semver.prerelease(failedVersion)) {
		throw new Error(
			`Re-releasing a prerelease is not supported: ${failedVersion}. Re-run the failed jobs instead.`,
		);
	}

	if (rootVersion !== cliVersion) {
		throw new Error(
			`Root package.json (${rootVersion}) and packages/cli/package.json (${cliVersion}) disagree. Fix them before re-releasing.`,
		);
	}

	if (rootVersion !== failedVersion) {
		throw new Error(
			`Checked-out tree is at ${rootVersion}, expected ${failedVersion}. Either the wrong branch is checked out, or the ${failedVersion} release PR was never merged — in which case nothing was published and no re-release is needed.`,
		);
	}
}

/**
 * @param {string} failedVersion
 * @returns {string}
 */
export function computeRereleaseVersion(failedVersion) {
	const next = semver.inc(failedVersion, 'patch');
	if (!next) throw new Error(`Could not increment ${failedVersion}`);
	return next;
}

/**
 * @param {string} packageName
 * @param {string} version
 * @param {typeof fetch} fetchImpl
 * @returns {Promise<boolean | null>} null when the registry could not be reached
 */
export async function isPublished(packageName, version, fetchImpl = fetch) {
	const url = `${REGISTRY}/${packageName.replace('/', '%2f')}/${version}`;
	try {
		const response = await fetchImpl(url, { method: 'GET' });
		if (response.status === 200) return true;
		if (response.status === 404) return false;
		console.error(`::warning::Unexpected HTTP ${response.status} from ${url}`);
		return null;
	} catch (error) {
		console.error(`::warning::Could not reach the npm registry: ${error.message}`);
		return null;
	}
}

/**
 * A re-release is only warranted when the failed version is already burned on
 * npm and the next one is still free. An inconclusive lookup fails the check —
 * `force` is the way past it, not a guess.
 *
 * @param {string} failedVersion
 * @param {string} nextVersion
 * @param {typeof fetch} [fetchImpl]
 */
export async function assertRereleaseIsWarranted(failedVersion, nextVersion, fetchImpl) {
	const [failedIsPublished, nextIsPublished] = await Promise.all([
		isPublished('n8n', failedVersion, fetchImpl),
		isPublished('n8n', nextVersion, fetchImpl),
	]);

	if (failedIsPublished === null || nextIsPublished === null) {
		throw new Error(
			`Could not determine what is published on npm, so ${nextVersion} cannot be confirmed as free. Retry, or dispatch with force to skip this check.`,
		);
	}

	if (!failedIsPublished) {
		throw new Error(
			`n8n@${failedVersion} is not on npm, so that version is not burned. Re-run the failed jobs of the original release instead, or dispatch with force to override.`,
		);
	}

	if (nextIsPublished) {
		throw new Error(
			`n8n@${nextVersion} is already on npm. Re-release from ${nextVersion} instead of ${failedVersion}.`,
		);
	}
}

/**
 * @param {string} failedVersion
 * @param {string} nextVersion
 * @param {string} date ISO date, e.g. "2026-08-27"
 */
export function buildChangelogEntry(failedVersion, nextVersion, date) {
	const compareUrl = `https://github.com/n8n-io/n8n/compare/n8n@${failedVersion}...n8n@${nextVersion}`;
	return [
		`## [${nextVersion}](${compareUrl}) (${date})`,
		'',
		`Re-release of ${failedVersion}, whose publish pipeline failed after the version was already on npm. No code changes.`,
		'',
	].join('\n');
}

async function prepareRerelease() {
	const rootDir = process.cwd();
	const failedVersion = ensureEnvVar('FAILED_VERSION');

	const [rootPkg, cliPkg] = await Promise.all(
		RELEASE_PACKAGE_FILES.map(async (file) =>
			JSON.parse(await readFile(resolve(rootDir, file), 'utf-8')),
		),
	);

	assertRereleaseTarget(rootPkg.version, cliPkg.version, failedVersion);

	const nextVersion = computeRereleaseVersion(failedVersion);

	if (process.env.SKIP_REGISTRY_CHECK) {
		console.error('::warning::Skipping the npm registry check for this re-release.');
	} else {
		await assertRereleaseIsWarranted(failedVersion, nextVersion);
	}

	for (const [file, pkg] of [
		[RELEASE_PACKAGE_FILES[0], rootPkg],
		[RELEASE_PACKAGE_FILES[1], cliPkg],
	]) {
		pkg.version = nextVersion;
		await writeFile(resolve(rootDir, file), JSON.stringify(pkg, null, 2) + '\n');
	}

	const entry = buildChangelogEntry(
		failedVersion,
		nextVersion,
		new Date().toISOString().slice(0, 10),
	);

	// Same two files the normal release writes: the per-version one becomes the
	// PR body, the full one keeps published version history complete.
	const versionChangelogFile = resolve(rootDir, `CHANGELOG-${nextVersion}.md`);
	const fullChangelogFile = resolve(rootDir, 'CHANGELOG.md');
	await writeFile(versionChangelogFile, entry);
	await writeFile(fullChangelogFile, entry + '\n\n' + (await readFile(fullChangelogFile, 'utf-8')));

	console.log(nextVersion);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		await prepareRerelease();
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
}
