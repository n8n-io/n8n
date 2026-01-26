#!/usr/bin/env node
/**
 * Cleanup GHCR images for n8n CI
 *
 * Usage:
 *   node cleanup-ghcr-images.mjs --tag <tag>     # Delete specific tag
 *   node cleanup-ghcr-images.mjs --pr <number>   # Delete all pr-{number}-* tags
 *   node cleanup-ghcr-images.mjs --stale <days>  # Delete pr-* images older than N days
 */
import { execSync } from 'node:child_process';

const ORG = 'n8n-io';
const PACKAGES = ['n8n', 'runners'];
const [mode, rawValue] = process.argv.slice(2);
if (!['--tag', '--pr', '--stale'].includes(mode) || !rawValue) {
	console.error('Usage: cleanup-ghcr-images.mjs --tag|--pr|--stale <value>');
	process.exit(1);
}
const value = mode === '--stale' ? parseInt(rawValue, 10) : rawValue;
if (mode === '--stale' && (!Number.isFinite(value) || value <= 0)) {
	console.error('Error: --stale requires a positive number');
	process.exit(1);
}

let hasErrors = false;

function ghApi(path, del = false) {
	const method = del ? '--method DELETE ' : '';
	try {
		const out = execSync(
			`gh api ${method}"/orgs/${ORG}/packages/container/${path}" -H "Accept: application/vnd.github+json"`,
			{ encoding: 'utf8', stdio: 'pipe' },
		);
		return del ? null : JSON.parse(out);
	} catch {
		if (del) hasErrors = true;
		return null;
	}
}

function getVersions(pkg) {
	const versions = [];
	for (let page = 1; ; page++) {
		const batch = ghApi(`${pkg}/versions?per_page=100&page=${page}`);
		if (!batch?.length) break;
		versions.push(...batch);
		if (batch.length < 100) break;
	}
	return versions;
}

function shouldDelete(v) {
	const tags = v.metadata?.container?.tags || [];
	if (mode === '--tag') return tags.includes(value);
	if (mode === '--pr') return tags.some((t) => t.startsWith(`pr-${value}-`));
	if (mode === '--stale') {
		const cutoff = Date.now() - value * 86400000;
		return tags.some((t) => t.startsWith('pr-')) && new Date(v.created_at) < cutoff;
	}
	return false;
}

for (const pkg of PACKAGES) {
	const toDelete = getVersions(pkg).filter(shouldDelete);
	if (!toDelete.length) console.log(`No matching images found for ${pkg}`);
	for (const v of toDelete) {
		ghApi(`${pkg}/versions/${v.id}`, true);
		console.log(`Deleted ${pkg}:${v.metadata.container.tags.join(',')}`);
	}
}

if (hasErrors) process.exit(1);
