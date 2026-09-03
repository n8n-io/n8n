#!/usr/bin/env node
/**
 * Resets a bundle integration branch (`bundle/2.x`, `bundle/1.x` in n8n-io/n8n-private) onto
 * its base once the batch it carried has been published.
 *
 * A bundle branch holds the pending fixes as separate commits; the cut squashes them into
 * private master as one commit, which is then republished into public master and mirrored
 * back. From that moment the branch's own commits are redundant, and merging the base in
 * would keep every published fix in its log forever. So the branch is reset to the base
 * instead — the same end state as deleting and re-creating it, reached WITHOUT the branch
 * ever ceasing to exist.
 *
 * That distinction is the whole point of this script. Deleting the branch makes GitHub
 * retarget every open PR based on it onto master, and re-creating a branch of the same name
 * never re-points them: the fixes end up queued against the branch the cut publishes from.
 * Resetting in place keeps every PR's base intact. It needs the `non_fast_forward` bypass the
 * n8n-assistant app already holds on the `bundle/*` ruleset.
 *
 * This is the ONE sanctioned rewrite of a bundle branch, and it is safe only because
 * restack-bundle-prs.mjs immediately replays the open fix branches onto the new tip. Between
 * cuts the branch stays append-only — see sync-bundle-branch.mjs.
 *
 * The reset must not fire before the round-trip lands, or it would drop the whole batch. The
 * cut records itself as a ref — `refs/bundle-cut/<2.x|1.x>/pr-<public PR>` pointing at the
 * bundle tip that was squashed (see sec-publish-fix.yml). A ref rather than a repository
 * variable so the flow needs nothing beyond the `contents: write` it already has. This script
 * waits until that public PR is merged AND its commit is on the freshly synced base, then
 * replays whatever landed on the branch after the cut onto the new base. It deletes the
 * marker only after the push succeeds, so a premature run is a no-op that retries next hour.
 *
 * FAIL LOUD: a conflict leaves the branch untouched and fails the run. A human replays the
 * branch locally, resolves, pushes, and deletes the marker.
 *
 * Env: BUNDLE_BRANCH (e.g. bundle/2.x), BASE_BRANCH (e.g. master),
 *      GH_TOKEN (installation token for the private repo, contents:write),
 *      PUBLIC_GH_TOKEN (optional read-only token for the public repo; GH_TOKEN is used when
 *      it is unset, which only works if that token can see the public repo),
 *      GITHUB_REPOSITORY (owner/repo, auto-provided by Actions),
 *      PUBLIC_REPO (optional, defaults to n8n-io/n8n).
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

// A GitHub annotation is one line: fold anything multi-line into the URL-escaped form so the
// whole message survives in the run's error list.
export function annotation(title, message) {
	return `::error title=${title}::${message.replace(/\n/g, '%0A')}`;
}

/** Where a cut of this bundle branch records itself. */
export const cutRefPrefix = (bundle) => `refs/bundle-cut/${bundle.replace(/^bundle\//, '')}/pr-`;

/**
 * The pending cut — `{ cutSha, publicPr, ref }` — or null when there is none. The ref name
 * carries the public PR number and the ref value the bundle tip that was squashed, so one
 * atomic push records both and one delete retires them.
 */
export function readCutMarker({ git, remote, prefix }) {
	const listed = attempt(git, ['ls-remote', remote, `${prefix}*`]);
	if (!listed.ok) throw new Error(`Could not read the cut markers under ${prefix}:\n${listed.out}`);
	if (!listed.out) return null;

	const rows = listed.out.split('\n').map((line) => line.split('\t'));
	if (rows.length > 1) {
		throw new Error(
			`${rows.length} cuts are recorded under ${prefix}; a previous one was never retired. ` +
				`Delete the stale ref(s) and re-run:\n${rows.map(([, ref]) => ref).join('\n')}`,
		);
	}

	const [cutSha, ref] = rows[0];
	const publicPr = Number(ref.slice(prefix.length));
	if (!cutSha || !Number.isInteger(publicPr) || publicPr <= 0) {
		throw new Error(`${ref} is not a usable cut marker.`);
	}
	return { cutSha, publicPr, ref };
}

/**
 * The commit the published PR landed as, or null while it is still open.
 *
 * Read with its own token: the private repo's token is the one that force-pushes, and it has
 * no business holding write on the public repo just to answer this question.
 */
function publishedCommit({ gh, publicRepo, publicPr, token }) {
	const view = gh(
		['pr', 'view', String(publicPr), '--repo', publicRepo, '--json', 'state,mergeCommit'],
		token ? { env: { ...process.env, GH_TOKEN: token } } : {},
	);
	const { state, mergeCommit } = JSON.parse(view);
	if (state !== 'MERGED') return null;
	if (!mergeCommit?.oid) {
		throw new Error(`${publicRepo}#${publicPr} is merged but reports no merge commit.`);
	}
	return mergeCommit.oid;
}

