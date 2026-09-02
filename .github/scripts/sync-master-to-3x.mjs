#!/usr/bin/env node
/**
 * Syncs the master branch into the long-lived 3.x branch by REPLAYING (rebasing) the
 * 3.x-only commits on top of master.
 *
 * During the v3 development window, master carries normal feature work (behind opt-in
 * flags) and 3.x is "master + breaking-change commits". Keeping that literally true means
 * replaying, not merging: a merge would add a merge commit on every single run now that 3.x
 * has permanently diverged. So a clean sync force-pushes 3.x and adds NO commit of its own,
 * keeping every replayed commit intact — nothing is ever squashed, and authors are kept.
 *
 * Whatever route it takes, the content 3.x receives is verified to be exactly the tree that
 * merging 3.x with master produces (`git merge-tree`); a mismatch fails the run instead of
 * pushing. That invariant is what makes the rewrite safe.
 *
 * Three cases:
 *   1. The replay is clean            → force-push. No commit.
 *   2. The replay stalls, but 3.x's content still reconciles with master → an earlier
 *      conflict was resolved in a merge, which leaves no patch to replay. Replay again
 *      favouring the 3.x side (`-X theirs`), mirroring the side the resolved merge kept;
 *      the human's fix commit is in the queue and does the real work. Tree is then proven.
 *   3. The content does NOT reconcile → a genuinely new conflict. 3.x is left UNTOUCHED and a
 *      draft PR is opened on the sync branch carrying the conflict markers, attributed to the
 *      authors of the breaking commits behind the conflicted files. Syncs pause until it is
 *      merged.
 *
 * The conflict branch carries the conflict markers, so the resolver sees exactly what clashed
 * and the required checks stay red until they fix it in a commit of their own. That PR is
 * merged with the normal GitHub merge button — master's commits arrive as-is and the fix stays
 * its own commit. 3.x itself never has markers at its tip (nightly images build from it), and
 * the merge commit holding them is dropped from its history by the next replay.
 *
 * Runs from a checkout of the target branch (fetch-depth 0). Assumes credentials are NOT
 * persisted by checkout — pushes go through an explicit token URL.
 *
 * On conflict, emits `conflict_pr` and `conflict_owners` to $GITHUB_OUTPUT so a downstream
 * job can post to Slack.
 *
 * Env: GH_TOKEN (installation token with contents/pull-requests/issues write),
 *      GITHUB_REPOSITORY (owner/repo, auto-provided by Actions),
 *      SYNC_TARGET_BRANCH (optional — override 3.x to rehearse against a scratch branch).
 * Requires Node 18+ (global fetch), git 2.38+ (`merge-tree --write-tree`) and `gh` on PATH.
 *
 * See .github/DEVELOPING_V3.md for the full v3 development model.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import { conflictedFiles, breakingShas, resolveLogins, buildOutputs } from './sync-conflict-owners.mjs';

export const TARGET_BRANCH = '3.x';
export const SYNC_BRANCH = 'sync/master-to-3x';
export const CONFLICT_LABEL = 'automation:v3-sync';

const BOT_NAME = 'n8n-assistant[bot]';
const BOT_EMAIL = 'n8n-assistant[bot]@users.noreply.github.com';

// Real command runners. Each takes an args array and returns trimmed stdout,
// throwing on a non-zero exit (mirrors `set -e`). Injectable for tests.
const runGit = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
const runGh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();

// The branch to sync into. Overridable so the whole flow can be rehearsed end-to-end
// against a throwaway branch before it is pointed at the real 3.x.
export function targetBranch(env = process.env) {
	return env.SYNC_TARGET_BRANCH || TARGET_BRANCH;
}

// Run a command for its exit status: `{ ok, out }` instead of a throw. Used for the git
// commands whose non-zero exit is an expected answer, not a failure. stderr is captured
// rather than inherited, so an expected-to-fail probe doesn't spill into the run log.
export function attempt(run, args, opts = {}) {
	try {
		return { ok: true, out: run(args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }) ?? '' };
	} catch (error) {
		const out = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim();
		return { ok: false, out };
	}
}

// True when a previous conflict PR is still open — the halt gate.
export function hasOpenConflictPr(gh, label = CONFLICT_LABEL) {
	const out = gh(['pr', 'list', '--state', 'open', '--label', label, '--json', 'number']);
	return JSON.parse(out || '[]').length > 0;
}

export function isAncestor(git, maybeAncestor, descendant) {
	return attempt(git, ['merge-base', '--is-ancestor', maybeAncestor, descendant]).ok;
}

/**
 * The tree a merge of the two commits would produce — the definition of the content 3.x
 * should end up with, computed without touching the working tree.
 *
 * `ok: false` means the two sides genuinely conflict: there is a new conflict that no
 * existing commit on 3.x resolves.
 */
