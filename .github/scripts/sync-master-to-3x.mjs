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
 * pushing. That invariant is what makes the rewrite safe. When MECHANICAL files (see
 * `MECHANICAL_PATHS`) had to be regenerated, the verification demands exactness everywhere
 * BUT those files, which get their own checks instead (no markers, lockfile consistent
 * with the pushed tree's manifests).
 *
 * Four cases:
 *   1. The replay is clean            → force-push. No commit.
 *   2. The replay stalls, but 3.x's content still reconciles with master → an earlier
 *      conflict was resolved in a merge, which leaves no patch to replay. Replay again
 *      favouring the 3.x side (`-X theirs`), mirroring the side the resolved merge kept;
 *      the human's fix commit is in the queue and does the real work. Tree is then proven.
 *   3. master conflicts with 3.x, but ONLY on mechanical files — tool-generated content
 *      with a deterministic resolution (the pnpm lockfile, bot-maintained data files).
 *      These are resolved in place while the replay is stopped, exactly as a human
 *      resolver would (regenerate the lockfile, take master's blob), and folded into the
 *      stalled commit — still no commit of its own and no PR. When the `-X theirs` route
 *      resolves lockfile hunks without stalling, the lockfile is reconciled at the tip
 *      instead (folded into the tip commit by amending — never a commit of its own).
 *   4. The content does NOT reconcile on a real code path → a genuinely new conflict. 3.x
 *      is left UNTOUCHED and a draft PR is opened on the sync branch carrying the conflict
 *      markers — with the mechanical files pre-resolved, so the resolver only deals with
 *      real code — attributed to the authors of the breaking commits behind the conflicted
 *      files. Syncs pause until it is merged.
 *
 * The conflict branch carries the conflict markers, so the resolver sees exactly what clashed
 * and the required checks stay red until they fix it in a commit of their own. That PR is
 * merged with the normal GitHub merge button — master's commits arrive as-is and the fix stays
 * its own commit. NEVER close a conflict PR unmerged: closing resolves nothing and the same
 * conflict reopens on the next sync. 3.x itself never has markers at its tip (nightly images
 * build from it), and the merge commit holding them is dropped from its history by the next
 * replay.
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
 * Requires Node 18+ (global fetch), git 2.38+ (`merge-tree --write-tree`), `gh` on PATH,
 * and `pnpm` on PATH (lockfile conflict resolution).
 *
 * See .github/DEVELOPING_V3.md for the full v3 development model.
 */

import { execFileSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

import {
	conflictedFiles,
	breakingShas,
	resolveLogins,
	buildOutputs,
} from './sync-conflict-owners.mjs';

export const TARGET_BRANCH = '3.x';
export const SYNC_BRANCH = 'sync/master-to-3x';
export const CONFLICT_LABEL = 'automation:v3-sync';

export const LOCKFILE = 'pnpm-lock.yaml';

/**
 * Paths whose conflicts are MECHANICAL: tool-generated files with a deterministic
 * resolution, so no human judgement is lost by resolving them automatically.
 * Keys are exact repo-relative paths; values pick the resolution strategy:
 *   - 'pnpm-regen':  pnpm natively merges a conflicted lockfile when regenerating
 *                    (`pnpm install --lockfile-only`).
 *   - 'take-master': bots regenerate the file on master, so master's side wins.
 */
export const MECHANICAL_PATHS = {
	[LOCKFILE]: 'pnpm-regen',
	'packages/frontend/editor-ui/data/node-popularity.json': 'take-master',
	'.github/test-metrics/e2e-impact-map.json': 'take-master',
};

const BOT_NAME = 'n8n-assistant[bot]';
const BOT_EMAIL = 'n8n-assistant[bot]@users.noreply.github.com';

// Real command runners. Each takes an args array and returns trimmed stdout,
// throwing on a non-zero exit (mirrors `set -e`). Injectable for tests.
const runGit = (args, opts = {}) => execFileSync('git', args, { encoding: 'utf8', ...opts }).trim();
const runGh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
const runPnpm = (args, opts = {}) =>
	execFileSync('pnpm', args, { encoding: 'utf8', ...opts }).trim();

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
 * `ok: false` means the two sides genuinely conflict; `conflictedPaths` then names the
 * clashing files, and `tree` is still written (conflicted blobs carry their markers) —
 * it is the comparison baseline for the relaxed tree guard.
 */
export function mergeTree(git, a, b) {
	const res = attempt(git, ['merge-tree', '--write-tree', '--name-only', a, b]);
	// Line 0 is the toplevel tree OID (written even on conflict); the lines up to the
	// first blank line are the conflicted filenames (`--name-only`). Informational
	// messages follow the blank line, but `attempt` folds stderr in too — filter both.
	const lines = res.out.split('\n');
	const tree = lines[0]?.trim() ?? '';
	let conflictedPaths = [];
	if (!res.ok) {
		const blank = lines.indexOf('', 1);
		const section = lines.slice(1, blank === -1 ? undefined : blank);
		conflictedPaths = [
			...new Set(section.filter((l) => l && !/^(CONFLICT|Auto-merging|warning)/.test(l))),
		];
	}
	return {
		ok: res.ok,
		tree: res.ok || conflictedPaths.length ? tree : '',
		conflictedPaths,
		out: res.out,
	};
}

// Split conflicted paths into mechanically-resolvable ones and real code conflicts.
export function classifyPaths(paths) {
	const mechanical = [];
	const code = [];
	for (const p of paths) (MECHANICAL_PATHS[p] ? mechanical : code).push(p);
	return { mechanical, code };
}

// A conflicted manifest makes lockfile regeneration meaningless until it is resolved
// (catalogs live in pnpm-workspace.yaml, so it counts as a manifest too).
export function blocksLockfileRegen(codePaths) {
	return codePaths.some(
		(p) => p === 'package.json' || p.endsWith('/package.json') || p === 'pnpm-workspace.yaml',
	);
}

/**
 * Resolve one mechanical path in the working tree (valid mid-merge and mid-rebase alike)
 * and stage the result.
 */
export function resolveMechanicalPath({ git, pnpm, path, masterSha, log = console.log }) {
	const strategy = MECHANICAL_PATHS[path];
	if (strategy === 'pnpm-regen') {
		// pnpm merges the conflict markers itself while regenerating. `--no-frozen-lockfile`
		// is required: pnpm flips `--frozen-lockfile` on by default when CI=true.
		log(`Regenerating ${path} with pnpm...`);
		pnpm(['install', '--lockfile-only', '--no-frozen-lockfile']);
		git(['add', '--', path]);
		return;
	}
	log(`Resolving ${path} with master's version...`);
	if (attempt(git, ['cat-file', '-e', `${masterSha}:${path}`]).ok) {
		git(['checkout', masterSha, '--', path]);
	} else {
		git(['rm', '--force', '--', path]); // master deleted it
	}
}

/**
 * Replay the 3.x-only commits onto master, resolving stalls that involve ONLY mechanical
 * paths in place — folded into the stalled commit exactly as a human's `rebase --continue`
 * would, so no commit is added. Bails (leaving the rebase stopped, for the caller to
 * abort) as soon as a stall touches a real code path.
 *
 * Merge commits in the range (breaking PR merges, past conflict-PR merges) are flattened;
 * commits already applied to master — or fully absorbed by a mechanical resolution — are
 * dropped as empty. Individual commits, messages and authors are preserved.
 */
export function rebaseResolvingMechanical({
	git,
	pnpm,
	masterSha,
	log = console.log,
	extraArgs = [],
	maxStalls = 50,
}) {
	const resolved = new Set();
	let res = attempt(git, ['rebase', ...extraArgs, masterSha]);
	let stalls = 0;
	while (!res.ok) {
		if (++stalls > maxStalls) {
			log(`Giving up after ${maxStalls} rebase stalls.`);
			return { ok: false, resolved: [...resolved] };
		}
		const { mechanical, code } = classifyPaths(conflictedFiles(git));
		// No conflicted files means the rebase failed for some other reason — don't guess.
		if (mechanical.length === 0 || code.length > 0) {
			if (res.out) log(res.out);
			return { ok: false, resolved: [...resolved], conflictedCode: code };
		}
		for (const path of mechanical) {
			resolveMechanicalPath({ git, pnpm, path, masterSha, log });
			resolved.add(path);
		}
		// The resolution may have absorbed the whole commit — skip it rather than
		// letting `--continue` refuse an empty commit.
		const empty = attempt(git, ['diff-index', '--cached', '--quiet', 'HEAD']).ok;
		res = attempt(git, empty ? ['rebase', '--skip'] : ['rebase', '--continue']);
	}
	return { ok: true, resolved: [...resolved] };
}

/**
 * The content guard for every push: whichever route produced HEAD, its tree must be exactly
 * what merging 3.x with master yields — except on `allowedPaths`, the mechanical files the
 * merge itself could not resolve (always derived from the merge-tree conflict list, never
 * from what the run happened to touch). With no `allowedPaths` this is exact equality.
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

// Conflict markers must never reach 3.x — nightly images build from it. git grep exits 0
// with matches, 1 with none and >1 on error, so an error must not be read as "clean".
export function assertNoMarkers(git, rev = 'HEAD') {
	const found = attempt(git, ['grep', '-I', '-l', '-e', '^<<<<<<< ', '-e', '^>>>>>>> ', rev]);
	if (found.ok)
		throw new Error(`Refusing to continue: conflict markers present in ${rev}:\n${found.out}`);
	if (found.out.includes('fatal:'))
		throw new Error(`Could not scan ${rev} for conflict markers:\n${found.out}`);
}

/**
 * Make the lockfile at the replayed tip consistent with the tip's own manifests. A regen
 * at a stall usually already did this, but the `-X theirs` route resolves lockfile hunks
 * without stalling — so the reconciliation happens here, folded into the tip commit by
 * amending. Never a commit of its own, and never a rewrite of a master commit.
 */
export function reconcileLockfileAtTip({ git, pnpm, masterSha, log = console.log }) {
	pnpm(['install', '--lockfile-only', '--no-frozen-lockfile']);
	if (attempt(git, ['diff', '--quiet', '--', LOCKFILE]).ok) return;
	if (git(['rev-parse', 'HEAD']) === masterSha) {
		throw new Error('Lockfile reconciliation would amend a master commit; refusing.');
	}
	log('Folding a lockfile reconciliation into the tip commit.');
	git(['add', '--', LOCKFILE]);
	git(['commit', '--amend', '--no-edit', '--no-verify']);
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
 * they are — except mechanical files, which are pre-resolved so the resolver only deals
 * with real code conflicts. The remaining markers are the review surface: the resolver sees
 * exactly what clashed, and the required checks stay red until they fix it, so the PR
 * cannot be merged half-resolved (an auto-resolved branch would be green with master's
 * change silently dropped).
 *
 * The lockfile is left with its markers when a manifest is among the code conflicts
 * (regenerating is meaningless until the manifests are resolved) or when the regen fails
 * transiently — flagged via `lockfileDeferred` so the PR body carries the instruction.
 *
 * 3.x never carries the markers at its tip, and not for long in its history either: this
 * merge commit is dropped by the next replay, which takes the queue's commits only.
 *
 * @returns {{ files: string[], preResolved: string[], lockfileDeferred: boolean }}
 *   `files` is the list the PR reports and attributes owners for: the code conflicts,
 *   or every conflict when none are code (a fallback after a failed auto-resolution).
 */
export function buildConflictBranch({ git, pnpm, masterSha, log = console.log }) {
	const merge = attempt(git, ['merge', '--no-edit', masterSha]);
	if (merge.ok) {
		// merge-tree said these conflict; if a real merge disagrees, don't guess.
		throw new Error(
			'Expected a merge conflict but the merge succeeded; aborting to avoid guessing.',
		);
	}
	if (merge.out) log(merge.out);

	const all = conflictedFiles(git);
	const { mechanical, code } = classifyPaths(all);

	const preResolved = [];
	let lockfileDeferred = false;
	for (const path of mechanical) {
		const needsManifests = MECHANICAL_PATHS[path] === 'pnpm-regen' && blocksLockfileRegen(code);
		if (needsManifests) {
			lockfileDeferred = true;
			continue;
		}
		try {
			resolveMechanicalPath({ git, pnpm, path, masterSha, log });
			preResolved.push(path);
		} catch (error) {
			// Degrade gracefully (e.g. a transient registry failure): leave the markers
			// for the resolver rather than failing the PR-opening path.
			log(`warning: could not pre-resolve ${path}: ${error.message}`);
			if (MECHANICAL_PATHS[path] === 'pnpm-regen') lockfileDeferred = true;
		}
	}

	git(['add', '-A']);
	git(['commit', '--no-edit', '--no-verify']);
	return { files: code.length > 0 ? code : all, preResolved, lockfileDeferred };
}

// Conflict PRs that were recently closed WITHOUT being merged — closing resolves nothing,
// so the same conflict is about to come back; the new PR and Slack message call it out.
export function recentAbandonedConflictPrs(
	gh,
	{ label = CONFLICT_LABEL, sinceDays = 14, now = Date.now() } = {},
) {
	const out = gh([
		'pr',
		'list',
		'--state',
		'closed',
		'--label',
		label,
		'--json',
		'number,url,mergedAt,closedAt',
		'--limit',
		'10',
	]);
	return JSON.parse(out || '[]').filter(
		(pr) => !pr.mergedAt && pr.closedAt && now - Date.parse(pr.closedAt) < sinceDays * 86_400_000,
	);
}

/**
 * Push the marker-carrying conflict branch and open a draft PR, attributing it to the
 * authors of the breaking commits behind the conflicted files. 3.x is left untouched.
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
	preResolved = [],
	lockfileDeferred = false,
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

	let abandoned = [];
	try {
		abandoned = recentAbandonedConflictPrs(gh);
	} catch (error) {
		log(`warning: could not check for abandoned conflict PRs: ${error.message}`);
	}

	const { ownersCsv, slack, body } = buildOutputs({
		syncBranch: SYNC_BRANCH,
		targetBranch: target,
		files,
		owners,
		preResolved,
		lockfileDeferred,
		abandoned,
	});

	git(['push', '--force', pushUrl, `HEAD:refs/heads/${SYNC_BRANCH}`]);

	// Ensure the label exists (idempotent), then open the draft conflict PR.
	gh([
		'label',
		'create',
		CONFLICT_LABEL,
		'--color',
		'B60205',
		'--description',
		'master→3.x sync conflict',
		'--force',
	]);
	const prUrl = gh([
		'pr',
		'create',
		'--draft',
		'--base',
		target,
		'--head',
		SYNC_BRANCH,
		'--label',
		CONFLICT_LABEL,
		'--title',
		'chore: Resolve master→3.x sync conflict',
		'--body',
		body,
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
	pnpm = runPnpm,
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
		git([
			'push',
			`--force-with-lease=refs/heads/${target}:${from}`,
			pushUrl,
			`HEAD:refs/heads/${target}`,
		]);

	// Halt gate: if a previous conflict PR is still open, do nothing until it is merged.
	if (hasOpenConflictPr(gh)) {
		log(`An open '${CONFLICT_LABEL}' conflict PR exists; skipping sync until it is merged.`);
		return;
	}

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);
	// `rebase --continue` insists on an editor for the commit message; keep it headless.
	git(['config', 'core.editor', 'true']);

	git(['fetch', 'origin', 'master']);
	// Pin to the fetched SHA — a command-line refspec doesn't reliably update the
	// origin/master tracking ref, so FETCH_HEAD is the unambiguous target.
	const masterSha = git(['rev-parse', 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (isAncestor(git, masterSha, preHead)) {
		log(`${target} already contains master (${masterSha}); nothing to sync.`);
		return;
	}

	const queue = git([
		'log',
		'--no-merges',
		'--reverse',
		'--format=%h %s',
		`${masterSha}..${preHead}`,
	]);
	log(`Replaying onto master ${masterSha}:\n${queue || '(none)'}`);

	// What the content must end up as, and whether a new conflict exists at all.
	const merged = mergeTree(git, preHead, masterSha);

	if (!merged.ok) {
		const { mechanical, code } = classifyPaths(merged.conflictedPaths);

		if (code.length === 0 && mechanical.length > 0) {
			log(
				`master conflicts with ${target} only on mechanical files (${mechanical.join(', ')}); auto-resolving.`,
			);
			let replay = rebaseResolvingMechanical({ git, pnpm, masterSha, log });
			if (!replay.ok) {
				// An intermediate stall on a code file whose endpoints still reconcile —
				// same "resolved in a merge" situation as the clean-tree second pass.
				attempt(git, ['rebase', '--abort']);
				replay = rebaseResolvingMechanical({
					git,
					pnpm,
					masterSha,
					log,
					extraArgs: ['-X', 'theirs'],
				});
			}
			if (replay.ok) {
				if (mechanical.includes(LOCKFILE)) reconcileLockfileAtTip({ git, pnpm, masterSha, log });
				assertTreeMatches(git, merged.tree, mechanical);
				assertNoMarkers(git);
				pushReplay(preHead);
				log(
					`Replayed ${target} onto master, auto-resolving ${mechanical.join(', ')} — no PR, no sync commit.`,
				);
				return;
			}
			attempt(git, ['rebase', '--abort']);
			log('Mechanical auto-resolution did not complete; falling back to a conflict PR.');
		} else {
			log(
				`master conflicts with ${target} — leaving ${target} untouched and opening a conflict PR.`,
			);
		}

		const { files, preResolved, lockfileDeferred } = buildConflictBranch({
			git,
			pnpm,
			masterSha,
			log,
		});
		const { prUrl, ownersSlack } = await openConflictPr({
			git,
			gh,
			repo,
			token,
			masterSha,
			preHead,
			pushUrl,
			target,
			files,
			preResolved,
			lockfileDeferred,
			fetchFn,
			log,
		});
		writeGithubOutput({ conflict_pr: prUrl, conflict_owners: ownersSlack }, env);
		return;
	}

	const plainReplay = attempt(git, ['rebase', masterSha]);
	if (plainReplay.ok) {
		assertTreeMatches(git, merged.tree);
		assertNoMarkers(git);
		pushReplay(preHead);
		log(`Replayed ${target} onto master — no sync commit created.`);
		return;
	}
	if (plainReplay.out) log(plainReplay.out);

	// The content reconciles but the patches no longer apply on their own: an earlier
	// conflict was resolved in a merge, and a merge resolution leaves no patch to replay.
	// Replay favouring the 3.x side — the same side that resolved merge kept — and let the
	// resolver's own fix commit, which is in the queue, do the real work. Mechanical stalls
	// the strategy cannot settle (e.g. modify/delete) are resolved in place. Nothing is
	// squashed; the tree guard below proves the outcome exactly, since the merge was clean.
	git(['rebase', '--abort']);
	log(`Patches no longer apply individually; replaying with ${target}'s side favoured.`);
	if (!rebaseResolvingMechanical({ git, pnpm, masterSha, log, extraArgs: ['-X', 'theirs'] }).ok) {
		git(['rebase', '--abort']);
		throw new Error(
			`Could not replay ${target} onto master even with its own side favoured; needs a human.`,
		);
	}

	assertTreeMatches(git, merged.tree);
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
