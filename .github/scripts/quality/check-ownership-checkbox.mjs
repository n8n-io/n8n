/**
 * Checks that the PR description contains a checked ownership acknowledgement checkbox.
 *
 * Exit codes:
 *   0 – Checkbox is present and checked
 *   1 – Checkbox is missing or unchecked
 */

import { initGithub, getEventFromGithubEventPath } from '../github-helpers.mjs';

const BOT_MARKER = '<!-- pr-ownership-check -->';

/**
 * Returns true if the PR body contains a checked ownership acknowledgement checkbox.
 *
 * @param {string | null | undefined} body
 * @returns {boolean}
 */
export function isOwnershipCheckboxChecked(body) {
	return /\[x\]\s+I have seen this code,\s+I have run this code,\s+and I take responsibility for this code/i.test(
		body ?? '',
	);
}

async function main() {
	const event = getEventFromGithubEventPath();
	const pr = event.pull_request;
	const { octokit, owner, repo } = initGithub();

	const { data: comments } = await octokit.rest.issues.listComments({
		owner,
		repo,
		issue_number: pr.number,
		per_page: 100,
	});
	const botComment = comments.find((c) => c.body.includes(BOT_MARKER));

	if (!isOwnershipCheckboxChecked(pr.body)) {
		const message = [
			BOT_MARKER,
			'## ⚠️ Ownership acknowledgement required',
			'',
			'Please add or check the following item in your PR description before this can be merged:',
			'',
			'```',
			'- [x] I have seen this code, I have run this code, and I take responsibility for this code.',
			'```',
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
			'::error::Ownership checkbox is not checked. Add it to your PR description and check it.',
		);
		process.exit(1);
	} else if (botComment) {
		await octokit.rest.issues.deleteComment({
			owner,
			repo,
			comment_id: botComment.id,
		});
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
