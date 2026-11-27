/**
 * Runs when the `n8n node` job finds changes that break saved workflows of the n8n node.
 *
 * A maintainer (write access or above) allows the breaking changes by commenting
 * `/n8n-node-break-override` on the PR and re-running the job.
 *
 * Exit codes:
 *   0 – A valid override comment exists
 *   1 – No valid override comment
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

export const OVERRIDE_COMMAND = '/n8n-node-break-override';

const MAINTAINER_PERMISSIONS = ['admin', 'maintain', 'write'];

export async function main() {
	const { pull_request: pr } = getEventFromGithubEventPath();
	const { octokit, owner, repo } = initGithub();

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		owner,
		repo,
		issue_number: pr.number,
		per_page: 100,
	});

	for (const comment of comments) {
		if (!comment.body?.startsWith(OVERRIDE_COMMAND) || !comment.user) {
			continue;
		}
		const { data } = await octokit.rest.repos.getCollaboratorPermissionLevel({
			owner,
			repo,
			username: comment.user.login,
		});
		if (MAINTAINER_PERMISSIONS.includes(data.permission)) {
			console.log(`${OVERRIDE_COMMAND} from @${comment.user.login} allows the breaking changes.`);
			return;
		}
	}

	throw new Error(
		[
			'This PR might break saved workflows of the n8n node.',
			'See "Breaking changes" in packages/@n8n/n8n-node-codegen/README.md.',
			`To make the breaking changes on purpose, a maintainer can do that by commenting \`${OVERRIDE_COMMAND}\` on the PR and re-runs this job.`,
		].join(' '),
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
