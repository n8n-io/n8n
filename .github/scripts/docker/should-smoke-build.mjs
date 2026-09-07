#!/usr/bin/env node
/**
 * Decides whether a PR needs the no-cache Docker smoke build.
 *
 * pnpm-workspace.yaml is a trigger path because it pins the native deps the
 * smoke build compiles, but it changes ~daily while those pins change a few
 * times a year. The trigger stays coarse and is narrowed here by content.
 *
 * Usage: node should-smoke-build.mjs --base <ref> --changed-files <file>
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const WORKSPACE_FILE = 'pnpm-workspace.yaml';

const BUMP_ONLY = [/^pnpm-workspace\.yaml$/, /^pnpm-lock\.yaml$/, /(^|\/)package\.json$/];

export function isBumpOnly(files) {
	return files.length > 0 && files.every((f) => BUMP_ONLY.some((re) => re.test(f)));
}

// Packages pnpm may run build scripts for — read from the file so a newly
// added native dep is watched without editing this script.
export function buildableDeps(text) {
	const deps = new Set();
	let inSection = false;
	for (const line of text.split('\n')) {
		if (/^allowBuilds:/.test(line)) {
			inSection = true;
			continue;
		}
		if (inSection && /^\S/.test(line)) break;
		if (!inSection) continue;
		const match = line.match(/^\s+'?([^'":]+)'?:\s*true\s*$/);
		if (match) deps.add(match[1]);
	}
	return deps;
}

// Catalog pins, `catalogs:` entries and `patchedDependencies` are all keyed by
// package name, so one pass over the file covers every place a pin can move.
function pinsFor(text, deps) {
	const pins = [];
	for (const line of text.split('\n')) {
		const match = line.match(/^\s+'?([^'":]+?)'?(@[^'":]+)?'?:\s*(.+?)\s*$/);
		if (match && deps.has(match[1])) pins.push(line.trim());
	}
	return pins.sort();
}

export function nativePinsChanged(baseText, headText) {
	const baseDeps = buildableDeps(baseText);
	const headDeps = buildableDeps(headText);
	const union = new Set([...baseDeps, ...headDeps]);

	if (
		baseDeps.size !== headDeps.size ||
		[...union].some((d) => baseDeps.has(d) !== headDeps.has(d))
	) {
		return { changed: true, reason: 'the set of buildable dependencies changed' };
	}

	if (pinsFor(baseText, union).join('\n') !== pinsFor(headText, union).join('\n')) {
		return { changed: true, reason: 'a buildable dependency pin changed' };
	}

	return { changed: false, reason: 'no buildable dependency pin changed' };
}

function fileAt(ref, path) {
	try {
		return execFileSync('git', ['show', `${ref}:${path}`], { encoding: 'utf8' });
	} catch {
		return null;
	}
}

function main(argv) {
	const base = argv[argv.indexOf('--base') + 1];
	const files = readFileSync(argv[argv.indexOf('--changed-files') + 1], 'utf8')
		.split('\n')
		.map((f) => f.trim())
		.filter(Boolean);

	let build = true;
	let reason = 'a Docker-chain file changed';

	if (isBumpOnly(files)) {
		const baseText = fileAt(base, WORKSPACE_FILE);
		const headText = fileAt('HEAD', WORKSPACE_FILE);
		if (baseText === null || headText === null) {
			reason = `could not read ${WORKSPACE_FILE} on both sides of the diff`;
		} else {
			({ changed: build, reason } = nativePinsChanged(baseText, headText));
		}
	}

	console.log(`${build ? 'building' : 'skipping'}: ${reason}`);
	if (process.env.GITHUB_OUTPUT) {
		appendFileSync(process.env.GITHUB_OUTPUT, `build=${build}\n`);
	}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
	main(process.argv.slice(2));
}
