/**
 * Detects packages in the monorepo that have not yet been published to npm.
 *
 * Packages that are new (never published) cannot be released via OIDC Trusted
 * Publishing because Trusted Publishing requires the package to already exist
 * on npm with the publisher configured first.
 *
 * New packages must be handled manually:
 *   1. Published once using an NPM token
 *   2. Configured with Trusted Publishing on npmjs.com
 *
 * Exit codes:
 *   0 – All public packages exist on npm
 *   1 – One or more public packages have never been published
 */

import child_process from 'child_process';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

const packages = JSON.parse((await exec('pnpm ls -r --only-projects --json')).stdout);

const newPackages = [];

for (const { name, private: isPrivate } of packages) {
	if (isPrivate) continue;

	// Scoped packages must be encoded: @n8n/foo → @n8n%2Ffoo
	const encodedName = name.startsWith('@') ? name.replace('/', '%2F') : name;
	const url = `https://registry.npmjs.org/${encodedName}`;

	try {
		const response = await fetch(url, { method: 'HEAD' });
		if (response.status === 404) {
			newPackages.push(name);
		} else if (!response.ok && response.status !== 405) {
			// 405 = Method Not Allowed for HEAD (some registries), not an error
			console.log(
				`::warning::Unexpected HTTP ${response.status} when checking npm registry for "${name}". Skipping check.`,
			);
		}
	} catch (error) {
		console.log(
			`::warning::Could not reach npm registry for "${name}": ${error.message}. Skipping check.`,
		);
	}
}

if (newPackages.length === 0) {
	const publicCount = packages.filter((p) => !p.private).length;
	console.log(`✅ All ${publicCount} public packages exist on npm.`);
	process.exit(0);
}

console.log(`

❌ New unpublished packages detected!

The following packages do not yet exist on npm and cannot be published via
OIDC Trusted Publishing until they have been published at least once manually:

`);

for (const pkg of newPackages) {
	console.log(`  - ${pkg}`);
	console.log(
		`::error::Package "${pkg}" has never been published to npm. A manual first-publish with an NPM token is required before it can use OIDC Trusted Publishing.`,
	);
}

console.log(`
Steps to unblock the release, for each new package listed above:

  1. Publish the package once manually using an NPM token:
			cd to/where/package/lives
			pnpm login
			pnpm publish --access public

  2. Configure Trusted Publishing on npmjs.com for each new package:
       https://docs.npmjs.com/trusted-publishers

     Use the following settings:
       Repository owner : n8n-io
       Repository name  : n8n
       Workflow filename: release-publish.yml

  3. Re-run the Release: Publish workflow.

`);
process.exit(1);
