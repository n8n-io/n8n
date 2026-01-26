#!/usr/bin/env node
/**
 * Cleanup GHCR images for n8n CI
 *
 * Usage:
 *   node cleanup-ghcr-images.mjs --tag <tag>     # Delete specific tag
 *   node cleanup-ghcr-images.mjs --pr <number>   # Delete all pr-{number}-* tags
 *   node cleanup-ghcr-images.mjs --stale <days>  # Delete all pr-* images older than N days
 *
 * Environment:
 *   GH_TOKEN     GitHub token with packages:write permission (required)
 */

import { execSync } from 'child_process';

const ORG = 'n8n-io';
const PACKAGES = ['n8n', 'runners'];

let hasErrors = false;

function parseArgs() {
	const args = process.argv.slice(2);
	const options = {};

	for (let i = 0; i < args.length; i++) {
		switch (args[i]) {
			case '--tag':
				if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
					console.error('Error: --tag requires a value');
					process.exit(1);
				}
				options.tag = args[++i];
				break;
			case '--pr':
				if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
					console.error('Error: --pr requires a value');
					process.exit(1);
				}
				options.pr = args[++i];
				break;
			case '--stale': {
				if (i + 1 >= args.length || args[i + 1].startsWith('--')) {
					console.error('Error: --stale requires a value');
					process.exit(1);
				}
				const days = parseInt(args[++i], 10);
				if (isNaN(days) || days <= 0) {
					console.error('Error: --stale requires a positive number');
					process.exit(1);
				}
				options.stale = days;
				break;
			}
		}
	}

	const modes = [options.tag, options.pr, options.stale].filter(Boolean).length;
	if (modes !== 1) {
		console.error('Error: Specify exactly one of --tag, --pr, or --stale');
		process.exit(1);
	}

	return options;
}

function gh(args, { json = true, ignoreError = false } = {}) {
	const cmd = `gh api ${args}`;
	try {
		const output = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
		return json ? JSON.parse(output) : output;
	} catch (error) {
		if (ignoreError) return json ? [] : '';
		throw error;
	}
}

function verifyAuth() {
	try {
		gh(`"/orgs/${ORG}/packages?package_type=container&per_page=1" -H "Accept: application/vnd.github+json"`);
	} catch {
		console.error('Error: Failed to authenticate with GitHub API. Check GH_TOKEN.');
		process.exit(1);
	}
}

function getPackageVersions(packageName) {
	// Paginate through all versions
	const versions = [];
	let page = 1;
	while (true) {
		const batch = gh(
			`"/orgs/${ORG}/packages/container/${packageName}/versions?per_page=100&page=${page}" -H "Accept: application/vnd.github+json"`,
			{ ignoreError: true },
		);
		if (!batch.length) break;
		versions.push(...batch);
		if (batch.length < 100) break;
		page++;
	}
	return versions;
}

function deleteVersion(packageName, versionId, tags) {
	const tagStr = tags.join(', ');

	try {
		gh(
			`--method DELETE "/orgs/${ORG}/packages/container/${packageName}/versions/${versionId}" -H "Accept: application/vnd.github+json"`,
			{ json: false },
		);
		console.log(`  Deleted ${packageName}:${tagStr}`);
	} catch {
		console.error(`  Error: Failed to delete ${packageName}:${tagStr}`);
		hasErrors = true;
	}
}

function deleteByTag(tag) {
	console.log(`Deleting images with tag: ${tag}`);

	for (const packageName of PACKAGES) {
		const versions = getPackageVersions(packageName);
		const match = versions.find((v) => v.metadata?.container?.tags?.includes(tag));

		if (match) {
			deleteVersion(packageName, match.id, match.metadata.container.tags);
		} else {
			console.log(`  ${packageName}:${tag} not found`);
		}
	}
}

function deleteByPr(prNumber) {
	const prefix = `pr-${prNumber}-`;
	console.log(`Deleting all images matching: ${prefix}*`);

	for (const packageName of PACKAGES) {
		const versions = getPackageVersions(packageName);
		const matches = versions.filter((v) =>
			v.metadata?.container?.tags?.some((t) => t.startsWith(prefix)),
		);

		if (matches.length === 0) {
			console.log(`  No ${packageName} images found for PR #${prNumber}`);
			continue;
		}

		for (const version of matches) {
			deleteVersion(packageName, version.id, version.metadata.container.tags);
		}
	}
}

function deleteStale(days) {
	const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
	console.log(`Deleting pr-* images older than ${days} days (before ${cutoff.toISOString()})`);

	for (const packageName of PACKAGES) {
		const versions = getPackageVersions(packageName);
		const stale = versions.filter((v) => {
			const tags = v.metadata?.container?.tags || [];
			const isPrImage = tags.some((t) => t.startsWith('pr-'));
			const createdAt = new Date(v.created_at);
			return isPrImage && createdAt < cutoff;
		});

		if (stale.length === 0) {
			console.log(`  No stale ${packageName} images found`);
			continue;
		}

		console.log(`  Found ${stale.length} stale ${packageName} images`);
		for (const version of stale) {
			deleteVersion(packageName, version.id, version.metadata.container.tags);
		}
	}
}

// Main
const options = parseArgs();

verifyAuth();

if (options.tag) {
	deleteByTag(options.tag);
} else if (options.pr) {
	deleteByPr(options.pr);
} else if (options.stale) {
	deleteStale(options.stale);
}

console.log('Done');

if (hasErrors) {
	process.exit(1);
}
