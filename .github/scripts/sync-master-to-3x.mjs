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
 *      the human's fix commit is in the queue and does the real work. Stalls the strategy
 *      option cannot settle (modify/delete — `-X` never resolves those) are resolved in
 *      place toward the queue commit's side. Tree is then proven.
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
 *      real code — naming both ends of the clash: the authors of the breaking commits and
 *      the master commits that touched the same files. Delete/modify conflicts leave no
 *      markers, so they are resolved toward 3.x and reported as an explicit decision
 *      instead. Syncs pause until it is merged.
 *
 * The conflict branch carries the conflict markers, so the resolver sees exactly what clashed
 * and the required checks stay red until they fix it in a commit of their own. A conflict git
 * left without markers (delete/modify) has no such gate: the PR body carries the decision that
 * was made by default and says as much. That PR is merged with the normal GitHub merge button
 * — master's commits arrive as-is and the fix stays its own commit. NEVER close a conflict PR
 * unmerged: closing resolves nothing and the same conflict reopens on the next sync. 3.x
 * itself never has markers at its tip (nightly images build from it), and the merge commit
 * holding them is dropped from its history by the next replay.
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
	attempt,
	assertNoMarkers,
	assertTreeMatches,
	isAncestor,
	mergeTree,
	runGit,
} from './branch-replay.mjs';
import { conflictedFiles, gatherAttribution, buildOutputs } from './sync-conflict-owners.mjs';

// Re-exported so this module stays the single entry point for the master→3.x flow, tests
// included. The implementations are branch-pair-agnostic and shared with the bundle replay.
export { attempt, assertNoMarkers, assertTreeMatches, isAncestor, mergeTree };

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
// throwing on a non-zero exit (mirrors `set -e`). Injectable for tests. (`runGit` is
// shared — see branch-replay.mjs.)
const runGh = (args, opts = {}) => execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();
const runPnpm = (args, opts = {}) =>
	execFileSync('pnpm', args, { encoding: 'utf8', ...opts }).trim();

// The branch to sync into. Overridable so the whole flow can be rehearsed end-to-end
// against a throwaway branch before it is pointed at the real 3.x.
export function targetBranch(env = process.env) {
	return env.SYNC_TARGET_BRANCH || TARGET_BRANCH;
}

