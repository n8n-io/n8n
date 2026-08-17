#!/usr/bin/env node
/**
 * Keeps a bundle integration branch (`bundle/2.x`, `bundle/1.x` in n8n-io/n8n-private) in
 * sync with its base by MERGING the base into it.
 *
 * These branches are APPEND-ONLY: fix PRs target them, and rewriting a branch that receives
 * PRs orphans the copies of its commits those PR branches already contain — every such PR's
 * merge base regresses to an old base commit, and GitHub then shows it carrying everyone
 * else's fixes, in the commit list and in the diff. It compounds: each time an author
 * refreshes their branch between rewrites, it picks up another generation of the same fixes
 * and starts conflicting with itself. Squash-merging a fix INTO the branch is safe, which is
 * why only a rewrite breaks this.
 *
 * The cost of merging is a merge commit per run, plus already-published fixes staying in the
 * branch's log (the rebase used to drop them as empty). Neither reaches anything downstream:
 * a bundle is published as one squashed, deliberately obfuscated commit, and the squash is
 * taken from the tree, not the history. For a list of what a bundle actually carries, read
 * the fix PRs merged into the branch since the last cut, not `base..bundle`.
 *
 * The content pushed is verified to be exactly the tree `git merge-tree` says a merge of the
 * two sides produces; a mismatch, or a conflict marker, fails the run instead of pushing.
 *
 * FAIL LOUD: this script never resolves a conflict. A conflict is detected before the working
 * tree is touched, so the branch is left exactly as it was; a human merges the base in
 * locally, resolves, and pushes — and that resolution then lives in the merge commit instead
 * of being re-litigated on every later run. Contrast `sync-master-to-3x.mjs`, which
 * auto-resolves mechanical files and opens a conflict PR.
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

/**
 * One fetch-merge-push cycle. `status: 'rejected'` means the branch moved under us — the
 * caller re-runs from a fresh fetch rather than forcing anything.
 */
function mergeBaseIntoBundle({ git, log, bundle, base, remote }) {
	// Pin both sides to the fetched SHAs — fetching by URL never updates the origin/* tracking
	// refs, so FETCH_HEAD is the only handle. Base first: the second fetch overwrites it.
	git(['fetch', remote, base]);
	const baseSha = git(['rev-parse', 'FETCH_HEAD']);
	git(['fetch', remote, bundle]);
	git(['checkout', '--force', '-B', bundle, 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (isAncestor(git, baseSha, preHead)) {
		log(`${bundle} already contains ${base} (${baseSha}); nothing to sync.`);
		return { status: 'current' };
	}

	const pending = git([
		'log',
		'--no-merges',
		'--reverse',
		'--format=%h %s',
		`${baseSha}..${preHead}`,
	]);
	log(`Merging ${base} ${baseSha} into ${bundle}. Commits on ${bundle}:\n${pending || '(none)'}`);

	// The content the merge must produce — and whether the two sides conflict at all. Computed
	// without touching the working tree, so a conflict costs the branch nothing.
	const merged = mergeTree(git, preHead, baseSha);
	if (!merged.ok) {
		const paths = merged.conflictedPaths;
		log(
			annotation(
				`${bundle} is out of sync`,
				`${base} conflicts with ${bundle} on: ${paths.join(', ') || '(unknown)'}\n` +
					`${bundle} is untouched. Merge ${base} into ${bundle} locally, resolve, push, then re-run this workflow.`,
			),
		);
		throw new Error(`${base} conflicts with ${bundle}; leaving ${bundle} untouched.`);
	}

	// Fast-forward when the branch carries nothing of its own, so an empty queue records no
	// merge. Otherwise the bundle stays the first parent, keeping `--first-parent` a list of
	// the fixes. An explicit subject, because merging a raw SHA would otherwise read
	// `Merge commit '<sha>'`.
	git(['merge', '--no-edit', '-m', `Merge ${base} into ${bundle}`, baseSha]);

	assertTreeMatches(git, merged.tree);
	assertNoMarkers(git);

	const push = attempt(git, ['push', remote, `HEAD:refs/heads/${bundle}`]);
	if (!push.ok) {
		// Not a force push, so this is git refusing a non-fast-forward: a fix landed mid-run.
		if (push.out) log(push.out);
		return { status: 'rejected' };
	}
	log(`Merged ${base} into ${bundle} — nothing rewritten.`);
	return { status: 'merged' };
}

export function syncBundleBranch({ git = runGit, env = process.env, log = console.log } = {}) {
	const bundle = required(env, 'BUNDLE_BRANCH');
	const base = required(env, 'BASE_BRANCH');
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	const repo = required(env, 'GITHUB_REPOSITORY');
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);
	// A merge must never sit waiting for an editor.
	git(['config', 'core.editor', 'true']);

	// Every remote operation goes through this URL: checkout does not persist credentials, and
	// the repository is private, so `git fetch origin` on its own is unauthenticated.
	const remote = `https://x-access-token:${token}@github.com/${repo}.git`;

	const first = mergeBaseIntoBundle({ git, log, bundle, base, remote });
	if (first.status !== 'rejected') return first;

	log(`${bundle} moved while syncing; retrying from a fresh fetch.`);
	const retry = mergeBaseIntoBundle({ git, log, bundle, base, remote });
	if (retry.status === 'rejected') {
		throw new Error(`${bundle} kept moving while syncing; re-run this workflow.`);
	}
	return retry;
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		syncBundleBranch();
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}
