#!/usr/bin/env node
/**
 * Decides whether an image that n8n publishes must build.
 *
 * The publish workflows run on any change to docker/docker-bake.hcl, but most
 * changes there do not touch their image, and a rebuild moves the image's tag
 * to a new digest. The image changed when, between two commits, a target's
 * resolved Dockerfile, stage, build args or tags changed, or its Dockerfile
 * content changed. A --paths file or directory that the Dockerfile copies in
 * (patches, check scripts) counts the same way. On a PR, a change to a
 * --pr-paths file also counts, so that the PR runs the changed build steps. A
 * dispatch always builds.
 *
 * Usage: node bake-inputs-changed.mjs --event <github event> --base <commit>
 *   --targets a,b [--paths p,q] [--pr-paths p,q]
 * Writes changed=true|false to $GITHUB_OUTPUT.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

const BAKE_FILE = 'docker/docker-bake.hcl';

// A digest decides a pinned image; its tag is documentation only.
const PINNED_IMAGE = /^([^\s:@]+(?::\d+)?\/?[^\s:@]*):[^\s@]+(@sha256:[0-9a-f]{64})$/;
const withoutPinTags = (args) =>
	Object.fromEntries(
		Object.entries(args).map(([key, value]) => [key, value.replace(PINNED_IMAGE, '$1$2')]),
	);

/** The inputs that decide the image. */
export function bakeInputs(plan, targets) {
	const inputs = {};
	for (const name of targets) {
		const target = plan.target?.[name];
		inputs[name] = target
			? {
					dockerfile: target.dockerfile,
					target: target.target ?? null,
					args: withoutPinTags(target.args ?? {}),
					tags: target.tags ?? [],
				}
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
	// Bake reads an environment variable with the name of a bake variable as an
	// override. Resolve from the file alone.
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

function filesChanged(base, files) {
	if (files.length === 0) return false;
	try {
		execFileSync('git', ['diff', '--quiet', base, 'HEAD', '--', ...files]);
		return false;
	} catch {
		return true;
	}
}

function decide({ event, base, targets, paths, prPaths }) {
	if (event === 'workflow_dispatch') return 'a dispatch always builds';
	if (!base || /^0+$/.test(base)) return 'no base commit to compare with';

	try {
		execFileSync('git', ['cat-file', '-e', `${base}^{commit}`], { stdio: 'ignore' });
	} catch {
		execFileSync('git', ['fetch', '--no-tags', '--depth=1', 'origin', base], { stdio: 'ignore' });
	}

	const after = resolve(process.cwd(), targets);
	const worktree = mkdtempSync(path.join(tmpdir(), 'bake-base-'));
	let before;
	try {
		execFileSync('git', ['worktree', 'add', '--detach', worktree, base], { stdio: 'ignore' });
		try {
			before = resolve(worktree, targets);
		} catch {
			before = Object.fromEntries(targets.map((name) => [name, null]));
		}
	} finally {
		execFileSync('git', ['worktree', 'remove', '--force', worktree], { stdio: 'ignore' });
		rmSync(worktree, { recursive: true, force: true });
	}

	const changed = changedTargets(before, after);
	if (changed.length > 0) return `bake inputs of ${changed.join(', ')} changed`;

	const dockerfiles = [...new Set(Object.values(after).map((input) => input.dockerfile))];
	if (filesChanged(base, dockerfiles)) return `${dockerfiles.join(', ')} changed`;
	if (filesChanged(base, paths)) return `${paths.join(', ')} changed`;
	if (event === 'pull_request' && filesChanged(base, prPaths))
		return `${prPaths.join(', ')} changed`;
	return null;
}

function main() {
	const { values } = parseArgs({
		options: {
			event: { type: 'string' },
			base: { type: 'string' },
			targets: { type: 'string' },
			paths: { type: 'string' },
			'pr-paths': { type: 'string' },
		},
	});
	const list = (value) => (value ?? '').split(',').filter(Boolean);
	const targets = list(values.targets);
	if (!values.event || targets.length === 0) throw new Error('--event and --targets are required');

	const reason = decide({
		event: values.event,
		base: values.base,
		targets,
		paths: list(values.paths),
		prPaths: list(values['pr-paths']),
	});
	console.log(reason ? `Build: ${reason}.` : 'Skip: no input of these images changed.');
	if (process.env.GITHUB_OUTPUT)
		appendFileSync(process.env.GITHUB_OUTPUT, `changed=${Boolean(reason)}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) main();
