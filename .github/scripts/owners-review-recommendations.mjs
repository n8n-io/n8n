/**
 * PR recommendations entry point.
 *
 * Posts (or updates) a single PR comment that combines:
 *   - Recommended reviewer teams based on file ownership
 *   - A breakdown of changed lines by category (source code, test files, misc)
 *   - The required team reviews (OWNERS entries with `required`), with a
 *     suggested reviewer that covers the most required teams
 *
 * Advisory only — does not gate merging. Enforcement of required reviews
 * lives in owners-required-reviews.mjs.
 */

import { minimatch } from 'minimatch';
import {
	ensureEnvVar,
	getPrFiles,
	getPullRequestById,
	listTeamMembers,
	postOrUpdateComment,
} from './github-helpers.mjs';
import {
	assignOwnership,
	ownershipsToAllocations,
	parseOwnersFile,
	resolveRequiredTeams,
	teamHandleToSlug,
} from './owners.mjs';
import { MISC_PATTERNS, SIZE_LIMIT, TEST_PATTERNS } from './quality/check-pr-size.mjs';

/** @typedef {import('./owners.mjs').Allocation} Allocation */

/**
 * @typedef {{
 *   sourceCodeAdded: number, sourceCodeRemoved: number,
 *   testFilesAdded: number, testFilesRemoved: number,
 *   miscAdded: number, miscRemoved: number,
 * }} LineStats
 */

const BOT_MARKER = '<!-- pr-recommendations -->';

function createEmptyLineStats() {
	return {
		sourceCodeAdded: 0,
		sourceCodeRemoved: 0,
		testFilesAdded: 0,
		testFilesRemoved: 0,
		miscAdded: 0,
		miscRemoved: 0,
	};
}

/**
 * @param { LineStats } stats
 * @param {{ filename: string, additions: number, deletions: number }} file
 */
function addFileToLineStats(stats, file) {
	const isTest = TEST_PATTERNS.some((p) => minimatch(file.filename, p));
	const isMisc = !isTest && MISC_PATTERNS.some((p) => minimatch(file.filename, p));

	if (isTest) {
		stats.testFilesAdded += file.additions;
		stats.testFilesRemoved += file.deletions;
	} else if (isMisc) {
		stats.miscAdded += file.additions;
		stats.miscRemoved += file.deletions;
	} else {
		stats.sourceCodeAdded += file.additions;
		stats.sourceCodeRemoved += file.deletions;
	}
}

/**
 * Compute line addition and deletion counts categorised as source code,
 * test files, or misc.
 *
 * @param { Array<{ filename: string, additions: number, deletions: number }> } files
 * @returns { LineStats }
 */
export function computeLineStats(files) {
	const stats = createEmptyLineStats();

	for (const file of files) {
		addFileToLineStats(stats, file);
	}

	return stats;
}

/**
 * Compute line stats for each owner allocation. Renamed files can be owned by
 * either their previous or current filename, but are counted only once per team.
 *
 * @param { Allocation[] } allocations
 * @param { Map<string, string[]> } ownerships
 * @param { Array<{ filename: string, previous_filename?: string, additions: number, deletions: number }> } files
 * @returns { Map<string, LineStats> }
 */
export function computeAllocationLineStats(allocations, ownerships, files) {
	const statsByTeam = new Map();

	for (const { team } of allocations) {
		const stats = createEmptyLineStats();
		const ownedFiles = new Set(ownerships.get(team) ?? []);

		for (const file of files) {
			if (ownedFiles.has(file.filename) || ownedFiles.has(file.previous_filename)) {
				addFileToLineStats(stats, file);
			}
		}

		statsByTeam.set(team, stats);
	}

	return statsByTeam;
}

/**
 * @param { LineStats } lineStats
 * @param {'sourceCode' | 'testFiles' | 'misc'} key
 * @returns { string }
 */
function formatLineStatsCell(lineStats, key) {
	return `+${lineStats[`${key}Added`].toLocaleString()} / -${lineStats[`${key}Removed`].toLocaleString()}`;
}

/**
 * @param { LineStats } lineStats
 * @returns { number }
 */
function totalLineChanges(lineStats) {
	return (
		lineStats.sourceCodeAdded +
		lineStats.sourceCodeRemoved +
		lineStats.testFilesAdded +
		lineStats.testFilesRemoved +
		lineStats.miscAdded +
		lineStats.miscRemoved
	);
}

/**
 * @param { LineStats } target
 * @param { LineStats } source
 */
function addLineStats(target, source) {
	target.sourceCodeAdded += source.sourceCodeAdded;
	target.sourceCodeRemoved += source.sourceCodeRemoved;
	target.testFilesAdded += source.testFilesAdded;
	target.testFilesRemoved += source.testFilesRemoved;
	target.miscAdded += source.miscAdded;
	target.miscRemoved += source.miscRemoved;
}

