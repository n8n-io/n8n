import semver from 'semver';
import { parse } from 'yaml';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import assert from 'assert';

const exec = promisify(child_process.exec);

/**
 * @param {string | semver.SemVer} currentVersion
 */
export function generateExperimentalVersion(currentVersion) {
	const parsed = semver.parse(currentVersion);
	if (!parsed) throw new Error(`Invalid version: ${currentVersion}`);

	// Check if it's already an experimental version
	if (parsed.prerelease.length > 0 && parsed.prerelease[0] === 'exp') {
		const minor = parsed.prerelease[1] || 0;
		const minorInt = typeof minor === 'string' ? parseInt(minor) : minor;
		// Increment the experimental minor version
		const expMinor = minorInt + 1;
		return `${parsed.major}.${parsed.minor}.${parsed.patch}-exp.${expMinor}`;
	}

	// Create new experimental version: <major>.<minor>.<patch>-exp.0
	return `${parsed.major}.${parsed.minor}.${parsed.patch}-exp.0`;
}

/**
 * @param {{ pnpm?: { overrides?: Record<string, string> }, overrides?: Record<string, string> }} pkg
 * @returns {Record<string, string>}
 */
export function getOverrides(pkg) {
	return { ...pkg.pnpm?.overrides, ...pkg.overrides };
}

/**
 * @param {string} content
 * @returns {Record<string, unknown>}
 */
export function parseWorkspaceYaml(content) {
	try {
		return /** @type {Record<string, unknown>} */ (parse(content) ?? {});
	} catch {
		return {};
	}
}

/**
 * @param {Record<string, unknown>} ws
 * @returns {Map<string, Record<string, string>>}
 */
export function getCatalogs(ws) {
	const result = new Map();
	if (ws.catalog) {
		result.set('default', /** @type {Record<string,string>} */ (ws.catalog));
	}

	for (const [name, entries] of Object.entries(ws.catalogs ?? {})) {
		result.set(name, entries);
	}

	return result;
}

/**
 * @param {Record<string, string>} currentOverrides
 * @param {Record<string, string>} previousOverrides
 * @returns {Set<string>}
 */
export function computeChangedOverrides(currentOverrides, previousOverrides) {
	return new Set(
		Object.keys({ ...currentOverrides, ...previousOverrides }).filter(
			(k) => currentOverrides[k] !== previousOverrides[k],
		),
	);
}

/**
 * @param {Map<string, Record<string, string>>} currentCatalogs
 * @param {Map<string, Record<string, string>>} previousCatalogs
 * @returns {Map<string, Set<string>>}
 */
export function computeChangedCatalogEntries(currentCatalogs, previousCatalogs) {
	const changedCatalogEntries = new Map();
	for (const catalogName of new Set([...currentCatalogs.keys(), ...previousCatalogs.keys()])) {
		const current = currentCatalogs.get(catalogName) ?? {};
		const previous = previousCatalogs.get(catalogName) ?? {};
		const changedDeps = new Set(
			Object.keys({ ...current, ...previous }).filter((dep) => current[dep] !== previous[dep]),
		);
		if (changedDeps.size > 0) {
			changedCatalogEntries.set(catalogName, changedDeps);
		}
	}
	return changedCatalogEntries;
}

/**
 * Mark packages as dirty if any dep had a root-level override or catalog version change.
 * Mutates packageMap in place.
 *
 * @param {Record<string, { isDirty: boolean }>} packageMap
 * @param {Record<string, Record<string, string>>} depsByPackage
 * @param {Set<string>} changedOverrides
 * @param {Map<string, Set<string>>} changedCatalogEntries
 */
export function markDirtyByRootChanges(
	packageMap,
	depsByPackage,
	changedOverrides,
	changedCatalogEntries,
) {
	for (const [packageName, deps] of Object.entries(depsByPackage)) {
		if (packageMap[packageName].isDirty) continue;
		for (const [dep, specifier] of Object.entries(deps)) {
			if (changedOverrides.has(dep)) {
				packageMap[packageName].isDirty = true;
				break;
			}
			if (typeof specifier === 'string' && specifier.startsWith('catalog:')) {
				const catalogName = specifier === 'catalog:' ? 'default' : specifier.slice(8);
				if (changedCatalogEntries.get(catalogName)?.has(dep)) {
					packageMap[packageName].isDirty = true;
					break;
				}
			}
		}
	}
}

/**
 * Propagate isDirty transitively: if a package's dependency will be bumped,
 * that package also needs a bump. Mutates packageMap in place.
 *
 * @param {Record<string, { isDirty: boolean }>} packageMap
 * @param {Record<string, Record<string, string>>} depsByPackage
 */
export function propagateDirtyTransitively(packageMap, depsByPackage) {
	let changed = true;
	while (changed) {
		changed = false;
		for (const packageName in packageMap) {
			if (packageMap[packageName].isDirty) continue;
			if (Object.keys(depsByPackage[packageName]).some((dep) => packageMap[dep]?.isDirty)) {
				packageMap[packageName].isDirty = true;
				changed = true;
			}
		}
	}
}

