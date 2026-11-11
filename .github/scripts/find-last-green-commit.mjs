/**
 * Finds the newest commit of the current PR, other than its head, that has a
 * successful run of the current workflow. ci-filter can then test only the
 * changes after that commit.
 *
 * Returns an empty string when there is no such commit, when the PR has the
 * FULL_CI_LABEL label, or when the lookup fails. The caller then tests the whole PR.
 */
import {
	ensureEnvVar,
	getEventFromGithubEventPath,
	getPullRequestById,
	initGithub,
	readPrLabels,
} from './github-helpers.mjs';

export const FULL_CI_LABEL = 'force-full-ci';

/**
 * @param {string[]} prCommits SHAs of the PR commits, oldest first.
 * @param {Array<{ head_sha: string, head_repository?: { full_name?: string } | null }>} successfulRuns
 * @param {string} headSha
 * @param {string} headRepo Full name of the repository that holds the PR branch.
 */
export function pickLastGreenCommit(prCommits, successfulRuns, headSha, headRepo) {
	// A fork can use the same branch name as another fork.
	const green = new Set(
		successfulRuns
			.filter((run) => run.head_repository?.full_name === headRepo)
			.map((run) => run.head_sha),
	);
	for (let i = prCommits.length - 1; i >= 0; i--) {
		if (prCommits[i] !== headSha && green.has(prCommits[i])) return prCommits[i];
	}
	return '';
}

/** @param {string} workflowRef Value of GITHUB_WORKFLOW_REF. */
export function workflowFileFromRef(workflowRef) {
	const match = workflowRef.match(/\.github\/workflows\/([^/@]+)@/);
	if (!match) throw new Error(`Cannot read the workflow file from "${workflowRef}"`);
	return match[1];
}

export async function main() {
	try {
		const pr = getEventFromGithubEventPath().pull_request;
		// Read the labels from the API: a re-run reuses the labels of the original event.
		if (readPrLabels(await getPullRequestById(pr.number)).includes(FULL_CI_LABEL)) {
			console.log(`The PR has the ${FULL_CI_LABEL} label`);
			return '';
		}
		const workflow = workflowFileFromRef(ensureEnvVar('GITHUB_WORKFLOW_REF'));
		const { octokit, owner, repo } = initGithub();

		const commits = await octokit.paginate(octokit.rest.pulls.listCommits, {
			owner,
			repo,
			pull_number: pr.number,
			per_page: 100,
		});
		const { data } = await octokit.rest.actions.listWorkflowRuns({
			owner,
			repo,
			workflow_id: workflow,
			event: 'pull_request',
			branch: pr.head.ref,
			status: 'success',
			per_page: 100,
		});

		const sha = pickLastGreenCommit(
			commits.map((commit) => commit.sha),
			data.workflow_runs,
			pr.head.sha,
			pr.head.repo.full_name,
		);
		console.log(sha ? `Last green commit: ${sha}` : 'No earlier commit of this PR passed CI');
		return sha;
	} catch (error) {
		console.log(
			`::warning::Cannot find the last green commit. CI tests the whole PR: ${error instanceof Error ? error.message : String(error)}`,
		);
		return '';
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	console.log(await main());
}
