import { getMonorepoProjects } from './pnpm-utils.mjs';

const NPM_REGISTRY = 'https://registry.npmjs.org';

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
		const versionName = `${pkg.name}@${pkg.version}`;

		try {
			const res = await setDistTag(pkg.name, pkg.version, 'latest', token);

			if (res.ok) {
				console.log(`Set ${versionName} as latest`);
			} else {
				const body = await res.text().catch(() => '');
				console.error(`Failed to set ${versionName} as latest: HTTP ${res.status} ${body}`);
				failures.push(versionName);
			}
		} catch (err) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`Failed to set ${versionName} as latest: ${message}`);
			failures.push(versionName);
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
