/**
 * Re-triggers the PR Size Limit check when a maintainer comments `/size-limit-override`.
 *
 * Re-runs failed jobs in the latest PR quality workflow that ran the size check for this PR and HEAD.
 * This also re-runs the required aggregate check after the size check passes.
 *
 * Exit codes:
 *   0 – Failed jobs re-run, or the workflow already passed
 *   1 – Commenter lacks permission, or the workflow cannot re-run yet
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

const WORKFLOW_ID = 'ci-pr-quality.yml';
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

	let workflowRun;
	for await (const { data: runs } of octokit.paginate.iterator(
		octokit.rest.actions.listWorkflowRuns,
		{
			owner,
			repo,
			workflow_id: WORKFLOW_ID,
			event: 'pull_request',
			head_sha: headSha,
			per_page: 100,
		},
	)) {
		for (const candidate of runs) {
			if (!candidate.pull_requests.some((pullRequest) => pullRequest.number === prNumber)) continue;

			const jobs = await octokit.paginate(octokit.rest.actions.listJobsForWorkflowRun, {
				owner,
				repo,
				run_id: candidate.id,
				per_page: 100,
			});
			// Label events can pass while the size check is skipped.
			if (jobs.some((job) => job.name === CHECK_NAME && job.conclusion !== 'skipped')) {
				workflowRun = candidate;
				break;
			}
		}
		if (workflowRun) break;
	}

	if (!workflowRun) {
		throw new Error(
			`No PR quality workflow found with '${CHECK_NAME}' for PR #${prNumber} at ${headSha}. Push a new commit to trigger it.`,
		);
	}

	if (workflowRun.status !== 'completed') {
		throw new Error('Wait for the PR quality workflow to finish, then post the override again.');
	}

	if (workflowRun.conclusion !== 'success') {
		await octokit.rest.actions.reRunWorkflowFailedJobs({
			owner,
			repo,
			run_id: workflowRun.id,
		});
	}

	await octokit.rest.reactions.createForIssueComment({
		owner,
		repo,
		comment_id: commentId,
		content: '+1',
	});

	console.log(`Processed size override for PR quality workflow ${workflowRun.id} on ${headSha}`);
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
