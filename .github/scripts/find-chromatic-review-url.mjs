import { initGithub, writeGithubOutput } from './github-helpers.mjs';
import { context } from '@actions/github';

const retries = 12;

async function findChromaticReviewUrl() {
	const { octokit } = initGithub();

	const refsToCheck = [context.payload.pull_request?.head?.sha].filter(Boolean);

	const seenRefs = new Set();
	const uniqueRefs = refsToCheck.filter((ref) => {
		if (seenRefs.has(ref)) return false;
		seenRefs.add(ref);
		return true;
	});

	const findUiReviewCheck = async () => {
		for (const ref of uniqueRefs) {
			const { data: status } = await octokit.rest.repos.getCombinedStatusForRef({
				owner: context.repo.owner,
				repo: context.repo.repo,
				ref,
				per_page: 100,
			});

			const reviewStatus = status.statuses.find((stat) => stat.context.includes('UI Review'));

			if (reviewStatus?.target_url) {
				return reviewStatus.target_url;
			}
		}

		return '';
	};

	let uiReviewUrl = '';
	for (let attempt = 1; attempt <= retries; attempt++) {
		uiReviewUrl = await findUiReviewCheck();
		if (uiReviewUrl) break;

		if (attempt < retries) {
			await new Promise((resolve) => setTimeout(resolve, 5000));
		}
	}

	const output = {
		ui_review_url: uiReviewUrl,
	};
	console.log('Output: ', output);

	writeGithubOutput(output);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	findChromaticReviewUrl();
}
