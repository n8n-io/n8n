/**
 * PR recommendations entry point.
 *
 * Posts (or updates) a single PR comment that combines:
 *   - Recommended reviewer teams based on file ownership
 *   - A breakdown of changed lines by category (source code, test files, misc)
 *
 * Advisory only — does not gate merging.
 */

import { minimatch } from 'minimatch';
import { ensureEnvVar, getPrFiles, initGithub } from './github-helpers.mjs';
import { assignOwnership, ownershipsToAllocations, parseOwnersFile } from './owners.mjs';
import { MISC_PATTERNS, SIZE_LIMIT, TEST_PATTERNS } from './quality/check-pr-size.mjs';

/** @typedef {import('./owners.mjs').Allocation} Allocation */

/**
 * @typedef {{ sourceCode: number, testFiles: number, misc: number }} LineStats
 */

const BOT_MARKER = '<!-- pr-recommendations -->';

/**
 * Compute line addition counts categorised as source code, test files, or misc.
 *
 * @param { Array<{ filename: string, additions: number }> } files
 * @returns { LineStats }
 */
export function computeLineStats(files) {
	let sourceCode = 0;
	let testFiles = 0;
	let misc = 0;

	for (const file of files) {
		const isTest = TEST_PATTERNS.some((p) => minimatch(file.filename, p));
		const isMisc = !isTest && MISC_PATTERNS.some((p) => minimatch(file.filename, p));

		if (isTest) {
			testFiles += file.additions;
		} else if (isMisc) {
			misc += file.additions;
		} else {
			sourceCode += file.additions;
		}
	}

	return { sourceCode, testFiles, misc };
}

/**
 * Build the reviewer recommendations section (no bot marker).
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @returns { string }
 */
export function buildReviewersSection(allocations, changedFiles) {
	const total = changedFiles.size;

	if (allocations.length === 0 || total === 0) {
		return [
			'## Recommended reviewers',
			'',
			'_No owning teams matched the files changed in this PR._',
		].join('\n');
	}

	const rows = allocations.map(({ team, fileCount }) => {
		const pct = Math.round((fileCount / total) * 100);
		return `| ${team} | ${fileCount} | ${pct}% |`;
	});

	return [
		'## Recommended reviewers',
		'',
		`Based on ownership of the ${total} changed file${total === 1 ? '' : 's'} in this PR:`,
		'',
		'| Team | Files owned | Share |',
		'| --- | ---: | ---: |',
		...rows,
	].join('\n');
}

/**
 * Build the changed-lines section of the PR comment.
 *
 * @param { LineStats } lineStats
 * @returns { string }
 */
export function buildChangedLinesSection(lineStats) {
	const sourceLabel = lineStats.sourceCode > SIZE_LIMIT ? 'Source code ❗' : 'Source code';

	return [
		'## Changed lines',
		'',
		'| Category | Lines added |',
		'| --- | ---: |',
		`| ${sourceLabel} | ${lineStats.sourceCode.toLocaleString()} |`,
		`| Test files | ${lineStats.testFiles.toLocaleString()} |`,
		`| Misc | ${lineStats.misc.toLocaleString()} |`,
	].join('\n');
}

/**
 * Construct the full PR comment body from reviewer allocations and line stats.
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @param { LineStats } lineStats
 * @returns { string }
 */
export function buildComment(allocations, changedFiles, lineStats) {
	return [
		BOT_MARKER,
		buildReviewersSection(allocations, changedFiles),
		'',
		buildChangedLinesSection(lineStats),
	].join('\n');
}

/**
 * Post the comment on the PR, or update the existing one if a previous run
 * already left one (identified by BOT_MARKER).
 *
 * @param { number } pullRequestNumber
 * @param { string } body
 */
async function postOrUpdateComment(pullRequestNumber, body) {
	const { octokit, owner, repo } = initGithub();

	const comments = await octokit.paginate(octokit.rest.issues.listComments, {
		owner,
		repo,
		issue_number: pullRequestNumber,
		per_page: 100,
	});

	const existing = comments.find((c) => c.body?.includes(BOT_MARKER));

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

function getTopAllocations(changedFiles) {
	const owners = parseOwnersFile();
	const ownerships = assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);
	const topAllocations = allocations.sort((a, b) => b.fileCount - a.fileCount).slice(0, 3);
	return topAllocations;
}

/**
 * @param { number } pullRequestNumber
 */
export async function run(pullRequestNumber) {
	const files = await getPrFiles(pullRequestNumber);

	const changedFiles = new Set([
		...files.map((f) => f.filename),
		...files.filter((f) => f.previous_filename).map((f) => f.previous_filename),
	]);

	const lineStats = computeLineStats(files);
	const topAllocations = getTopAllocations(changedFiles);

	const body = buildComment(topAllocations, changedFiles, lineStats);

	await postOrUpdateComment(pullRequestNumber, body);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const pullRequestNumber = parseInt(ensureEnvVar('PULL_REQUEST_NUMBER'));
	await run(pullRequestNumber);
}