export function mergeTree(git, a, b) {
	const res = attempt(git, ['merge-tree', '--write-tree', a, b]);
	return { ok: res.ok, tree: res.ok ? res.out.split('\n')[0].trim() : '', out: res.out };
}

// Replay the 3.x-only commits onto master. Merge commits in the range (breaking PR merges,
// past sync merges) are flattened; commits already applied to master are dropped as empty.
// Individual commits, messages and authors are preserved — nothing is squashed.
export function tryRebase(git, masterSha, log = console.log, extraArgs = []) {
	const { ok, out } = attempt(git, ['rebase', ...extraArgs, masterSha]);
	if (!ok && out) log(out);
	return ok;
}

// The content guard for every push: whichever route produced HEAD, its tree must be exactly
// what merging 3.x with master yields.
export function assertTree(git, expectedTree) {
	const actual = git(['rev-parse', 'HEAD^{tree}']);
	if (actual !== expectedTree) {
		throw new Error(`Replayed tree ${actual} does not match the merge tree ${expectedTree}; refusing to push.`);
	}
}

// Conflict markers must never reach 3.x — nightly images build from it. git grep exits 0
// with matches, 1 with none and >1 on error, so an error must not be read as "clean".
export function assertNoMarkers(git, rev = 'HEAD') {
	const found = attempt(git, ['grep', '-I', '-l', '-e', '^<<<<<<< ', '-e', '^>>>>>>> ', rev]);
	if (found.ok) throw new Error(`Refusing to continue: conflict markers present in ${rev}:\n${found.out}`);
	if (found.out.includes('fatal:')) throw new Error(`Could not scan ${rev} for conflict markers:\n${found.out}`);
}

// Append key=value lines to $GITHUB_OUTPUT (no-op when running outside Actions).
export function writeGithubOutput(obj, env = process.env) {
	const path = env.GITHUB_OUTPUT;
	if (!path) return;
	const lines = Object.entries(obj)
		.map(([k, v]) => `${k}=${v ?? ''}`)
		.join('\n');
	appendFileSync(path, lines + '\n', 'utf8');
}

/**
 * Build the conflict branch: master merged into 3.x with the conflict markers committed as
 * they are. The markers are the review surface — the resolver sees exactly what clashed, and
 * the required checks stay red until they fix it, so the PR cannot be merged half-resolved
 * (an auto-resolved branch would be green with master's change silently dropped).
 *
 * 3.x never carries them at its tip, and not for long in its history either: this merge
 * commit is dropped by the next replay, which takes the queue's commits only.
 *
 * @returns {string[]} the conflicted files
 */
export function buildConflictBranch({ git, masterSha, log = console.log }) {
	const merge = attempt(git, ['merge', '--no-edit', masterSha]);
	if (merge.ok) {
		// merge-tree said these conflict; if a real merge disagrees, don't guess.
		throw new Error('Expected a merge conflict but the merge succeeded; aborting to avoid guessing.');
	}
	if (merge.out) log(merge.out);

	const files = conflictedFiles(git);
	git(['add', '-A']);
	git(['commit', '--no-edit', '--no-verify']);
	return files;
}

/**
 * Push the marker-free conflict branch and open a draft PR, attributing it to the authors of
 * the breaking commits behind the conflicted files. 3.x is left untouched.
 *
 * @returns {Promise<{ prUrl: string, ownersSlack: string }>}
 */
