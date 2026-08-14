#!/usr/bin/env node
/**
 * Keeps a bundle integration branch (`bundle/2.x`, `bundle/1.x` in n8n-io/n8n-private) in
 * sync with its base by REPLAYING (rebasing) the bundle-only commits onto the base and
 * force-pushing — so a clean run adds NO commit of its own and the branch stays exactly
 * "base + the fixes not yet published".
 *
 * Why a rebase and not a merge: the bases move constantly, so merging added a merge commit
 * on nearly every run, and the bundle is published as a single squashed, deliberately
 * obfuscated commit anyway — SHAs and dates on these branches buy nothing, while a readable
 * `base..bundle` list of pending fixes buys a lot.
 *
 * The content pushed is verified to be exactly the tree that merging the bundle branch with
 * its base produces (`git merge-tree`); a mismatch fails the run instead of pushing. That
 * invariant is what makes rewriting a shared branch safe — including the case where every
 * pending fix has since been published and is correctly dropped, since the merge tree then
 * equals the base's tree too.
 *
 * FAIL LOUD: this script never resolves a conflict. A conflict is detected before the working
 * tree is touched, so the branch is left exactly as it was; a human rebases onto the base
 * locally, force-pushes, and re-dispatches the workflow. Contrast `sync-master-to-3x.mjs`,
 * which auto-resolves mechanical files and opens a conflict PR.
 *
 * Runs from a full checkout (fetch-depth 0) of any branch. Assumes credentials are NOT
 * persisted by checkout — every fetch and the push go through an explicit token URL, which
 * matters because the repository is private.
 *
 * Env: BUNDLE_BRANCH (e.g. bundle/2.x), BASE_BRANCH (e.g. master),
 *      GH_TOKEN (installation token with contents:write),
 *      GITHUB_REPOSITORY (owner/repo, auto-provided by Actions).
 * Requires git 2.38+ (`merge-tree --write-tree`).
 */

import {
	assertNoMarkers,
	assertTreeMatches,
	attempt,
	isAncestor,
	mergeTree,
	runGit,
} from './branch-replay.mjs';

const BOT_NAME = 'n8n-assistant[bot]';
const BOT_EMAIL = 'n8n-assistant[bot]@users.noreply.github.com';

function required(env, name) {
	const value = env[name];
	if (!value) throw new Error(`${name} env var is required`);
	return value;
}

// A GitHub annotation is one line: fold anything multi-line into the URL-escaped form so the
// whole message survives in the run's error list.
export function annotation(title, message) {
	return `::error title=${title}::${message.replace(/\n/g, '%0A')}`;
}

export function rebaseBundleBranch({ git = runGit, env = process.env, log = console.log } = {}) {
	const bundle = required(env, 'BUNDLE_BRANCH');
	const base = required(env, 'BASE_BRANCH');
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	const repo = required(env, 'GITHUB_REPOSITORY');
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);
	// A stalled `rebase --continue` must never sit waiting for an editor.
	git(['config', 'core.editor', 'true']);

	// Every remote operation goes through this URL: checkout does not persist credentials, and
	// the repository is private, so `git fetch origin` on its own is unauthenticated.
	const remote = `https://x-access-token:${token}@github.com/${repo}.git`;

	// Pin both sides to the fetched SHAs — fetching by URL never updates the origin/* tracking
	// refs, so FETCH_HEAD is the only handle. Base first: the second fetch overwrites it.
	git(['fetch', remote, base]);
	const baseSha = git(['rev-parse', 'FETCH_HEAD']);
	git(['fetch', remote, bundle]);
	git(['checkout', '-B', bundle, 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (isAncestor(git, baseSha, preHead)) {
		log(`${bundle} already contains ${base} (${baseSha}); nothing to replay.`);
		return { status: 'current' };
	}

	const queue = git([
		'log',
		'--no-merges',
		'--reverse',
		'--format=%h %s',
		`${baseSha}..${preHead}`,
	]);
	log(`Replaying ${bundle} onto ${base} ${baseSha}:\n${queue || '(none)'}`);

	// The content the replay must produce — and whether the two sides conflict at all. Computed
	// without touching the working tree, so a conflict costs the branch nothing.
	const merged = mergeTree(git, preHead, baseSha);
	if (!merged.ok) {
		const paths = merged.conflictedPaths;
		log(
			annotation(
				`${bundle} is out of sync`,
				`${base} conflicts with ${bundle} on: ${paths.join(', ') || '(unknown)'}\n` +
					`${bundle} is untouched. Rebase it onto ${base} locally, force-push, then re-run this workflow.`,
			),
		);
		throw new Error(`${base} conflicts with ${bundle}; leaving ${bundle} untouched.`);
	}

	// `--empty=drop` (and the merge backend's default `--no-reapply-cherry-picks`) drop the
	// fixes the base already carries — which is every fix that has since been published, since
	// it comes back through the base as part of the squashed bundle commit.
	const replay = attempt(git, ['rebase', '--empty=drop', baseSha]);
	if (!replay.ok) {
		if (replay.out) log(replay.out);
		attempt(git, ['rebase', '--abort']);
		log(
			annotation(
				`${bundle} could not be replayed`,
				`The content of ${bundle} and ${base} reconciles, but the commits no longer apply ` +
					`individually — usually a past conflict that was resolved in a merge commit, which ` +
					`leaves no patch to replay.\n${bundle} is untouched. Rebase it onto ${base} locally, ` +
					`force-push, then re-run this workflow.`,
			),
		);
		throw new Error(`Could not replay ${bundle} onto ${base}; needs a human.`);
	}

	assertTreeMatches(git, merged.tree);
	assertNoMarkers(git);

	// The lease pins the tip that was replayed from, so a fix PR merging mid-run is never
	// overwritten — the push is rejected and the next run picks the fix up.
	git([
		'push',
		`--force-with-lease=refs/heads/${bundle}:${preHead}`,
		remote,
		`HEAD:refs/heads/${bundle}`,
	]);
	log(`Replayed ${bundle} onto ${base} — no merge commit created.`);
	return { status: 'replayed' };
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		rebaseBundleBranch();
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}
