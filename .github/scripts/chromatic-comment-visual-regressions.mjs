import { initGithub } from './github-helpers.mjs';
import { context } from '@actions/github';

async function commentVisualRegressions() {
	const { octokit, owner, repo } = initGithub();

	const issue_number = context.payload.pull_request.number;
	const marker = '<!-- chromatic-visual-regression-results -->';
	const changeCount = process.env.CHANGE_COUNT ?? '0';
	const buildUrl = process.env.BUILD_URL;
	const uiReviewUrl = process.env.UI_REVIEW_URL;

	const uiReviewLine = uiReviewUrl
		? `- UI Review: [Open Chromatic PR](${uiReviewUrl})`
		: '- UI Review: UI Review check not found (Chromatic PR link unavailable)';

	const body =
		`${marker}\n` +
		`## Chromatic Results\n\n` +
		`- Visual changes: **${changeCount}**\n` +
		`- Build: [Open Chromatic build](${buildUrl})\n` +
		`${uiReviewLine}`;

	const { data: comments } = await octokit.rest.issues.listComments({
		owner,
		repo,
		issue_number,
		per_page: 100,
	});

	const existing = comments.find((comment) => comment.body?.includes(marker));

	if (existing) {
		await octokit.rest.issues.updateComment({
			owner,
			repo,
			comment_id: existing.id,
			body,
		});
	} else {
		await octokit.rest.issues.createComment({
			owner,
			repo,
			issue_number,
			body,
		});
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	commentVisualRegressions();
}
