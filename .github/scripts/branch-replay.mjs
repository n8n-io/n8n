/**
 * Primitives shared by the flows that sync a long-lived branch which is "base + its own
 * commits" with that base, whether by rebasing those commits onto it or by merging it in.
 *
 * Nothing here knows which branch pair it is working on. The safety property every caller
 * relies on lives in `mergeTree` + `assertTreeMatches`: the content pushed must be exactly
 * the tree a merge of the two sides would produce, and a mismatch fails the run instead of
 * pushing. That invariant is what makes rewriting a shared branch safe, and what proves a
 * merge landed on the content it was supposed to.
 *
 * Callers: `sync-master-to-3x.mjs` (master → 3.x, rebased, with mechanical conflict
 * resolution and a conflict PR), `sync-bundle-branch.mjs` (base → bundle/*, merged because
 * those branches receive PRs, fail-loud), `reset-bundle-after-cut.mjs` (bundle/* → the base
 * once its batch is published) and `restack-bundle-prs.mjs` (the open fix branches → the
 * reset bundle branch).
 *
 * Requires git 2.38+ (`merge-tree --write-tree`).
 */

import { execFileSync } from 'node:child_process';

// Real command runner: takes an args array and returns trimmed stdout, throwing on a
// non-zero exit (mirrors `set -e`). Injectable for tests.
export const runGit = (args, opts = {}) =>
	execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();

/**
 * Run a command for its exit status: `{ ok, out }` instead of a throw. Used for the git
 * commands whose non-zero exit is an expected answer, not a failure. stderr is captured
 * rather than inherited, so an expected-to-fail probe doesn't spill into the run log.
 */
export function attempt(run, args, opts = {}) {
	try {
		return { ok: true, out: run(args, { stdio: ['ignore', 'pipe', 'pipe'], ...opts }) ?? '' };
	} catch (error) {
		const out = `${error.stdout ?? ''}\n${error.stderr ?? ''}`.trim();
		return { ok: false, out };
	}
}

export function isAncestor(git, maybeAncestor, descendant) {
	return attempt(git, ['merge-base', '--is-ancestor', maybeAncestor, descendant]).ok;
}

/**
 * The tree a merge of the two commits would produce — the definition of the content the
 * replayed branch should end up with, computed without touching the working tree.
 *
 * `ok: false` means the two sides genuinely conflict; `conflictedPaths` then names the
 * clashing files, and `tree` is still written (conflicted blobs carry their markers) —
 * it is the comparison baseline for the relaxed tree guard.
 */
export function mergeTree(git, a, b) {
	const res = attempt(git, ['merge-tree', '--write-tree', '--name-only', a, b]);
	// Line 0 is the toplevel tree OID (written even on conflict); every line from there to
	// the first blank line is a conflicted filename (`--name-only`), and the informational
	// messages ("Auto-merging x", "CONFLICT (content): ...") come strictly AFTER that blank
	// line. So the blank line is the only delimiter needed — do not also filter lines by
	// prefix, or a real path like `CONFLICT.md` or `warning.txt` is dropped from the report.
	const lines = res.out.split('\n');
	const tree = lines[0]?.trim() ?? '';
	let conflictedPaths = [];
	if (!res.ok) {
		const blank = lines.indexOf('', 1);
		const section = lines.slice(1, blank === -1 ? undefined : blank);
		conflictedPaths = [...new Set(section.filter((l) => l))];
	}
	return {
		ok: res.ok,
		tree: res.ok || conflictedPaths.length ? tree : '',
		conflictedPaths,
		out: res.out,
	};
}

/**
 * The content guard for every push: whichever route produced HEAD, its tree must be exactly
 * what merging the two sides yields — except on `allowedPaths`, files the merge itself could
 * not resolve and whose resolution the caller proves another way (always derived from the
 * merge-tree conflict list, never from what the run happened to touch). With no
 * `allowedPaths` this is exact equality.
 */
export function assertTreeMatches(git, expectedTree, allowedPaths = []) {
	const actual = git(['rev-parse', 'HEAD^{tree}']);
	if (actual === expectedTree) return;
	if (allowedPaths.length === 0) {
		throw new Error(
			`Replayed tree ${actual} does not match the merge tree ${expectedTree}; refusing to push.`,
		);
	}
	const out = git(['diff-tree', '-r', '--name-only', '--no-renames', expectedTree, actual]);
	const allowed = new Set(allowedPaths);
	const violations = (out ? out.split('\n') : []).filter((p) => p && !allowed.has(p));
	if (violations.length > 0) {
		throw new Error(
			`Replayed tree deviates from the merge tree on non-mechanical paths:\n${violations.join('\n')}\nrefusing to push.`,
		);
	}
}

// Conflict markers must never reach a replayed branch — releases and nightly images build
// from these. git grep exits 0 with matches, 1 with none and >1 on error, so an error must
// not be read as "clean".
export function assertNoMarkers(git, rev = 'HEAD') {
	const found = attempt(git, ['grep', '-I', '-l', '-e', '^<<<<<<< ', '-e', '^>>>>>>> ', rev]);
	if (found.ok)
		throw new Error(`Refusing to continue: conflict markers present in ${rev}:\n${found.out}`);
	if (found.out.includes('fatal:'))
		throw new Error(`Could not scan ${rev} for conflict markers:\n${found.out}`);
}

/**
 * Replay `from..branch` onto `onto`, then prove the result is the tree merging the two sides
 * yields. Commits whose content `onto` already carries replay empty and are dropped — that is
 * how a branch built on a batch that has since been squashed into `onto` sheds the duplicates
 * instead of re-proposing them.
 *
 * Never leaves a rebase in progress: a stall aborts, so the caller can report and move on to
 * the next branch. `ok: false` with `conflictedPaths` means the two sides genuinely clash.
 * `branch` must already exist locally at the revision to replay.
 */
export function replayOnto(git, { branch, onto, from }) {
	const head = git(['rev-parse', branch]);
	const merged = mergeTree(git, head, onto);
	if (!merged.ok) return { ok: false, conflictedPaths: merged.conflictedPaths, out: merged.out };

	git(['checkout', '--force', '-B', branch, head]);
	const replay = attempt(git, ['rebase', '--empty=drop', '--onto', onto, from, branch]);
	if (!replay.ok) {
		// A stall the merge tree did not predict (delete/modify leaves no markers, so
		// merge-tree can call it clean while the replay still stops).
		attempt(git, ['rebase', '--abort']);
		return { ok: false, conflictedPaths: [], out: replay.out };
	}

	assertTreeMatches(git, merged.tree);
	assertNoMarkers(git);
	return { ok: true, sha: git(['rev-parse', 'HEAD']) };
}
