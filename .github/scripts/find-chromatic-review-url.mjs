import { initGithub, writeGithubOutput } from './github-helpers.mjs';
import { context } from '@actions/github';

async function findChromaticReviewUrl() {
	const { octokit } = initGithub();

	const refsToCheck = [context.sha, context.payload.pull_request?.head?.sha].filter(Boolean);

	const seenRefs = new Set();
	const uniqueRefs = refsToCheck.filter((ref) => {
		if (seenRefs.has(ref)) return false;
		seenRefs.add(ref);
		return true;
	});

	const findUiReviewCheck = async () => {
		for (const ref of uniqueRefs) {
			const { data } = await octokit.rest.checks.listForRef({
				owner: context.repo.owner,
				repo: context.repo.repo,
				ref,
				per_page: 100,
			});

			const checkRun = data.check_runs.find((run) => {
				const appSlug = run.app?.slug?.toLowerCase() ?? '';
				const name = run.name ?? '';
				return appSlug.includes('chromatic') && /ui review/i.test(name);
			});

			if (checkRun?.details_url) return checkRun.details_url;
		}

		return '';
	};

	let uiReviewUrl = '';
	for (let attempt = 1; attempt <= 12; attempt++) {
		uiReviewUrl = await findUiReviewCheck();
		if (uiReviewUrl) break;

		if (attempt < 12) {
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	writeGithubOutput({
		ui_review_url: uiReviewUrl,
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	findChromaticReviewUrl();
}
