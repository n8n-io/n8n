// Invoked from .github/workflows/ci-cla-check.yml via actions/github-script.
//
// Reads the triggering event (pull_request_target, issue_comment, or
// merge_group) and emits the head/base SHA and PR number that the rest of
// the workflow needs. For /cla-check comments, also leaves an "eyes"
// reaction so the commenter sees we picked it up.

/**
 * @typedef { InstanceType<typeof import("@actions/github/lib/utils").GitHub> } GitHubInstance
 * @typedef { import("@actions/github/lib/context").Context } Context
 * @typedef { typeof import("@actions/core") } Core
 */

/**
 * @param {{ github: GitHubInstance, context: Context, core: Core }} params
 */
export default async function resolveClaContext({ github, context, core }) {
	const { owner, repo } = context.repo;
	const event = context.eventName;

	let prNumber = '';
	let headSha = '';
	let baseSha = '';
	let isMergeGroup = false;

	if (event === 'pull_request_target' && context.payload.pull_request) {
		const pr = context.payload.pull_request;
		prNumber = String(pr.number);
		headSha = pr.head.sha;
		baseSha = pr.base.sha;
	} else if (event === 'issue_comment' && context.payload.issue) {
		prNumber = String(context.payload.issue.number);
		const { data: pr } = await github.rest.pulls.get({
			owner,
			repo,
			pull_number: Number(prNumber),
		});
		headSha = pr.head.sha;
		baseSha = pr.base.sha;

		// Acknowledge the command so the commenter sees we received it.
		try {
			await github.rest.reactions.createForIssueComment({
				owner,
				repo,
				comment_id: context.payload.comment?.id || -1,
				content: 'eyes',
			});
		} catch (e) {
			core.info(`Could not react to comment: ${e instanceof Error ? e.message : String(e)}`);
		}
	} else if (event === 'merge_group') {
		isMergeGroup = true;
		headSha = context.payload.merge_group.head_sha;
		baseSha = context.payload.merge_group.base_sha;
	} else if (event === 'workflow_dispatch') {
		const input = context.payload.inputs?.pr_number;
		if (!input) {
			core.setFailed('workflow_dispatch requires the pr_number input');
			return;
		}
		prNumber = String(input);
		const { data: pr } = await github.rest.pulls.get({
			owner,
			repo,
			pull_number: Number(prNumber),
		});
		headSha = pr.head.sha;
		baseSha = pr.base.sha;
	}

	core.setOutput('pr_number', prNumber);
	core.setOutput('head_sha', headSha);
	core.setOutput('base_sha', baseSha);
	core.setOutput('is_merge_group', String(isMergeGroup));
}
