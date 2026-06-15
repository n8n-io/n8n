import fs from 'node:fs/promises';
import { getOctokit } from '@actions/github';
import { ensureEnvVar, readPrLabels } from './github-helpers.mjs';

/**
 * @typedef {PullRequestCheckPass | PullRequestCheckFail} PullRequestCheckResult
 **/

/**
 * @typedef PullRequestCheckPass
 * @property {true} pass
 * @property {string} baseRef
 * */

/**
 * @typedef PullRequestCheckFail
 * @property {false} pass
 * @property {string} reason
 * */

/**
 * @param {PullRequestCheckResult} pullRequestCheck
 *
 * @returns { pullRequestCheck is PullRequestCheckFail }
 * */
function pullRequestCheckFailed(pullRequestCheck) {
	return !pullRequestCheck.pass;
}

/**
 * @param {any} pullRequest
 * @returns {PullRequestCheckResult}
 */
export function pullRequestIsDismissedRelease(pullRequest) {
	if (!pullRequest) {
		throw new Error('Missing pullRequest in event payload');
	}

	const baseRef = pullRequest?.base?.ref ?? '';
	const headRef = pullRequest?.head?.ref ?? '';
	const merged = Boolean(pullRequest?.merged);

	if (merged) {
		return { pass: false, reason: 'PR was merged' };
	}

	// Must match your release PR pattern:
	//   base: release/<ver>
	//   head: release-pr/<ver>
	if (!baseRef.startsWith('release/')) {
		return { pass: false, reason: `Base ref '${baseRef}' is not release/*` };
	}
	if (!headRef.startsWith('release-pr/')) {
		return { pass: false, reason: `Head ref '${headRef}' is not release-pr/*` };
	}

	const baseVer = baseRef.slice('release/'.length);
	const headVer = headRef.slice('release-pr/'.length);

	if (!baseVer || baseVer !== headVer) {
		return { pass: false, reason: `Version mismatch: base='${baseVer}' head='${headVer}'` };
	}

	const labelNames = readPrLabels(pullRequest);
	if (!labelNames.includes('release')) {
		return {
			pass: false,
			reason: `Missing required label 'release' (labels: ${labelNames.join(', ') || '[none]'})`,
		};
	}

	return { pass: true, baseRef };
}

async function main() {
	const token = ensureEnvVar('GITHUB_TOKEN');
	const eventPath = ensureEnvVar('GITHUB_EVENT_PATH');
	const repoFullName = ensureEnvVar('GITHUB_REPOSITORY');

	const [owner, repo] = repoFullName.split('/');
	if (!owner || !repo) {
		throw new Error(`Invalid GITHUB_REPOSITORY: '${repoFullName}'`);
	}

	const rawEventData = await fs.readFile(eventPath, 'utf8');
	const event = JSON.parse(rawEventData);

	const result = pullRequestIsDismissedRelease(event.pull_request);
	if (pullRequestCheckFailed(result)) {
		console.log(`no-op: ${result.reason}`);
		return;
	}

	const branch = result.baseRef; // e.g. "release/2.11.0"
	console.log(`PR qualifies. Deleting branch '${branch}'...`);

	const octokit = getOctokit(token);

	try {
		await octokit.rest.git.deleteRef({
			owner,
			repo,
			// ref must be "heads/<branch>"
			ref: `heads/${branch}`,
		});
		console.log(`Deleted '${branch}'.`);
	} catch (err) {
		// If it was already deleted, treat as success.
		const status = err?.status;
		if (status === 404) {
			console.log(`Branch '${branch}' not found (already deleted).`);
			return;
		}

		console.error(err);
		throw new Error(`Failed to delete '${branch}'.`);
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
