/**
 * Re-triggers the PR Size Limit check when a maintainer comments `/size-limit-override`.
 *
 * Re-runs failed jobs in the latest PR quality workflow for the current HEAD.
 * This also re-runs the required aggregate check after the size check passes.
 *
 * Exit codes:
 *   0 – Failed jobs re-run, or the workflow already passed
 *   1 – Commenter lacks permission, or the workflow cannot re-run yet
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

const WORKFLOW_ID = 'ci-pr-quality.yml';

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

	const {
		data: { workflow_runs },
	} = await octokit.rest.actions.listWorkflowRuns({
		owner,
		repo,
		workflow_id: WORKFLOW_ID,
		event: 'pull_request',
		head_sha: headSha,
		per_page: 1,
	});

	const workflowRun = workflow_runs[0];
	if (!workflowRun) {
		throw new Error(
			`No PR quality workflow found for ${headSha}. Push a new commit to trigger it.`,
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
