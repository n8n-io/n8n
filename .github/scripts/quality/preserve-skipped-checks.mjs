import { getEventFromGithubEventPath, initGithub } from '../github-helpers.mjs';

export const GATED_CHECK_NAMES = [
	'Detect Changes',
	'PR Size Limit',
	'Static Analysis',
	'Unused Dependencies',
];

const GITHUB_ACTIONS_APP_ID = 15368;
const PASSING_CONCLUSIONS = new Set(['success', 'neutral']);

/**
 * @param {{ app?: { id?: number, slug?: string } | null }} checkRun
 */
function isGitHubActionsRun(checkRun) {
	return checkRun.app?.slug === 'github-actions' || checkRun.app?.id === GITHUB_ACTIONS_APP_ID;
}

/**
 * @param {{ id?: number, completed_at?: string | null }} a
 * @param {{ id?: number, completed_at?: string | null }} b
 */
function compareRunsNewestFirst(a, b) {
	const aTime = Date.parse(a.completed_at ?? '') || 0;
	const bTime = Date.parse(b.completed_at ?? '') || 0;
	return bTime - aTime || (b.id ?? 0) - (a.id ?? 0);
}

/**
 * Return the newest completed, non-skipped GitHub Actions run for a check.
 *
 * @param {Array<{
 *   id?: number,
 *   status?: string,
 *   conclusion?: string | null,
 *   completed_at?: string | null,
 *   app?: { id?: number, slug?: string } | null,
 * }>} checkRuns
 */
export function selectLatestExecutedRun(checkRuns) {
	const executed = checkRuns.filter(
		(run) =>
			isGitHubActionsRun(run) &&
			run.status === 'completed' &&
			run.conclusion != null &&
			run.conclusion !== 'skipped',
	);
	executed.sort(compareRunsNewestFirst);
	return executed[0] ?? null;
}

/**
 * List all check runs for a check name on a commit SHA.
 *
 * @param {{
 *   octokit: import('../github-helpers.mjs').GitHubInstance,
 *   owner: string,
 *   repo: string,
 *   headSha: string,
 *   checkName: string,
 * }} params
 */
export async function listCheckRuns({ octokit, owner, repo, headSha, checkName }) {
	return await octokit.paginate(octokit.rest.checks.listForRef, {
		owner,
		repo,
		ref: headSha,
		check_name: checkName,
		filter: 'all',
		per_page: 100,
	});
}

/**
 * Fail when any skipped quality check already failed on the PR head commit.
 *
 * @param {{
 *   octokit: import('../github-helpers.mjs').GitHubInstance,
 *   owner: string,
 *   repo: string,
 *   headSha: string,
 *   checkNames?: string[],
 * }} params
 */
export async function run({ octokit, owner, repo, headSha, checkNames = GATED_CHECK_NAMES }) {
	const results = await Promise.all(
		checkNames.map(async (checkName) => {
			const runs = await listCheckRuns({ octokit, owner, repo, headSha, checkName });
			return { checkName, latest: selectLatestExecutedRun(runs) };
		}),
	);

	const failures = results.filter(
		({ latest }) => latest !== null && !PASSING_CONCLUSIONS.has(latest.conclusion),
	);

	if (failures.length > 0) {
		const summary = failures
			.map(({ checkName, latest }) => `${checkName}: ${latest.conclusion}`)
			.join(', ');
		throw new Error(
			`Cannot pass Required PR Quality Checks on an unrelated label event because earlier check(s) on ${headSha} did not pass (${summary}).`,
		);
	}

	for (const { checkName, latest } of results) {
		console.log(`  ${checkName}: ${latest ? latest.conclusion : 'no prior completed run'}`);
	}
}

export async function main() {
	const event = getEventFromGithubEventPath();
	const headSha = event.pull_request?.head?.sha;
	if (!headSha) {
		throw new Error('Missing pull_request.head.sha in GitHub event payload.');
	}

	const { octokit, owner, repo } = initGithub();
	await run({ octokit, owner, repo, headSha });
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
