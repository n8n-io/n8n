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
const TARGET_BRANCH = 'master';

/**
 * A PR review as returned by the reviews API.
 *
 * @typedef Review
 * @property { { login: string } | null } user
 * @property { string } state
 * @property { string } [submitted_at]
 */

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
 * @returns {{ state: 'success' | 'failure', description: string }}
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

	return {
		state: 'failure',
		description: `Missing approval from: ${missingTeams.map(teamHandleToSlug).join(', ')}`,
	};
}

function statusTargetUrl() {
	const { GITHUB_SERVER_URL, GITHUB_REPOSITORY, GITHUB_RUN_ID } = process.env;
	if (!GITHUB_SERVER_URL || !GITHUB_REPOSITORY || !GITHUB_RUN_ID) return undefined;
	return `${GITHUB_SERVER_URL}/${GITHUB_REPOSITORY}/actions/runs/${GITHUB_RUN_ID}`;
}

/**
 * @param { number } pullRequestNumber
 * @returns { Promise<{ state: 'success' | 'failure', description: string }> }
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

	if (pullRequest.base.ref !== TARGET_BRANCH) {
		console.log(`PR #${pullRequestNumber} targets "${pullRequest.base.ref}", not "${TARGET_BRANCH}"; skipping.`);
		return;
	}

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

	/** @type { { state: 'success' | 'failure', description: string } } */
	let status;
	try {
		status = await evaluateRequiredReviews(pullRequestNumber);
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

if (import.meta.url === `file://${process.argv[1]}`) {
	await run();
}
