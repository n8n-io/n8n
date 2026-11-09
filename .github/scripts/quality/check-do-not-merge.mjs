import {
	getEventFromGithubEventPath,
	getPullRequestById,
	readPrLabels,
} from '../github-helpers.mjs';

export async function main() {
	const event = getEventFromGithubEventPath();
	const pr = await getPullRequestById(event.pull_request.number);

	if (readPrLabels(pr).includes('Do Not Merge')) {
		throw new Error("This PR has the 'Do Not Merge' label and cannot be merged.");
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
