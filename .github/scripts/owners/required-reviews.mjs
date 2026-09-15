/**
 * Required-review enforcement for OWNERS entries marked `required`.
 *
 * Computes the teams whose approval the changeset needs (per OWNERS)
 * and reports the verdict as a "Required Reviews" commit status on the PR
 * head SHA. A ruleset that lists this status as a required check blocks the
 * merge until a member of each required team has approved the PR. Merge-queue
 * runs do not reach this script: the workflow reports success on the queue
 * head directly, because entering the queue already required a green status.
 *
 * Every base branch is enforced unless the PR matches a route in
 * REQUIRED_REVIEW_EXEMPTIONS; an exempt PR reports success without evaluation.
 *
 * The job itself always succeeds when the evaluation runs; the commit status
 * carries the verdict. The status is set to pending before the evaluation
 * starts, so a crash (e.g. the team membership API is unavailable) cannot
 * leave an earlier green status in effect — the gate fails closed.
 */

import {
	getChangedFiles,
	getEventFromGithubEventPath,
	getPrReviews,
	getPullRequestById,
	isTeamMember,
	setCommitStatus,
} from '../github-helpers.mjs';
import { parseOwnersFile, resolveRequiredTeams, teamHandleToSlug } from './owners.mjs';

export const STATUS_CONTEXT = 'Required Reviews';

/**
 * PR routes that skip the evaluation. Each entry is `<head> -> <base>` or
 * just `<base>` (any head). `*` matches any run of characters, including
 * `/`. Only heads in this repository qualify; a fork branch with a
 * matching name does not.
 *
 * Add a route here only when every commit it carries was already reviewed
 * elsewhere, like the master-to-3.x sync, whose commits landed on master.
 */
export const REQUIRED_REVIEW_EXEMPTIONS = ['sync/master-to-3x -> 3.x'];

/**
 * @typedef ExemptRoute
 * @property { string } head Glob for the head branch.
 * @property { string } base Glob for the base branch.
 * @property { string } source The entry as written.
 */

/**
 * A PR review as returned by the reviews API.
 *
 * @typedef Review
 * @property { { login: string } | null } user
 * @property { string } state
 * @property { string } [submitted_at]
 */

/**
 * @param { string } entry `<head> -> <base>` or `<base>`
 * @returns { ExemptRoute }
 */
export function parseExemption(entry) {
	const parts = entry.split('->').map((part) => part.trim());
	if (parts.length > 2 || parts.some((part) => part === '')) {
		throw new Error(`Invalid exemption "${entry}": expected "<head> -> <base>" or "<base>"`);
	}
	const [head, base] = parts.length === 2 ? parts : ['*', parts[0]];
	return { head, base, source: entry };
}

/**
 * @param { string } ref Branch name.
 * @param { string } pattern Glob where `*` matches any run of characters.
 * @returns { boolean }
 */
export function matchesBranchPattern(ref, pattern) {
	const escaped = pattern.split('*').map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
	return new RegExp(`^${escaped.join('.*')}$`).test(ref);
}

/**
 * @param { { head: { ref: string, repo: { full_name: string } | null }, base: { ref: string, repo: { full_name: string } } } } pullRequest
 * @param { string[] } [exemptions]
 * @returns { ExemptRoute | undefined } The first matching route.
 */
export function findExemption(pullRequest, exemptions = REQUIRED_REVIEW_EXEMPTIONS) {
	// A fork can name its branch anything, so the head must live in this repo.
	if (pullRequest.head.repo?.full_name !== pullRequest.base.repo.full_name) return undefined;

	return exemptions
		.map(parseExemption)
		.find(
			(route) =>
				matchesBranchPattern(pullRequest.head.ref, route.head) &&
				matchesBranchPattern(pullRequest.base.ref, route.base),
		);
}

/**
 * Resolve the PR number from the triggering event.
 *
 * @param { string } eventName
 * @param { any } event Parsed GITHUB_EVENT_PATH payload.
 * @param { string | undefined } pullRequestNumberEnv PULL_REQUEST_NUMBER (workflow_dispatch input).
 * @returns { number }
 */
export function resolvePullRequestNumber(eventName, event, pullRequestNumberEnv) {
	if (event?.pull_request?.number) return event.pull_request.number;

	const parsed = parseInt(pullRequestNumberEnv ?? '');
	if (Number.isNaN(parsed)) {
		throw new Error(`Cannot resolve a PR number for event "${eventName}"`);
	}
	return parsed;
}

/**
 * Reduce a PR's review history to the latest meaningful state per reviewer,
 * mirroring how GitHub itself treats reviews: a later APPROVED or
 * CHANGES_REQUESTED (or a dismissal) replaces the reviewer's earlier state;
 * COMMENTED and PENDING reviews carry no state.
 *
 * @param { Review[] } reviews
 * @returns { Map<string, string> } login -> latest review state
 */