/**
 * @param {string} version
 * @param {import('semver').ReleaseType | 'experimental'} releaseType
 * @returns {string}
 */
export function computeNewVersion(version, releaseType) {
	switch (releaseType) {
		case 'experimental':
			return generateExperimentalVersion(version);
		case 'premajor':
			return /** @type {string} */ (
				semver.inc(
					version,
					version.includes('-rc.') ? 'prerelease' : 'premajor',
					undefined,
					'rc',
				)
			);
		default:
			return /** @type {string} */ (semver.inc(version, releaseType));
	}
}

async function bumpVersions() {
	const rootDir = process.cwd();

	const releaseType = /** @type { import('semver').ReleaseType | "experimental" } */ (
		process.env.RELEASE_TYPE
	);
	assert.match(releaseType, /^(patch|minor|major|experimental|premajor)$/, 'Invalid RELEASE_TYPE');

	// TODO: if releaseType is `auto` determine release type based on the changelog

	const lastTag = (await exec('git describe --tags --match "n8n@*" --abbrev=0')).stdout.trim();
	const packages = JSON.parse(
		(
			await exec(
				`pnpm ls -r --only-projects --json | jq -r '[.[] | { name: .name, version: .version, path: .path,  private: .private}]'`,
			)
		).stdout,
	);

	/** @type {Record<string, { path: string, isDirty: boolean, version: string, nextVersion?: string }>} */
	const packageMap = {};
	for (let { name, path, version, private: isPrivate } of packages) {
		if (isPrivate && path !== rootDir) {
			continue;
		}
		if (path === rootDir) {
			name = 'monorepo-root';
		}

		const isDirty = await exec(`git diff --quiet HEAD ${lastTag} -- ${path}`)
			.then(() => false)
			.catch(() => true);

		packageMap[name] = { path, isDirty, version };
	}

	assert.ok(
		Object.values(packageMap).some(({ isDirty }) => isDirty),
		'No changes found since the last release',
	);

	// Propagate isDirty transitively: if a package's dependency will be bumped,
	// that package also needs a bump (e.g. design-system → editor-ui → cli).

	// Detect root-level changes that affect resolved dep versions without touching individual
	// package.json files: pnpm.overrides (applies to all specifiers)
	// and pnpm-workspace.yaml catalog entries (applies only to deps using a "catalog:…" specifier).

	const rootPkgJson = JSON.parse(await readFile(resolve(rootDir, 'package.json'), 'utf-8'));
	const rootPkgJsonAtTag = await exec(`git show ${lastTag}:package.json`)
		.then(({ stdout }) => JSON.parse(stdout))
		.catch(() => ({}));

	const changedOverrides = computeChangedOverrides(
		getOverrides(rootPkgJson),
		getOverrides(rootPkgJsonAtTag),
	);

	const workspaceYaml = parseWorkspaceYaml(
		await readFile(resolve(rootDir, 'pnpm-workspace.yaml'), 'utf-8').catch(() => ''),
	);
	const workspaceYamlAtTag = parseWorkspaceYaml(
		await exec(`git show ${lastTag}:pnpm-workspace.yaml`)
			.then(({ stdout }) => stdout)
			.catch(() => ''),
	);
	const changedCatalogEntries = computeChangedCatalogEntries(
		getCatalogs(workspaceYaml),
		getCatalogs(workspaceYamlAtTag),
	);

	// Store full dep objects (with specifiers) so we can inspect "catalog:…" values below.
	/** @type {Record<string, Record<string, string>>} */
	const depsByPackage = {};
	for (const packageName in packageMap) {
		const packageFile = resolve(packageMap[packageName].path, 'package.json');
		const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
		depsByPackage[packageName] = /** @type {Record<string,string>} */ (
			packageJson.dependencies ?? {}
		);
	}

	// Mark packages dirty if any dep had a root-level override or catalog version change.
	markDirtyByRootChanges(packageMap, depsByPackage, changedOverrides, changedCatalogEntries);

	propagateDirtyTransitively(packageMap, depsByPackage);

	// Keep the monorepo version up to date with the released version
	packageMap['monorepo-root'].version = packageMap['n8n'].version;

	for (const packageName in packageMap) {
		const { path, version, isDirty } = packageMap[packageName];
		const packageFile = resolve(path, 'package.json');
		const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));

		const dependencyIsDirty = Object.keys(packageJson.dependencies || {}).some(
			(dependencyName) => packageMap[dependencyName]?.isDirty,
		);

		let newVersion = version;

		if (isDirty || dependencyIsDirty) {
			newVersion = computeNewVersion(version, releaseType);
		}

		packageJson.version = packageMap[packageName].nextVersion = newVersion;

		await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
	}

	console.log(packageMap['n8n'].nextVersion);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	bumpVersions();
}