export async function openConflictPr({
	git,
	gh,
	repo,
	token,
	masterSha,
	preHead,
	pushUrl,
	target = TARGET_BRANCH,
	files = [],
	fetchFn = fetch,
	log = console.log,
}) {
	// Attribute against the pre-merge tip: HEAD is the merge commit by now.
	const shas = breakingShas(masterSha, files, git, preHead);

	// Degrade gracefully: a transient API failure should still open the PR
	// (unattributed) rather than fail the whole sync.
	let owners = [];
	try {
		owners = await resolveLogins(repo, shas, token, fetchFn);
	} catch (error) {
		log(`warning: could not resolve owners: ${error.message}`);
	}

	const { ownersCsv, slack, body } = buildOutputs({
		syncBranch: SYNC_BRANCH,
		targetBranch: target,
		files,
		owners,
	});

	git(['push', '--force', pushUrl, `HEAD:refs/heads/${SYNC_BRANCH}`]);

	// Ensure the label exists (idempotent), then open the draft conflict PR.
	gh(['label', 'create', CONFLICT_LABEL, '--color', 'B60205', '--description', 'master→3.x sync conflict', '--force']);
	const prUrl = gh([
		'pr', 'create', '--draft',
		'--base', target,
		'--head', SYNC_BRANCH,
		'--label', CONFLICT_LABEL,
		'--title', 'chore: Resolve master→3.x sync conflict',
		'--body', body,
	]);

	// Request owners as reviewers (best-effort: the API rejects the PR author
	// and non-collaborators, so a failure here must not fail the sync).
	if (ownersCsv) {
		try {
			gh(['pr', 'edit', prUrl, '--add-reviewer', ownersCsv]);
		} catch {
			log(`::warning::could not request some reviewers: ${ownersCsv}`);
		}
	}

	return { prUrl, ownersSlack: slack };
}

export async function sync({
	git = runGit,
	gh = runGh,
	env = process.env,
	fetchFn = fetch,
	log = console.log,
} = {}) {
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	const repo = env.GITHUB_REPOSITORY;
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');
	if (!repo) throw new Error('GITHUB_REPOSITORY env var is required');

	const target = targetBranch(env);

	// Authenticated push URL (credentials are not persisted by checkout).
	const pushUrl = `https://x-access-token:${token}@github.com/${repo}.git`;
	// The lease pins the tip we replayed from, so a concurrent push is never overwritten.
	const pushReplay = (from) =>
		git(['push', `--force-with-lease=refs/heads/${target}:${from}`, pushUrl, `HEAD:refs/heads/${target}`]);

	// Halt gate: if a previous conflict PR is still open, do nothing until it is merged.
	if (hasOpenConflictPr(gh)) {
		log(`An open '${CONFLICT_LABEL}' conflict PR exists; skipping sync until it is merged.`);
		return;
	}

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);

	git(['fetch', 'origin', 'master']);
	// Pin to the fetched SHA — a command-line refspec doesn't reliably update the
	// origin/master tracking ref, so FETCH_HEAD is the unambiguous target.
	const masterSha = git(['rev-parse', 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (isAncestor(git, masterSha, preHead)) {
		log(`${target} already contains master (${masterSha}); nothing to sync.`);
		return;
	}

	const queue = git(['log', '--no-merges', '--reverse', '--format=%h %s', `${masterSha}..${preHead}`]);
	log(`Replaying onto master ${masterSha}:\n${queue || '(none)'}`);

	// What the content must end up as, and whether a new conflict exists at all.
	const merged = mergeTree(git, preHead, masterSha);

	if (!merged.ok) {
		log(`master conflicts with ${target} — leaving ${target} untouched and opening a conflict PR.`);
		const files = buildConflictBranch({ git, masterSha, log });
		const { prUrl, ownersSlack } = await openConflictPr({
			git, gh, repo, token, masterSha, preHead, pushUrl, target, files, fetchFn, log,
		});
		writeGithubOutput({ conflict_pr: prUrl, conflict_owners: ownersSlack }, env);
		return;
	}

	if (tryRebase(git, masterSha, log)) {
		assertTree(git, merged.tree);
		assertNoMarkers(git);
		pushReplay(preHead);
		log(`Replayed ${target} onto master — no sync commit created.`);
		return;
	}

	// The content reconciles but the patches no longer apply on their own: an earlier
	// conflict was resolved in a merge, and a merge resolution leaves no patch to replay.
	// Replay favouring the 3.x side — the same side that resolved merge kept — and let the
	// resolver's own fix commit, which is in the queue, do the real work. Nothing is
	// squashed; the tree guard below proves the outcome.
	git(['rebase', '--abort']);
	log(`Patches no longer apply individually; replaying with ${target}'s side favoured.`);
	if (!tryRebase(git, masterSha, log, ['-X', 'theirs'])) {
		git(['rebase', '--abort']);
		throw new Error(`Could not replay ${target} onto master even with its own side favoured; needs a human.`);
	}

	assertTree(git, merged.tree);
	assertNoMarkers(git);
	pushReplay(preHead);
	log(`Replayed ${target} onto master — no sync commit created.`);
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	sync().catch((error) => {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	});
}