/**
 * @param { Allocation[] } allocations
 * @param { Map<string, LineStats> } lineStatsByTeam
 * @returns { LineStats }
 */
function aggregateLineStats(allocations, lineStatsByTeam) {
	const stats = createEmptyLineStats();

	for (const { team } of allocations) {
		addLineStats(stats, lineStatsByTeam.get(team) ?? createEmptyLineStats());
	}

	return stats;
}

/**
 * Build an ownership-first overview table with line stats grouped by team.
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @param { LineStats } totalLineStats
 * @param { Map<string, LineStats> } lineStatsByTeam
 * @param { Allocation[] } [otherAllocations]
 * @returns { string }
 */
export function buildOverviewTable(allocations, changedFiles, totalLineStats, lineStatsByTeam, otherAllocations = []) {
	const total = changedFiles.size;
	const rows = allocations.length > 0 && total > 0
		? allocations.map(({ team, fileCount }) => {
			const pct = Math.round((fileCount / total) * 100);
			const teamLineStats = lineStatsByTeam.get(team) ?? createEmptyLineStats();
			return `| ${team} | ${fileCount} | ${pct}% | ${formatLineStatsCell(teamLineStats, 'sourceCode')} | ${formatLineStatsCell(teamLineStats, 'testFiles')} | ${formatLineStatsCell(teamLineStats, 'misc')} |`;
		})
		: [`| _No owning teams matched_ | 0 | 0% | ${formatLineStatsCell(totalLineStats, 'sourceCode')} | ${formatLineStatsCell(totalLineStats, 'testFiles')} | ${formatLineStatsCell(totalLineStats, 'misc')} |`];

	if (otherAllocations.length > 0 && total > 0) {
		const otherFileCount = otherAllocations.reduce((sum, { fileCount }) => sum + fileCount, 0);
		const otherPct = Math.round((otherFileCount / total) * 100);
		const otherLineStats = aggregateLineStats(otherAllocations, lineStatsByTeam);
		rows.push(`| Other teams | ${otherFileCount} | ${otherPct}% | ${formatLineStatsCell(otherLineStats, 'sourceCode')} | ${formatLineStatsCell(otherLineStats, 'testFiles')} | ${formatLineStatsCell(otherLineStats, 'misc')} |`);
	}

	return [
		'## PR review overview',
		'',
		`Based on ownership of the ${total} changed file${total === 1 ? '' : 's'} in this PR:`,
		'',
		'| Ownership | Files owned | Share | Source code | Test files | Misc |',
		'| --- | ---: | ---: | ---: | ---: | ---: |',
		...rows,
		`| **Total** | **${total.toLocaleString()}** | **${total === 0 ? 0 : 100}%** | **${formatLineStatsCell(totalLineStats, 'sourceCode')}** | **${formatLineStatsCell(totalLineStats, 'testFiles')}** | **${formatLineStatsCell(totalLineStats, 'misc')}** |`,
	].join('\n');
}

/**
 * Pick the reviewer that covers the most required teams. Ties are broken in
 * favor of reviewers that share a team with the PR author, then
 * alphabetically for a stable result.
 *
 * @param { string[] } requiredTeams Team handles whose approval is required.
 * @param { Map<string, Set<string>> } membersByTeam Team handle -> member logins (may include non-required teams, used for the same-team tie-break).
 * @param { string } author PR author login, excluded from candidates.
 * @returns { { login: string, coveredTeams: string[] } | null }
 */
export function suggestReviewer(requiredTeams, membersByTeam, author) {
	/** @type { Map<string, number> } */
	const coverage = new Map();

	for (const team of requiredTeams) {
		for (const login of membersByTeam.get(team) ?? []) {
			if (login === author) continue;
			coverage.set(login, (coverage.get(login) ?? 0) + 1);
		}
	}

	if (coverage.size === 0) return null;

	const authorTeams = [...membersByTeam]
		.filter(([, members]) => members.has(author))
		.map(([team]) => team);
	const sharesTeamWithAuthor = (login) =>
		authorTeams.some((team) => membersByTeam.get(team)?.has(login));

	const [login] = [...coverage.entries()].toSorted(
		([loginA, coverageA], [loginB, coverageB]) =>
			coverageB - coverageA ||
			Number(sharesTeamWithAuthor(loginB)) - Number(sharesTeamWithAuthor(loginA)) ||
			loginA.localeCompare(loginB),
	)[0];

	return {
		login,
		coveredTeams: requiredTeams.filter((team) => membersByTeam.get(team)?.has(login)),
	};
}

