/**
 * Detects packages in the monorepo that have not yet been published to npm.
 *
 * Packages that are new (never published) cannot be released via OIDC Trusted
 * Publishing because Trusted Publishing requires the package to already exist
 * on npm with the publisher configured first.
 *
 * New packages need an initial token-based publish before the workflow can
 * configure Trusted Publishing.
 *
 * Exit codes:
 *   0 – All public packages exist on npm, or --report-only was used
 *   1 – One or more public packages have never been published
 */

import { relative } from 'node:path';

import { writeGithubOutput } from './github-helpers.mjs';
import { getMonorepoProjects } from './pnpm-utils.mjs';

const reportOnly = process.argv.includes('--report-only');
const strict = process.argv.includes('--strict');

const packages = await getMonorepoProjects();

const newPackages = [];
let registryCheckFailed = false;

for (const { name, path, private: isPrivate } of packages) {
	if (isPrivate) continue;

	// Scoped packages must be encoded: @n8n/foo → @n8n%2Ffoo
	const encodedName = name.startsWith('@') ? name.replace('/', '%2F') : name;
	const url = `https://registry.npmjs.org/${encodedName}`;

	try {
		console.log(`Checking if ${name} exists...`);
		const response = await fetch(url, { method: 'HEAD' });
		if (response.status === 404) {
			newPackages.push({ name, path: relative(process.cwd(), path) });
		} else if (!response.ok && response.status !== 405) {
			// 405 = Method Not Allowed for HEAD (some registries), not an error
			registryCheckFailed = true;
			console.log(
				`::warning::Unexpected HTTP ${response.status} when checking npm registry for "${name}".`,
			);
		}
	} catch (error) {
		registryCheckFailed = true;
		console.log(`::warning::Could not reach npm registry for "${name}": ${error.message}.`);
	}
}

const output = {
	packages: newPackages.map(({ name }) => name).join(','),
	'packages-json': JSON.stringify(newPackages),
};
console.log(` -- Writing to github output: ${JSON.stringify(output)}`);
writeGithubOutput(output);

if (strict && registryCheckFailed) {
	console.error('Could not check every public package on the npm registry.');
	process.exit(1);
}

if (newPackages.length === 0) {
	const publicCount = packages.filter((p) => !p.private).length;
	console.log(`✅ All ${publicCount} public packages exist on npm.`);
	process.exit(0);
}

console.log(`

❌ New unpublished packages detected!

The following packages do not yet exist on npm and cannot be published via
OIDC Trusted Publishing until they have had an initial token-based publish:

`);

for (const { name } of newPackages) {
	console.log(
		`::error::Package "${name}" has never been published to npm. An initial token-based publish is required before it can use OIDC Trusted Publishing.`,
	);
}

console.log(`
Run the Release: Setup Trusted Publishing workflow to publish an initial
throwaway version and configure release-publish.yml as the trusted publisher.

`);

process.exit(reportOnly ? 0 : 1);
