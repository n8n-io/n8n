#!/usr/bin/env node
/**
 * Decides whether an image that n8n publishes must build again.
 *
 * The publish workflows trigger on any change to docker/docker-bake.hcl. Most
 * changes there do not touch their image, and a rebuild moves the image's tag
 * to a new digest. This script compares the resolved bake inputs of the
 * targets (Dockerfile, stage, build args) and the given paths between two
 * commits.
 *
 * Usage: node bake-inputs-changed.mjs --base <commit> --targets a,b --paths p,q
 * Writes changed=true|false to $GITHUB_OUTPUT.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const BAKE_FILE = 'docker/docker-bake.hcl';

/** The inputs that decide the image: Dockerfile, stage and build args. */
export function bakeInputs(plan, targets) {
	const inputs = {};
	for (const name of targets) {
		const target = plan.target?.[name];
		inputs[name] = target
			? { dockerfile: target.dockerfile, target: target.target ?? null, args: target.args ?? {} }
			: null;
	}
	return inputs;
}

/** Names of the targets whose inputs differ. A target missing on either side differs. */
export function changedTargets(before, after) {
	const canonical = (value) =>
		JSON.stringify(value, (_key, v) =>
			v && typeof v === 'object' && !Array.isArray(v)
				? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
				: v,
		);
	return Object.keys(after).filter(
		(name) => !before[name] || !after[name] || canonical(before[name]) !== canonical(after[name]),
	);
}

function resolve(cwd, targets) {
	// Bake reads environment variables with the names of its variables as
	// overrides. Resolve from the file alone.
	const env = { PATH: process.env.PATH, HOME: process.env.HOME };
	if (process.env.DOCKER_CONFIG) env.DOCKER_CONFIG = process.env.DOCKER_CONFIG;
	const out = execFileSync('docker', ['buildx', 'bake', '-f', BAKE_FILE, '--print', ...targets], {
		cwd,
		env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'ignore'],
	});
	return bakeInputs(JSON.parse(out), targets);
}

function pathsChanged(base, paths) {
	if (paths.length === 0) return false;
	try {
		execFileSync('git', ['diff', '--quiet', base, 'HEAD', '--', ...paths]);
		return false;
	} catch {
		return true;
	}
}

function main() {
	const { values } = parseArgs({
		options: { base: { type: 'string' }, targets: { type: 'string' }, paths: { type: 'string' } },
	});
	const targets = (values.targets ?? '').split(',').filter(Boolean);
	const paths = (values.paths ?? '').split(',').filter(Boolean);
	if (!values.base || targets.length === 0) throw new Error('--base and --targets are required');

	let reasons = [];
	if (pathsChanged(values.base, paths)) reasons.push(`files under ${paths.join(', ')}`);

	const worktree = mkdtempSync(path.join(tmpdir(), 'bake-base-'));
	try {
		execFileSync('git', ['worktree', 'add', '--detach', worktree, values.base], {
			stdio: 'ignore',
		});
		let before;
		try {
			before = resolve(worktree, targets);
		} catch {
			before = Object.fromEntries(targets.map((name) => [name, null]));
		}
		const changed = changedTargets(before, resolve(process.cwd(), targets));
		if (changed.length > 0) reasons.push(`bake inputs of ${changed.join(', ')}`);
	} finally {
		execFileSync('git', ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' });
		rmSync(worktree, { recursive: true, force: true });
	}

	const result = reasons.length > 0;
	console.log(result ? `Changed: ${reasons.join('; ')}.` : 'No input of these images changed.');
	if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${result}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
