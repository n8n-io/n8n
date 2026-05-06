/**
 * Re-triggers the PR Size Limit check when a maintainer comments `/size-limit-override`.
 *
 * Finds the latest `PR Size Limit` check run on the PR's HEAD commit and re-requests it.
 * The re-run scans comments, finds the override, and passes — satisfying branch protection
 * without any label manipulation or status API calls.
 *
 * Exit codes:
 *   0 – Check run re-requested successfully
 *   1 – Commenter lacks permission, or no check run found to re-request
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

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
		console.log(
			`::error::@${commenter} does not have permission to override the PR size limit (requires write access).`,
		);
		process.exit(1);
	}

	const { data: pr } = await octokit.rest.pulls.get({
		owner,
		repo,
		pull_number: prNumber,
	});
	const headSha = pr.head.sha;

	const {
		data: { check_runs },
	} = await octokit.rest.checks.listForRef({
		owner,
		repo,
		ref: headSha,
		check_name: CHECK_NAME,
		per_page: 1,
	});

	if (check_runs.length === 0) {
		console.log(
			`::error::No '${CHECK_NAME}' check run found for ${headSha}. Push a new commit to trigger it.`,
		);
		process.exit(1);
	}

	await octokit.rest.checks.rerequestRun({
		owner,
		repo,
		check_run_id: check_runs[0].id,
	});

	await octokit.rest.reactions.createForIssueComment({
		owner,
		repo,
		comment_id: commentId,
		content: '+1',
	});

	console.log(`Re-requested '${CHECK_NAME}' check run (${check_runs[0].id}) for ${headSha}`);
}

async function main() {
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
