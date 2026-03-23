import semver from 'semver';
import { writeFile, readFile } from 'fs/promises';
import { resolve } from 'path';
import child_process from 'child_process';
import { promisify } from 'util';
import assert from 'assert';

const exec = promisify(child_process.exec);

function generateExperimentalVersion(currentVersion) {
	const parsed = semver.parse(currentVersion);
	if (!parsed) throw new Error(`Invalid version: ${currentVersion}`);

	// Check if it's already an experimental version
	if (parsed.prerelease.length > 0 && parsed.prerelease[0] === 'exp') {
		// Increment the experimental minor version
		const expMinor = (parsed.prerelease[1] || 0) + 1;
		return `${parsed.major}.${parsed.minor}.${parsed.patch}-exp.${expMinor}`;
	}

	// Create new experimental version: <major>.<minor>.<patch>-exp.0
	return `${parsed.major}.${parsed.minor}.${parsed.patch}-exp.0`;
}

const rootDir = process.cwd();
const releaseType = process.env.RELEASE_TYPE;
assert.match(releaseType, /^(patch|minor|major|experimental|premajor)$/, 'Invalid RELEASE_TYPE');

// TODO: if releaseType is `auto` determine release type based on the changelog

const lastTag = (await exec('git describe --tags --match "n8n@*" --abbrev=0')).stdout.trim();
const packages = JSON.parse((await exec('pnpm ls -r --only-projects --json')).stdout);

const packageMap = {};
for (let { name, path, version, private: isPrivate, dependencies } of packages) {
	if (isPrivate && path !== rootDir) continue;
	if (path === rootDir) name = 'monorepo-root';

	const isDirty = await exec(`git diff --quiet HEAD ${lastTag} -- ${path}`)
		.then(() => false)
		.catch((error) => true);

	packageMap[name] = { path, isDirty, version };
}

assert.ok(
	Object.values(packageMap).some(({ isDirty }) => isDirty),
	'No changes found since the last release',
);

// Propagate isDirty transitively: if a package's dependency will be bumped,
// that package also needs a bump (e.g. design-system → editor-ui → cli).

const depsByPackage = {};
for (const packageName in packageMap) {
	const packageFile = resolve(packageMap[packageName].path, 'package.json');
	const packageJson = JSON.parse(await readFile(packageFile, 'utf-8'));
	depsByPackage[packageName] = Object.keys(packageJson.dependencies || {});
}

let changed = true;
while (changed) {
	changed = false;
	for (const packageName in packageMap) {
		if (packageMap[packageName].isDirty) continue;
		if (depsByPackage[packageName].some((dep) => packageMap[dep]?.isDirty)) {
			packageMap[packageName].isDirty = true;
			changed = true;
		}
	}
}

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
		switch (releaseType) {
			case 'experimental':
				newVersion = generateExperimentalVersion(version);
				break;
			case 'premajor':
				newVersion = semver.inc(
					version,
					version.includes('-rc.') ? 'prerelease' : 'premajor',
					undefined,
					'rc',
				);
				break;
			default:
				newVersion = semver.inc(version, releaseType);
				break;
		}
	}

	packageJson.version = packageMap[packageName].nextVersion = newVersion;

	await writeFile(packageFile, JSON.stringify(packageJson, null, 2) + '\n');
}

console.log(packageMap['n8n'].nextVersion);
