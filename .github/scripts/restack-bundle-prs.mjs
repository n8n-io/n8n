#!/usr/bin/env node
/**
 * Replays the open fix branches of n8n-io/n8n-private onto a bundle branch that was just
 * reset onto its base (see reset-bundle-after-cut.mjs).
 *
 * After a cut, every open fix PR still carries the batch that was just published in its
 * ancestry, so GitHub shows it re-proposing everyone else's fixes. Replaying each head from
 * the cut onto the new tip drops those commits — they replay empty, the content already being
 * in the base — and leaves the PR showing exactly its own work.
 *
 * This is the second half of the reset, not an optional tidy-up: resetting a branch that
 * receives PRs is only safe because the heads are restacked straight after. It force-pushes
 * contributors' branches, which the `bundle/*` ruleset's `dismiss_stale_reviews_on_push`
 * turns into one round of dismissed approvals per cut. A merge would dismiss them too.
 *
 * STACKS ARE SKIPPED. A PR whose head another open PR is based on cannot be rewritten on its
 * own: the child keeps the old parent commits and its diff turns into a merge of both. Those
 * chains are reported for a human to restack in order.
 *
 * A conflicted branch is left untouched and reported on its own PR; the rest still get
 * restacked, and the run fails at the end so a stalled branch is never hidden by a green run.
 *
 * `ADOPT_STRANDED` covers the branches that a previous cut already stranded on the base:
 * it restacks them from their merge base and then points them back at the bundle branch.
 *
 * Env: BUNDLE_BRANCH (e.g. bundle/2.x), BASE_BRANCH (e.g. master),
 *      CUT_SHA (the bundle tip the cut squashed; omit to replay from each branch's merge
 *      base with the bundle branch, which is the only option once a cut record is gone),
 *      GH_TOKEN (installation token with contents + pull-requests write),
 *      GITHUB_REPOSITORY (owner/repo, auto-provided by Actions),
 *      DRY_RUN ('true' to report the planned rewrites and push nothing),
 *      ADOPT_STRANDED ('true' to also reclaim PRs left targeting the base).
 * Requires git 2.38+ (`merge-tree --write-tree`) and `gh` on PATH.
 */

import { execFileSync } from 'node:child_process';

import { attempt, isAncestor, replayOnto, runGit } from './branch-replay.mjs';
import { writeGithubOutput } from './github-helpers.mjs';

const BOT_NAME = 'n8n-assistant[bot]';
const BOT_EMAIL = 'n8n-assistant[bot]@users.noreply.github.com';

export const runGh = (args, opts = {}) =>
	execFileSync('gh', args, { encoding: 'utf8', ...opts }).trim();

function required(env, name) {
	const value = env[name];
	if (!value) throw new Error(`${name} env var is required`);
	return value;
}

/**
 * Split the open PRs into the ones this run may rewrite and the ones it must not.
 *
 * `stacked` is any PR another open PR is based on: rewriting a link of a chain leaves the rest
 * pointing at commits that no longer exist on it. The children are never candidates anyway —
 * their base is a fix branch, not the bundle branch.
 */
export function planRestack(pulls, { bundle, base, adoptStranded }) {
	const basesInUse = new Set(pulls.map((pr) => pr.baseRefName));
	const stackedHeads = new Set(
		pulls.filter((pr) => basesInUse.has(pr.headRefName)).map((pr) => pr.headRefName),
	);

	const targets = [];
	const stacked = [];
	for (const pr of pulls) {
		const onBundle = pr.baseRefName === bundle;
		const stranded =
			adoptStranded && pr.baseRefName === base && !pr.headRefName.startsWith('bundle/');
		if (!onBundle && !stranded) continue;

		// A child of a stack is caught here too: its base is a fix branch, so it is neither
		// `onBundle` nor `stranded` and never reaches this point — only the roots do.
		if (stackedHeads.has(pr.headRefName)) stacked.push(pr);
		else targets.push({ ...pr, retarget: stranded });
	}
	return { targets, stacked };
}

// Reclaiming a PR an earlier cut stranded on the base. Done after the replay, so the PR is
// never briefly proposing the published batch against the branch it publishes from.
function retarget({ gh, pr, repo, bundle }) {
	gh(['pr', 'edit', String(pr.number), '--repo', repo, '--base', bundle]);
}

