import semver from 'semver';

import { getMonorepoProjects } from './pnpm-utils.mjs';

const NPM_REGISTRY = 'https://registry.npmjs.org';

// Standalone packages release from master out-of-sync with the main pipeline
// (release-standalone-package.yml), so their `latest` follows the newest beta
// on npm instead of the version recorded in the stable checkout.
const STANDALONE_PACKAGES_FOLLOWING_BETA = new Set([
	'@n8n/create-node',
	'@n8n/eslint-plugin-community-nodes',
	'@n8n/scan-community-package',
]);

/**
 * @param {string} name
 * @param {string} version
 * @param {string} tag
 * @param {string} token
 */
async function setDistTag(name, version, tag, token) {
	// Scoped package names need both @ and / encoded (e.g. @n8n/foo → %40n8n%2ffoo)
	const encodedName = encodeURIComponent(name);
	const url = `${NPM_REGISTRY}/-/package/${encodedName}/dist-tags/${tag}`;

	return fetch(url, {
		method: 'PUT',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify(version),
	});
}

/** @param {string} name */
async function getDistTags(name) {
	const res = await fetch(`${NPM_REGISTRY}/-/package/${encodeURIComponent(name)}/dist-tags`);
	if (!res.ok) {
		throw new Error(`Failed to fetch dist-tags for ${name}: HTTP ${res.status}`);
	}
	return await res.json();
}

/**
 * Resolve the version `latest` should point at, or null if no move is needed.
 * Standalone packages follow the npm `beta` dist-tag; a standalone release
 * from master may already have pushed `latest` past beta, so never downgrade.
 * @param {import('./pnpm-utils.mjs').PnpmPackage} pkg
 */
export async function resolveLatestVersion(pkg) {
	if (!STANDALONE_PACKAGES_FOLLOWING_BETA.has(pkg.name)) return pkg.version;

	const tags = await getDistTags(pkg.name);
	const target = tags.beta ?? pkg.version;
	if (tags.latest && semver.gte(tags.latest, target)) return null;
	return target;
}

async function setLatestForMonorepoPackages() {
	const token = process.env.NPM_TOKEN;
	if (!token) {
		throw new Error('NPM_TOKEN environment variable is required');
	}

	const packages = await getMonorepoProjects();

	const publishedPackages = packages //
		.filter((pkg) => !pkg.private)
		.filter((pkg) => pkg.name.startsWith('@n8n/'))
		.filter((pkg) => pkg.version);

	const failures = [];

	for (const pkg of publishedPackages) {
		try {
			const version = await resolveLatestVersion(pkg);
			if (version === null) {
				console.log(`Skipped ${pkg.name}: latest is already at or ahead of beta`);
				continue;
			}

			const versionName = `${pkg.name}@${version}`;
			const res = await setDistTag(pkg.name, version, 'latest', token);

			if (res.ok) {
				console.log(`Set ${versionName} as latest`);
			} else {
				const body = await res.text().catch(() => '');
				console.error(`Failed to set ${versionName} as latest: HTTP ${res.status} ${body}`);
				failures.push(versionName);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Failed to set latest for ${pkg.name}: ${message}`);
			failures.push(pkg.name);
		}
	}

	if (failures.length > 0) {
		throw new Error(`Failed to update dist-tags for: ${failures.join(', ')}`);
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	setLatestForMonorepoPackages().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
