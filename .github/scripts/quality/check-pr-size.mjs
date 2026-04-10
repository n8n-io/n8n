/**
 * Checks that the PR does not exceed the line addition limit.
 *
 * A maintainer (write access or above) can override by commenting `/size-limit-override`
 * on the PR. The override takes effect on the next pull_request event (push, reopen, etc.).
 *
 * Exit codes:
 *   0 – PR is within the limit, or a valid override comment exists
 *   1 – PR exceeds the limit with no valid override
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

export const SIZE_LIMIT = 1000;
export const OVERRIDE_COMMAND = '/size-limit-override';

const BOT_MARKER = '<!-- pr-size-check -->';

/**
 * Returns true if any comment in the list is a valid `/size-limit-override` from a
 * user with write access or above.
 *
 * @param {Array<{ body?: string, user: { login: string } }>} comments
 * @param {(username: string) => Promise<string>} getPermission - returns the permission level string
 * @returns {Promise<boolean>}
 */
export async function hasValidOverride(comments, getPermission) {
	for (const comment of comments) {
		if (!comment.body?.startsWith(OVERRIDE_COMMAND)) {
			continue;
		}

		const perm = await getPermission(comment.user.login);
		if (['admin', 'write', 'maintain'].includes(perm)) {
			return true;
		}
	}
	return false;
}

async function main() {
	const event = getEventFromGithubEventPath();
	const pr = event.pull_request;
	const { octokit, owner, repo } = initGithub();

	const additions = pr.additions;

	const { data: comments } = await octokit.rest.issues.listComments({
		owner,
		repo,
		issue_number: pr.number,
		per_page: 100,
		sort: 'created',
		direction: 'desc',
	});

	const overrideFound = await hasValidOverride(comments, async (username) => {
		const { data: perm } = await octokit.rest.repos.getCollaboratorPermissionLevel({
			owner,
			repo,
			username,
		});
		return perm.permission;
	});

	const botComment = comments.find((c) => c.body.includes(BOT_MARKER));

	if (additions > SIZE_LIMIT && !overrideFound) {
		const message = [
			BOT_MARKER,
			`## ⚠️ PR exceeds size limit (${additions.toLocaleString()} lines added)`,
			'',
			`This PR adds **${additions.toLocaleString()} lines**, exceeding the ${SIZE_LIMIT.toLocaleString()}-line limit.`,
			'',
			'Large PRs are harder to review and increase the risk of bugs going unnoticed. Please consider:',
			'- Breaking this into smaller, logically separate PRs',
			'- Moving unrelated changes to a follow-up PR',
			'',
			`If the size is genuinely justified (e.g. generated code, large migrations, test fixtures), a maintainer can override by commenting \`${OVERRIDE_COMMAND}\` and then pushing a new commit or re-running this check.`,
		].join('\n');

		if (botComment) {
			await octokit.rest.issues.updateComment({
				owner,
				repo,
				comment_id: botComment.id,
				body: message,
			});
		} else {
			await octokit.rest.issues.createComment({
				owner,
				repo,
				issue_number: pr.number,
				body: message,
			});
		}

		console.log(
			`::error::PR adds ${additions.toLocaleString()} lines, exceeding the ${SIZE_LIMIT.toLocaleString()}-line limit. Reduce PR size or ask a maintainer to comment \`${OVERRIDE_COMMAND}\`.`,
		);
		process.exit(1);
	} else {
		if (botComment) {
			await octokit.rest.issues.deleteComment({
				owner,
				repo,
				comment_id: botComment.id,
			});
		}
		if (overrideFound && additions > SIZE_LIMIT) {
			console.log(
				`PR size limit overridden. ${additions.toLocaleString()} lines added (limit: ${SIZE_LIMIT.toLocaleString()}).`,
			);
		}
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
