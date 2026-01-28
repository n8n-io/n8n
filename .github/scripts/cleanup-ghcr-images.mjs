#!/usr/bin/env node
/**
 * Cleanup GHCR images for n8n CI
 *
 * Modes:
 *   --tag <tag>     Delete exact tag (merge queue cleanup - single image)
 *   --pr <number>   Delete all pr-{number}-* tags (PR cleanup - all runs for a PR)
 *   --stale <days>  Delete pr-* images older than N days (weekly scheduled cleanup)
 *
 * Context:
 *   - PR runs use --pr to clean all images from failed/retried commits
 *   - Merge queue runs use --tag since PR number isn't available (image tagged pr--{run_id})
 *   - Weekly cron uses --stale to catch any orphaned images
 */
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);
const ORG = 'n8n-io';
const PACKAGES = ['n8n', 'runners'];
const [mode, rawValue] = process.argv.slice(2);

if (!['--tag', '--pr', '--stale'].includes(mode) || !rawValue) {
	console.error('Usage: cleanup-ghcr-images.mjs --tag <tag> | --pr <number> | --stale <days>');
	process.exit(1);
}

const value = mode === '--stale' ? parseInt(rawValue, 10) : rawValue;
if (mode === '--stale' && (isNaN(value) || value <= 0)) {
	console.error('Error: --stale requires a positive number of days');
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

const isStale = (v, days) => {
	const cutoff = Date.now() - days * 86400000;
	return isPrImage(v) && new Date(v.created_at) < cutoff;
};

async function getVersionsForTag(pkg, tag) {
	const batch = await fetchPage(pkg, 1);
	const match = batch.find((v) => v.metadata?.container?.tags?.includes(tag));
	return match ? [match] : [];
}

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

async function getVersionsForStale(pkg, days) {
	const versions = [];
	const cutoff = Date.now() - days * 86400000;
	// Use 2x cutoff as safety window for early termination
	const earlyExitCutoff = Date.now() - days * 2 * 86400000;
	let pagesWithoutPrImages = 0;

	const firstPage = await fetchPage(pkg, 1);
	if (!firstPage.length) return [];

	for (const v of firstPage) {
		if (isStale(v, days)) versions.push(v);
	}
	if (firstPage.length < 100) return versions;

	for (let page = 2; ; page += 10) {
		const batches = await Promise.all(
			Array.from({ length: 10 }, (_, i) => fetchPage(pkg, page + i)),
		);
		let done = false;
		for (const batch of batches) {
			if (!batch.length || batch.length < 100) done = true;

			let hasPrImages = false;
			for (const v of batch) {
				if (isPrImage(v)) {
					hasPrImages = true;
					if (new Date(v.created_at) < cutoff) versions.push(v);
				}
			}

			// Early termination: if we've gone through pages without finding
			// any PR images and all items are older than 2x cutoff, we're past
			// the PR image window
			if (!hasPrImages) {
				pagesWithoutPrImages++;
				const oldestInBatch = batch[batch.length - 1];
				if (
					pagesWithoutPrImages >= 3 &&
					oldestInBatch &&
					new Date(oldestInBatch.created_at) < earlyExitCutoff
				) {
					console.log(`  Early termination at page ${page + batches.indexOf(batch)}`);
					done = true;
				}
			} else {
				pagesWithoutPrImages = 0;
			}

			if (!batch.length || done) break;
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
		mode === '--tag'
			? await getVersionsForTag(pkg, value)
			: mode === '--pr'
				? await getVersionsForPr(pkg, value)
				: await getVersionsForStale(pkg, value);

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