export function resetBundleAfterCut({
	git = runGit,
	gh = runGh,
	env = process.env,
	log = console.log,
} = {}) {
	const bundle = required(env, 'BUNDLE_BRANCH');
	const base = required(env, 'BASE_BRANCH');
	const repo = required(env, 'GITHUB_REPOSITORY');
	const publicRepo = env.PUBLIC_REPO || 'n8n-io/n8n';
	const token = env.GH_TOKEN || env.GITHUB_TOKEN;
	if (!token) throw new Error('GH_TOKEN / GITHUB_TOKEN env var is required');

	// Every remote operation goes through this URL: checkout does not persist credentials, and
	// the repository is private, so `git fetch origin` on its own is unauthenticated.
	const remote = `https://x-access-token:${token}@github.com/${repo}.git`;
	const prefix = cutRefPrefix(bundle);

	const marker = readCutMarker({ git, remote, prefix });
	if (!marker) {
		log(`No cut recorded under ${prefix}; ${bundle} needs no reset.`);
		return { status: 'no-cut' };
	}

	const published = publishedCommit({
		gh,
		publicRepo,
		publicPr: marker.publicPr,
		token: env.PUBLIC_GH_TOKEN,
	});
	if (!published) {
		log(`${publicRepo}#${marker.publicPr} is not merged yet; leaving ${bundle} alone.`);
		return { status: 'awaiting-publish' };
	}

	git(['config', 'user.name', BOT_NAME]);
	git(['config', 'user.email', BOT_EMAIL]);
	// A rebase must never sit waiting for an editor.
	git(['config', 'core.editor', 'true']);

	git(['fetch', remote, base]);
	const baseSha = git(['rev-parse', 'FETCH_HEAD']);

	// The mirror runs hourly and the publish is immediate, so the base normally lags the
	// public merge by up to an hour. Resetting onto a base without the batch would drop it.
	if (!isAncestor(git, published, baseSha)) {
		log(`${base} does not carry ${published} yet; leaving ${bundle} alone.`);
		return { status: 'awaiting-sync' };
	}

	const listed = attempt(git, ['ls-remote', '--heads', remote, `refs/heads/${bundle}`]);
	if (!listed.ok) {
		throw new Error(`Could not check whether ${bundle} exists on the remote:\n${listed.out}`);
	}
	if (!listed.out) {
		// The ruleset is supposed to make this impossible; say so loudly rather than papering
		// over it, because every PR that was based on the branch is now targeting the base.
		throw new Error(
			`${bundle} does not exist. It must never be deleted — open PRs get retargeted onto ` +
				`${base} and re-creating the branch does not bring them back. Re-create it at ` +
				`${baseSha}, restore those PRs' bases, then delete ${marker.ref}.`,
		);
	}

	git(['fetch', remote, bundle]);
	git(['checkout', '--force', '-B', bundle, 'FETCH_HEAD']);
	const preHead = git(['rev-parse', 'HEAD']);

	if (preHead === baseSha) {
		// The reset landed and only retiring the marker failed. Finish that and stop.
		log(`${bundle} is already at ${base} (${baseSha}); retiring ${marker.ref}.`);
		git(['push', remote, `:${marker.ref}`]);
		return { status: 'current', cutSha: marker.cutSha };
	}
	// Deliberately no "the branch already contains the base" shortcut: the daily sync may have
	// merged the base in first, and that merge is exactly what leaves the published fixes
	// duplicated in the log. Replaying from the cut drops them either way.
	if (!isAncestor(git, marker.cutSha, preHead)) {
		throw new Error(
			`The recorded cut ${marker.cutSha} is not an ancestor of ${bundle} (${preHead}); ` +
				`the branch was rewritten outside this flow. Resolve by hand and delete ${marker.ref}.`,
		);
	}

	// Everything up to the cut is published and replays empty; only fixes that landed during
	// the window survive onto the new base.
	const pending = git([
		'log',
		'--no-merges',
		'--reverse',
		'--format=%h %s',
		`${marker.cutSha}..${preHead}`,
	]);
	log(`Resetting ${bundle} onto ${base} ${baseSha}. Landed since the cut:\n${pending || '(none)'}`);

	const replayed = replayOnto(git, { branch: bundle, onto: baseSha, from: marker.cutSha });
	if (!replayed.ok) {
		const paths = replayed.conflictedPaths;
		log(
			annotation(
				`${bundle} cannot be reset onto ${base}`,
				`${paths.length ? `They conflict on: ${paths.join(', ')}` : 'The replay stalled'}\n` +
					`${bundle} is untouched and ${marker.ref} is kept. Replay ${bundle} onto ${base} ` +
					`locally, resolve, push, then delete ${marker.ref} and re-run this workflow.`,
			),
		);
		throw new Error(`Could not reset ${bundle} onto ${base}; leaving ${bundle} untouched.`);
	}

	const push = attempt(git, [
		'push',
		`--force-with-lease=refs/heads/${bundle}:${preHead}`,
		remote,
		`HEAD:refs/heads/${bundle}`,
	]);
	if (!push.ok) {
		// The lease failed: a fix landed mid-run. Keep the marker so the next run picks it up.
		if (push.out) log(push.out);
		return { status: 'rejected', cutSha: marker.cutSha };
	}

	// Only now: while the marker is there, a premature run is a harmless no-op.
	git(['push', remote, `:${marker.ref}`]);

	log(`Reset ${bundle} onto ${base}. Open PRs kept their base and now need restacking.`);
	return { status: 'reset', sha: replayed.sha, cutSha: marker.cutSha };
}

// Only run when executed directly, not when imported by tests.
if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		const result = resetBundleAfterCut();
		writeGithubOutput({
			status: result.status,
			bundle_sha: result.sha ?? '',
			cut_sha: result.cutSha ?? '',
		});
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}