/**
 * Build the section that lists required team approvals and, when available,
 * a suggested reviewer. Returns null when no approval is required.
 *
 * @param { Map<string, string[]> } requiredTeamFiles Required team handle -> files that triggered the requirement.
 * @param { { login: string, coveredTeams: string[] } | null } [suggestion]
 * @returns { string | null }
 */
export function buildRequiredReviewsSection(requiredTeamFiles, suggestion = null) {
	if (requiredTeamFiles.size === 0) return null;

	const lines = [
		'### Required reviews',
		'',
		'Some changed files have a `required` owner in `.github/OWNERS`. A member of each of these teams must approve this PR before it can merge:',
		'',
		'| Team | Files |',
		'| --- | ---: |',
		...[...requiredTeamFiles].map(([team, files]) => `| ${team} | ${files.length} |`),
	];

	if (suggestion) {
		lines.push(
			'',
			`**Suggested reviewer:** @${suggestion.login} (covers ${suggestion.coveredTeams.join(', ')})`,
		);
	}

	return lines.join('\n');
}

/**
 * Construct the full PR comment body from reviewer allocations and line stats.
 *
 * @param { Allocation[] } allocations
 * @param { Set<string> } changedFiles
 * @param { LineStats } lineStats
 * @param { Map<string, LineStats> } lineStatsByTeam
 * @param { Allocation[] } [otherAllocations]
 * @param { string | null } [requiredSection]
 * @returns { string }
 */
export function buildComment(allocations, changedFiles, lineStats, lineStatsByTeam = new Map(), otherAllocations = [], requiredSection = null) {
	const body = [
		BOT_MARKER,
		buildOverviewTable(allocations, changedFiles, lineStats, lineStatsByTeam, otherAllocations),
	];

	if (requiredSection) {
		body.push('', requiredSection);
	}

	if (lineStats.sourceCodeAdded > SIZE_LIMIT) {
		body.push('', `❗ Source code additions (${lineStats.sourceCodeAdded.toLocaleString()}) exceed the ${SIZE_LIMIT.toLocaleString()}-line limit.`);
	}

	return body.join('\n');
}

/**
 * Fetch the member logins of every team that appears in OWNERS. Non-required
 * teams are included so the suggestion can tie-break on the author's teams.
 *
 * @param { import('./owners.mjs').OwnersEntry[] } entries
 * @returns { Promise<Map<string, Set<string>>> } team handle -> member logins
 */
async function fetchMembersByTeam(entries) {
	const membersByTeam = new Map();

	for (const team of new Set(entries.flatMap((entry) => entry.teams))) {
		membersByTeam.set(team, new Set(await listTeamMembers(teamHandleToSlug(team))));
	}

	return membersByTeam;
}

/**
 * @param { number } pullRequestNumber
 * @param { Map<string, string[]> } requiredTeamFiles
 * @param { import('./owners.mjs').OwnersEntry[] } entries
 * @returns { Promise<string | null> }
 */
async function buildRequiredSection(pullRequestNumber, requiredTeamFiles, entries) {
	if (requiredTeamFiles.size === 0) return null;

	// The suggestion is best-effort: without org member read access the
	// section still renders, just without a suggested reviewer.
	let suggestion = null;
	try {
		const author = (await getPullRequestById(pullRequestNumber)).user.login;
		const membersByTeam = await fetchMembersByTeam(entries);
		suggestion = suggestReviewer([...requiredTeamFiles.keys()], membersByTeam, author);
	} catch (error) {
		console.warn(`Could not compute a reviewer suggestion: ${error.message}`);
	}

	return buildRequiredReviewsSection(requiredTeamFiles, suggestion);
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

	const owners = parseOwnersFile();
	const ownerships = assignOwnership(changedFiles, owners);
	const allocations = ownershipsToAllocations(ownerships);
	const lineStatsByTeam = computeAllocationLineStats(allocations, ownerships, files);
	const sortedAllocations = allocations
		.toSorted((a, b) => {
			const lineChangeDiff =
				totalLineChanges(lineStatsByTeam.get(b.team) ?? createEmptyLineStats()) -
				totalLineChanges(lineStatsByTeam.get(a.team) ?? createEmptyLineStats());

			return lineChangeDiff || b.fileCount - a.fileCount;
		});
	const topAllocations = sortedAllocations.slice(0, 3);
	const otherAllocations = sortedAllocations.slice(3);

	const requiredTeamFiles = resolveRequiredTeams(changedFiles, owners);
	const requiredSection = await buildRequiredSection(pullRequestNumber, requiredTeamFiles, owners);

	const body = buildComment(topAllocations, changedFiles, lineStats, lineStatsByTeam, otherAllocations, requiredSection);

	await postOrUpdateComment(pullRequestNumber, body, BOT_MARKER);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const pullRequestNumber = parseInt(ensureEnvVar('PULL_REQUEST_NUMBER'));
	await run(pullRequestNumber);
}
