#!/usr/bin/env node
/**
 * Cleanup GHCR images for n8n CI
 *
 * Usage:
 *   node cleanup-ghcr-images.mjs --pr <number>   # Delete all pr-{number}-* tags (early termination)
 *   node cleanup-ghcr-images.mjs --all           # Delete all pr-* images (parallel pagination)
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const ORG = 'n8n-io';
const PACKAGES = ['n8n', 'runners'];
const [mode, value] = process.argv.slice(2);

if (!['--pr', '--all'].includes(mode) || (mode === '--pr' && !value)) {
	console.error('Usage: cleanup-ghcr-images.mjs --pr <number> | --all');
	process.exit(1);
}

async function ghApi(path) {
	const { stdout } = await execAsync(
		`gh api "/orgs/${ORG}/packages/container/${path}"`,
	);
	return JSON.parse(stdout);
}

async function ghDelete(path) {
	await execAsync(`gh api --method DELETE "/orgs/${ORG}/packages/container/${path}"`);
}

async function fetchPage(pkg, page) {
	try {
		return await ghApi(`${pkg}/versions?per_page=100&page=${page}`);
	} catch (err) {
		if (err.code === 1 && err.stderr?.includes('404')) return [];
		throw new Error(`Failed to fetch ${pkg} page ${page}: ${err.message}`);
	}
}

const isPrImage = (v, prNum) => {
	const tags = v.metadata?.container?.tags || [];
	return prNum ? tags.some((t) => t.startsWith(`pr-${prNum}-`)) : tags.some((t) => t.startsWith('pr-'));
};

async function getVersionsForPr(pkg, prNumber) {
	const versions = [];
	let emptyPages = 0;

	for (let page = 1; ; page++) {
		const batch = await fetchPage(pkg, page);
		if (!batch.length) break;

		const matches = batch.filter((v) => isPrImage(v, prNumber));
		if (matches.length) {
			versions.push(...matches);
			emptyPages = 0;
		} else if (++emptyPages >= 3) {
			console.log(`  Early termination after ${page} pages`);
			break;
		}
		if (batch.length < 100) break;
	}
	return versions;
}

async function getVersionsForAll(pkg) {
	const versions = [];
	const firstPage = await fetchPage(pkg, 1);
	if (!firstPage.length) return [];

	versions.push(...firstPage.filter((v) => isPrImage(v)));
	if (firstPage.length < 100) return versions;

	for (let page = 2; ; page += 10) {
		const batches = await Promise.all(
			Array.from({ length: 10 }, (_, i) => fetchPage(pkg, page + i)),
		);
		let done = false;
		for (const batch of batches) {
			if (!batch.length || batch.length < 100) done = true;
			versions.push(...batch.filter((v) => isPrImage(v)));
			if (!batch.length) break;
		}
		if (done) break;
	}
	return versions;
}

let hasErrors = false;

for (const pkg of PACKAGES) {
	console.log(`Processing ${pkg}...`);
	let consecutiveErrors = 0;

	const toDelete =
		mode === '--pr' ? await getVersionsForPr(pkg, value) : await getVersionsForAll(pkg);

	if (!toDelete.length) {
		console.log(`  No matching images found`);
		continue;
	}

	for (const v of toDelete) {
		try {
			await ghDelete(`${pkg}/versions/${v.id}`);
			console.log(`  Deleted ${v.metadata.container.tags.join(',')}`);
			consecutiveErrors = 0;
		} catch (err) {
			console.error(`  Failed to delete ${v.id}: ${err.message}`);
			hasErrors = true;
			if (++consecutiveErrors >= 3) {
				throw new Error('Too many consecutive delete failures, aborting');
			}
		}
	}
}

if (hasErrors) process.exit(1);
