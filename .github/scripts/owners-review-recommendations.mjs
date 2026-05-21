import { ensureEnvVar, getChangedFiles, initGithub } from "./github-helpers.mjs";
import { assignOwnership, ownershipsToAllocations, parseOwnersFile } from "./owners.mjs";

/** @typedef {import('./owners.mjs').Allocation} Allocation */

/**
 * @param { number } pullRequestNumber
 * */
export async function getReviewRecommendations(pullRequestNumber) {
	const changedFiles = await getChangedFiles(pullRequestNumber);
	const owners = parseOwnersFile();

	const ownerships = assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);

	const topAllocations = allocations.sort((a, b) => b.fileCount - a.fileCount).slice(0, 3);

	await commentOnPrWithRecommendations(pullRequestNumber, topAllocations, changedFiles);
}

const BOT_MARKER = "<!-- owners-review-recommendations -->";

/**
 * Build the PR comment body listing the top reviewer teams with their share
 * of ownership over the changed files.
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @returns { string }
 * */
export function buildRecommendationsBody(allocations, changedFiles) {
	const total = changedFiles.size;

	if (allocations.length === 0 || total === 0) {
		return [
			BOT_MARKER,
			"## Recommended reviewers",
			"",
			"_No owning teams matched the files changed in this PR._",
		].join("\n");
	}

	const rows = allocations.map(({ team, fileCount }) => {
		const pct = Math.round((fileCount / total) * 100);
		return `| ${team} | ${fileCount} | ${pct}% |`;
	});

	return [
		BOT_MARKER,
		"## Recommended reviewers",
		"",
		`Based on ownership of the ${total} changed file${total === 1 ? "" : "s"} in this PR:`,
		"",
		"| Team | Files owned | Share |",
		"| --- | ---: | ---: |",
		...rows,
	].join("\n");
}

/**
 * Post the recommendations as a PR comment, or update the existing one if a
 * previous run already left one (identified by BOT_MARKER).
 *
 * @param { number } pullRequestNumber
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * */
export async function commentOnPrWithRecommendations(pullRequestNumber, allocations, changedFiles) {
	const { octokit, owner, repo } = initGithub();

	const body = buildRecommendationsBody(allocations, changedFiles);

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		owner,
		repo,
		issue_number: pullRequestNumber,
		per_page: 100,
	});

	const existing = comments.find(c => c.body?.includes(BOT_MARKER));

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
			issue_number: pullRequestNumber,
			body,
		});
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	const pullRequestNumber = parseInt(ensureEnvVar("PULL_REQUEST_NUMBER"));

	await getReviewRecommendations(pullRequestNumber);
}
