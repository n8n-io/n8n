/**
 * Re-triggers the PR Size Limit check when a maintainer comments `/size-limit-override`.
 *
 * Finds the newest completed, non-skipped `PR Size Limit` check run on the PR's HEAD commit
 * and re-requests it so unrelated label runs cannot intercept the override.
 * The re-run scans comments, finds the override, and passes — satisfying branch protection
 * without any label manipulation or status API calls.
 *
 * Exit codes:
 *   0 – Check run re-requested successfully
 *   1 – Commenter lacks permission, or no executed check run found to re-request
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';
import { listCheckRuns, selectLatestExecutedRun } from './preserve-skipped-checks.mjs';

const CHECK_NAME = 'PR Size Limit';

/**
 * @param {{
 *   octokit: import('../github-helpers.mjs').GitHubInstance,
 *   owner: string,
 *   repo: string,
 *   prNumber: number,
 *   commenter: string,
 *   commentId: number,
 * }} params
 */
export async function run({ octokit, owner, repo, prNumber, commenter, commentId }) {
	const { data: perm } = await octokit.rest.repos.getCollaboratorPermissionLevel({
		owner,
		repo,
		username: commenter,
	});

	if (!['admin', 'write', 'maintain'].includes(perm.permission)) {
		throw new Error(
			`@${commenter} does not have permission to override the PR size limit (requires write access).`,
		);
	}

	const { data: pr } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: prNumber,
	});
	const headSha = pr.head.sha;

	const checkRuns = await listCheckRuns({
		octokit,
		owner,
		repo,
		headSha,
		checkName: CHECK_NAME,
	});
	const latestExecutedRun = selectLatestExecutedRun(checkRuns);

	if (!latestExecutedRun) {
		throw new Error(
			`No executed '${CHECK_NAME}' check run found for ${headSha}. Push a new commit to trigger it.`,
		);
	}

	await octokit.rest.checks.rerequestRun({
		owner,
		repo,
		check_run_id: latestExecutedRun.id,
	});

	await octokit.rest.reactions.createForIssueComment({
		owner,
		repo,
		comment_id: commentId,
		content: '+1',
	});

	console.log(`Re-requested '${CHECK_NAME}' check run (${latestExecutedRun.id}) for ${headSha}`);
}

export async function main() {
	const event = getEventFromGithubEventPath();
	const { octokit, owner, repo } = initGithub();

	await run({
		octokit,
		owner,
		repo,
		prNumber: event.issue.number,
		commenter: event.sender.login,
		commentId: event.comment.id,
	});
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