function restackOne({ git, gh, log, pr, repo, remote, bundle, ontoSha, cutSha, dryRun }) {
	git(['fetch', remote, pr.headRefName]);
	git(['checkout', '--force', '-B', pr.headRefName, 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (isAncestor(git, ontoSha, preHead)) {
		log(`#${pr.number} already sits on ${bundle}; nothing to replay.`);
		if (pr.retarget && !dryRun) retarget({ gh, pr, repo, bundle });
		return 'current';
	}

	// Without a cut record — a PR stranded by an earlier cut — the merge base is the only
	// honest starting point: everything from there is either the PR's own work or a published
	// fix it inherited, and the published ones replay empty.
	const from =
		cutSha && isAncestor(git, cutSha, preHead) ? cutSha : git(['merge-base', ontoSha, preHead]);

	const own = git(['log', '--no-merges', '--reverse', '--format=%h %s', `${from}..${preHead}`]);
	log(`#${pr.number} (${pr.headRefName}) replays from ${from}:\n${own || '(none)'}`);

	if (dryRun) return 'planned';

	const replayed = replayOnto(git, { branch: pr.headRefName, onto: ontoSha, from });
	if (!replayed.ok) {
		const paths = replayed.conflictedPaths;
		attempt(gh, [
			'pr',
			'comment',
			String(pr.number),
			'--repo',
			repo,
			'--body',
			`This branch could not be replayed onto the reset \`${bundle}\`, so it was left as it is.` +
				(paths.length
					? `\n\nIt clashes with the new base on: ${paths.map((p) => `\`${p}\``).join(', ')}`
					: '') +
				`\n\nRun \`git rebase --onto origin/${bundle} ${from}\` on it, resolve, and force-push. ` +
				'Until then this PR shows the fixes the last bundle already published.',
		]);
		return 'conflict';
	}

	const push = attempt(git, [
		'push',
		`--force-with-lease=refs/heads/${pr.headRefName}:${preHead}`,
		remote,
		`HEAD:refs/heads/${pr.headRefName}`,
	]);
	if (!push.ok) {
		// The lease failed: the author pushed mid-run. Their branch wins; the next run retries.
		if (push.out) log(push.out);
		return 'rejected';
	}

	if (pr.retarget) retarget({ gh, pr, repo, bundle });
	return 'restacked';
}

export function restackBundlePrs({
	git = runGit,
	gh = runGh,
	env = process.env,
	log = console.log,
} = {}) {
	const bundle = required(env, 'BUNDLE_BRANCH');
	const base = required(env, 'BASE_BRANCH');
	const repo = required(env, 'GITHUB_REPOSITORY');
	const cutSha = env.CUT_SHA || '';
	const dryRun = env.DRY_RUN === 'true';
	const adoptStranded = env.ADOPT_STRANDED === 'true';
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	const pulls = JSON.parse(
		gh([
			'pr',
			'list',
			'--repo',
			repo,
			'--state',
			'open',
			'--limit',
			'200',
			'--json',
			'number,headRefName,baseRefName',
		]),
	);
	const { targets, stacked } = planRestack(pulls, { bundle, base, adoptStranded });

	if (stacked.length > 0) {
		log(
			`Skipping ${stacked.length} PR(s) that other open PRs are based on: ` +
				`${stacked.map((pr) => `#${pr.number}`).join(', ')}. Restack each chain by hand, root first.`,
		);
	}
	if (targets.length === 0) {
		log(`Nothing to restack onto ${bundle}.`);
		return {
			restacked: 0,
			current: 0,
			planned: 0,
			rejected: 0,
			conflicts: [],
			skipped: stacked.map((pr) => pr.number),
		};
	}

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);
	git(['config', 'core.editor', 'true']);

	const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
	git(['fetch', remote, bundle]);
	const ontoSha = git(['rev-parse', 'FETCH_HEAD']);

	const counts = { restacked: 0, current: 0, planned: 0, rejected: 0 };
	const conflicts = [];
	for (const pr of targets) {
		const outcome = restackOne({ git, gh, log, pr, repo, remote, bundle, ontoSha, cutSha, dryRun });
		if (outcome === 'conflict') conflicts.push(pr.number);
		else counts[outcome] += 1;
	}

	log(
		`Onto ${bundle} ${ontoSha}: ${counts.restacked} restacked, ${counts.current} already current, ` +
			`${counts.planned} planned, ${counts.rejected} raced, ${conflicts.length} conflicted, ` +
			`${stacked.length} stacked and skipped.`,
	);
	return { ...counts, conflicts, skipped: stacked.map((pr) => pr.number) };
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const result = restackBundlePrs();
		writeGithubOutput({
			restacked: result.restacked,
			conflicts: result.conflicts.length,
			skipped: result.skipped.length,
		});
		// A branch left carrying the published batch is not a green outcome.
		if (result.conflicts.length > 0) process.exit(1);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}