// True when a previous conflict PR is still open — the halt gate.
export function hasOpenConflictPr(gh, label = CONFLICT_LABEL) {
	const out = gh(['pr', 'list', '--state', 'open', '--label', label, '--json', 'number']);
	return JSON.parse(out || '[]').length > 0;
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
 * Resolve one stalled path by taking the side of the queue commit being replayed
 * ("theirs" while a rebase is stopped). Exists for the stalls `-X theirs` cannot settle
 * itself — modify/delete, which strategy options never resolve: when the queue commit
 * deleted the file there is no stage 3, so the deletion wins. Only meaningful on the
 * favoured replay passes, where the callers' tree guard proves the final content — a
 * wrong pick here fails the run instead of pushing.
 */
export function resolveQueueSidePath({ git, path, log = console.log }) {
	// `ls-files -u` lines are `<mode> <oid> <stage>\t<path>`; stage 3 is the queue side.
	const stages = git(['ls-files', '-u', '--', path]);
	const queueSideExists = stages.split('\n').some((line) => /^\S+ \S+ 3\t/.test(line));
	if (queueSideExists) {
		log(`Resolving ${path} with the replayed commit's version...`);
		git(['checkout', '--theirs', '--', path]);
		git(['add', '--', path]);
	} else {
		log(`Resolving ${path} with the replayed commit's deletion...`);
		git(['rm', '--force', '--', path]);
	}
}

/**
 * The unmerged paths git left as delete/modify: one side removed the file, the other
 * changed it. These need naming separately, because a real merge leaves NO conflict
 * markers for them — the working tree simply holds the surviving side, so committing the
 * merge as-is silently takes that side with nothing for a resolver to look at.
 *
 * `ls-files -u` lines are `<mode> <oid> <stage>\t<path>`: stage 1 base, 2 ours (the target
 * branch), 3 theirs (master). A base with one side missing is the delete; no base at all is
 * an add/add, which is a normal content conflict and keeps its markers.
 *
 * @returns {Array<{ path: string, deletedBy: 'target' | 'master' }>}
 */
export function deleteModifyConflicts(git, paths) {
	const out = [];
	for (const path of paths) {
		const stages = new Set(
			git(['ls-files', '-u', '--', path])
				.split('\n')
				.map((line) => /^\S+ \S+ (\d)\t/.exec(line)?.[1])
				.filter(Boolean),
		);
		if (!stages.has('1')) continue;
		if (!stages.has('2')) out.push({ path, deletedBy: 'target' });
		else if (!stages.has('3')) out.push({ path, deletedBy: 'master' });
	}
	return out;
}

/**
 * Replay the 3.x-only commits onto master, resolving stalls that involve ONLY mechanical
 * paths in place — folded into the stalled commit exactly as a human's `rebase --continue`
 * would, so no commit is added. Bails (leaving the rebase stopped, for the caller to
 * abort) as soon as a stall touches a real code path — unless `favourQueue` is set, in
 * which case code-path stalls are resolved with the queue commit's side too. That flag
 * belongs only on the favoured (`-X theirs`) passes, whose tree guard proves the outcome.
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
	favourQueue = false,
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
		if (mechanical.length + code.length === 0 || (code.length > 0 && !favourQueue)) {
			if (res.out) log(res.out);
			return { ok: false, resolved: [...resolved], conflictedCode: code };
		}
		for (const path of mechanical) {
			resolveMechanicalPath({ git, pnpm, path, masterSha, log });
			resolved.add(path);
		}
		for (const path of code) {
			resolveQueueSidePath({ git, path, log });
		}
		// The resolution may have absorbed the whole commit — skip it rather than
		// letting `--continue` refuse an empty commit.
		const empty = attempt(git, ['diff-index', '--cached', '--quiet', 'HEAD']).ok;
		res = attempt(git, empty ? ['rebase', '--skip'] : ['rebase', '--continue']);
	}
	return { ok: true, resolved: [...resolved] };
}

/**
 * Fold any residual deviation between the replayed tip and the proven merge tree into the
 * tip commit. `-X theirs` resolves overlapping hunks toward the queue side without
 * stalling — silently dropping master-side changes (lockfile hunks are the usual case)
 * that no fix commit in the queue reasserts. The merge tree is the definition of the
 * correct content, so its blobs are taken verbatim. `excludePaths` names files the merge
 * tree itself could not resolve (marker-carrying mechanical blobs), which get their own
 * reconciliation. Never a commit of its own, and never a rewrite of a master commit.
 */
export function reconcileWithMergeTreeAtTip({
	git,
	mergedTree,
	masterSha,
	excludePaths = [],
	log = console.log,
}) {
	if (git(['rev-parse', 'HEAD^{tree}']) === mergedTree) return [];
	const out = git(['diff-tree', '-r', '--name-only', '--no-renames', mergedTree, 'HEAD']);
	const excluded = new Set(excludePaths);
	const paths = (out ? out.split('\n') : []).filter((p) => p && !excluded.has(p));
	if (paths.length === 0) return [];
	if (git(['rev-parse', 'HEAD']) === masterSha) {
		throw new Error('Merge-tree reconciliation would amend a master commit; refusing.');
	}
	log(`Folding the merge tree's content for ${paths.join(', ')} into the tip commit.`);
	for (const path of paths) {
		if (attempt(git, ['cat-file', '-e', `${mergedTree}:${path}`]).ok) {
			git(['checkout', mergedTree, '--', path]);
		} else {
			git(['rm', '--force', '--', path]); // the merge deleted it
		}
	}
	git(['commit', '--amend', '--no-edit', '--no-verify']);
	return paths;
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
 * Delete/modify conflicts have no markers to leave, so they are resolved toward 3.x's side
 * — the same side the replay favours — and reported separately. Left to `add -A` they would
 * commit master's surviving blob instead, re-adding a file 3.x deleted on purpose with
 * nothing in the diff to suggest a decision was made.
 *
 * The lockfile is left with its markers when a manifest is among the code conflicts
 * (regenerating is meaningless until the manifests are resolved) or when the regen fails
 * transiently — flagged via `lockfileDeferred` so the PR body carries the instruction.
 *
 * 3.x never carries the markers at its tip, and not for long in its history either: this
 * merge commit is dropped by the next replay, which takes the queue's commits only.
 *
 * @returns {{ files: string[], deleteConflicts: Array<{path: string, deletedBy: string}>,
 *   preResolved: string[], lockfileDeferred: boolean }}
 *   `files` is the marker-carrying list the PR reports, or every conflict when none are
 *   code (a fallback after a failed auto-resolution); owners are attributed for both lists.
 */
export function buildConflictBranch({
	git,
	pnpm,
	masterSha,
	target = TARGET_BRANCH,
	log = console.log,
}) {
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

	// No markers to leave behind for these — resolve toward 3.x and report them instead.
	const deleteConflicts = deleteModifyConflicts(git, code);
	for (const { path, deletedBy } of deleteConflicts) {
		if (deletedBy === 'target') {
			log(`Keeping ${target}'s deletion of ${path} (master modified it)...`);
			git(['rm', '--force', '--', path]);
		} else {
			log(`Keeping ${target}'s ${path} (master deleted it)...`);
			git(['checkout', '--ours', '--', path]);
			git(['add', '--', path]);
		}
	}
	const deleted = new Set(deleteConflicts.map((c) => c.path));

	git(['add', '-A']);
	git(['commit', '--no-edit', '--no-verify']);
	return {
		files: code.length > 0 ? code.filter((p) => !deleted.has(p)) : all,
		deleteConflicts,
		preResolved,
		lockfileDeferred,
	};
}

/**
 * Push the marker-carrying conflict branch and open a draft PR naming both ends of the
 * conflict: the authors of the breaking commits behind the conflicted files, and the master
 * commits that touched the same files. Nobody is requested as a reviewer — the PR body and
 * the Slack post are the ping. 3.x is left untouched.
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
	deleteConflicts = [],
	preResolved = [],
	lockfileDeferred = false,
	fetchFn = fetch,
	log = console.log,
}) {
	// Attribute against the pre-merge tip: HEAD is the merge commit by now.
	const { owners, masterCommits } = await gatherAttribution({
		repo,
		token,
		files: [...files, ...deleteConflicts.map((c) => c.path)],
		base: masterSha,
		tip: preHead,
		git,
		fetchFn,
		log,
	});

	const { slack, body } = buildOutputs({
		syncBranch: SYNC_BRANCH,
		targetBranch: target,
		files,
		owners,
		deleteConflicts,
		masterCommits,
		preResolved,
		lockfileDeferred,
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
					favourQueue: true,
				});
			}
			if (replay.ok) {
				// The favoured retry may have drifted from the merge tree on cleanly-merging
				// paths; fold those back before the mechanical files get their own treatment.
				reconcileWithMergeTreeAtTip({
					git,
					mergedTree: merged.tree,
					masterSha,
					excludePaths: mechanical,
					log,
				});
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

		const { files, deleteConflicts, preResolved, lockfileDeferred } = buildConflictBranch({
			git,
			pnpm,
			masterSha,
			target,
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
			deleteConflicts,
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
	// resolver's own fix commit, which is in the queue, do the real work. Stalls the
	// strategy option cannot settle (modify/delete — `-X` never resolves those) are
	// resolved in place toward the queue commit's side. Nothing is squashed; the tree
	// guard below proves the outcome exactly, since the merge was clean.
	git(['rebase', '--abort']);
	log(`Patches no longer apply individually; replaying with ${target}'s side favoured.`);
	const favoured = rebaseResolvingMechanical({
		git,
		pnpm,
		masterSha,
		log,
		extraArgs: ['-X', 'theirs'],
		favourQueue: true,
	});
	if (!favoured.ok) {
		git(['rebase', '--abort']);
		throw new Error(
			`Could not replay ${target} onto master even with its own side favoured; needs a human.`,
		);
	}

	// Favouring resolves overlapping hunks toward 3.x without stalling, which can drop
	// master-side changes no fix commit reasserts; the merge was clean, so the merge tree
	// is the correct content — fold any drift back into the tip.
	reconcileWithMergeTreeAtTip({ git, mergedTree: merged.tree, masterSha, log });
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