export function latestReviewStates(reviews) {
	const sorted = reviews
		.filter((review) => review.user?.login)
		.filter((review) => ['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(review.state))
		.toSorted((a, b) => new Date(a.submitted_at ?? 0) - new Date(b.submitted_at ?? 0));

	const states = new Map();
	for (const review of sorted) {
		states.set(review.user.login, review.state);
	}
	return states;
}

/**
 * @param { Review[] } reviews
 * @returns { Set<string> } logins whose latest review state is APPROVED
 */
export function collectApprovers(reviews) {
	return new Set(
		[...latestReviewStates(reviews)]
			.filter(([, state]) => state === 'APPROVED')
			.map(([login]) => login),
	);
}

/**
 * @param { string[] } missingTeams Team handles without an approving member.
 * @param { number } requiredCount Total number of required teams.
 * @returns {{ state: 'success' | 'pending', description: string }}
 */
export function buildStatus(missingTeams, requiredCount) {
	if (requiredCount === 0) {
		return { state: 'success', description: 'No team approval is required for these changes' };
	}

	if (missingTeams.length === 0) {
		return {
			state: 'success',
			description: `All required team approvals are present (${requiredCount} team${requiredCount === 1 ? '' : 's'})`,
		};
	}

	// Pending, not failure: an unreviewed PR waits, it is not broken. Anything
	// other than success still blocks the merge.
	return {
		state: 'pending',
		description: `Waiting for approval from: ${missingTeams.map(teamHandleToSlug).join(', ')}`,
	};
}

function statusTargetUrl() {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return undefined;
	return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

/**
 * @param { number } pullRequestNumber
 * @returns { Promise<{ state: 'success' | 'pending', description: string }> }
 */
async function evaluateRequiredReviews(pullRequestNumber) {
	const changedFiles = await getChangedFiles(pullRequestNumber);
	const requiredTeams = resolveRequiredTeams(changedFiles, parseOwnersFile());

	/** @type { string[] } */
	const missingTeams = [];

	if (requiredTeams.size > 0) {
		const approvers = collectApprovers(await getPrReviews(pullRequestNumber));
		console.log(`Current approvals: ${[...approvers].join(', ') || '(none)'}`);

		for (const [team, files] of requiredTeams) {
			const slug = teamHandleToSlug(team);
			// Per-approver membership checks instead of fetching the roster:
			// approvers are few, teams can be large.
			const teamApprovers = [];
			for (const login of approvers) {
				if (await isTeamMember(slug, login)) teamApprovers.push(login);
			}
			const verdict = teamApprovers.length > 0 ? `approved by ${teamApprovers.join(', ')}` : 'approval missing';

			console.log(`${team}: ${verdict} — owns ${files.length} changed file(s):`);
			for (const file of files) console.log(`  - ${file}`);

			if (teamApprovers.length === 0) missingTeams.push(team);
		}
	} else {
		console.log('No changed file matches a `required` OWNERS entry.');
	}

	return buildStatus(missingTeams, requiredTeams.size);
}

export async function run() {
	const eventName = process.env.GITHUB_EVENT_NAME ?? 'workflow_dispatch';
	const event = getEventFromGithubEventPath();

	const pullRequestNumber = resolvePullRequestNumber(
		eventName,
		event,
		process.env.PULL_REQUEST_NUMBER,
	);
	const pullRequest = await getPullRequestById(pullRequestNumber);
	const statusSha = pullRequest.head.sha;
	const targetUrl = statusTargetUrl();

	// Pending first: it replaces any earlier verdict on this SHA, so a crash
	// during evaluation cannot leave a stale green status in effect.
	await setCommitStatus(statusSha, {
		state: 'pending',
		context: STATUS_CONTEXT,
		description: 'Evaluating required reviews',
		targetUrl,
	});

	/** @type { { state: 'success' | 'pending', description: string } } */
	let status;
	try {
		const exemption = findExemption(pullRequest);
		if (exemption) {
			console.log(`PR #${pullRequestNumber} matches exempt route "${exemption.source}"; skipping the evaluation.`);
			status = { state: 'success', description: `Exempt route: ${exemption.source}` };
		} else {
			status = await evaluateRequiredReviews(pullRequestNumber);
		}
	} catch (evaluationError) {
		// Best effort: nicer than a stuck pending status. The pending status
		// already blocks the merge if this write fails too.
		try {
			await setCommitStatus(statusSha, {
				state: 'error',
				context: STATUS_CONTEXT,
				description: 'Evaluation failed; see the workflow run',
				targetUrl,
			});
		} catch {}
		throw evaluationError;
	}

	console.log(`Setting "${STATUS_CONTEXT}" on ${statusSha} to ${status.state}: ${status.description}`);
	await setCommitStatus(statusSha, {
		...status,
		context: STATUS_CONTEXT,
		targetUrl,
	});
}

export const main = run;

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
