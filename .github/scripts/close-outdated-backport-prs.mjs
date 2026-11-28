// Closes open backport PRs into release-candidate branches older than the stable line.
// Patch releases come only from the stable and beta lines, so these PRs can never ship.

import {
	RELEASE_CANDIDATE_BRANCH_PREFIX,
	initGithub,
	listRemoteTagsWithCommits,
} from './github-helpers.mjs';
import { BACKPORT_TO_STABLE_LABEL } from './compute-backport-targets.mjs';

export const BACKPORT_PR_LABEL = 'automation:backport';

const BOT_MARKER = '<!-- close-outdated-backport-prs -->';

/**
 * @typedef {{ major: number, minor: number }} ReleaseLine
 */

/**
 * @param {string} version e.g. "2.49.8" or "n8n@2.49.8"
 * @returns {ReleaseLine | null}
 */
export function parseReleaseLine(version) {
	const match = /^(?:n8n@)?(\d+)\.(\d+)\.\d+$/.exec(version.trim());
	return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

/**
 * @param {string} branch e.g. "release-candidate/2.47.x"
 * @returns {ReleaseLine | null}
 */
export function parseReleaseCandidateBranch(branch) {
	if (!branch.startsWith(RELEASE_CANDIDATE_BRANCH_PREFIX)) return null;
	const match = /^(\d+)\.(\d+)\.x$/.exec(branch.slice(RELEASE_CANDIDATE_BRANCH_PREFIX.length));
	return match ? { major: Number(match[1]), minor: Number(match[2]) } : null;
}

/**
 * @param {ReleaseLine} line
 * @param {ReleaseLine} stable
 */
export function isOlderThan(line, stable) {
	return line.major < stable.major || (line.major === stable.major && line.minor < stable.minor);
}

/**
 * Finds the release line of the `n8n@x.y.z` tags on the commit of the `stable` tag.
 *
 * @param {Map<string, string>} tagToSha
 * @returns {ReleaseLine | null}
 */
export function resolveStableLine(tagToSha) {
	const stableSha = tagToSha.get('stable');
	if (!stableSha) return null;

	/** @type {ReleaseLine | null} */
	let highest = null;
	for (const [tag, sha] of tagToSha) {
		if (sha !== stableSha) continue;
		const line = parseReleaseLine(tag);
		if (line && tag.startsWith('n8n@') && (!highest || isOlderThan(highest, line))) {
			highest = line;
		}
	}
	return highest;
}

/**
 * The backport action names its head branches `backport-<original PR>-to-<target>`.
 *
 * @param {string} headRef
 * @returns {number | null}
 */
export function originalPrNumber(headRef) {
	const match = /^backport-(\d+)-to-/.exec(headRef);
	return match ? Number(match[1]) : null;
}

/**
 * @param {{ baseRef: string, headRef: string, stable: ReleaseLine }} params
 */
export function commentBody({ baseRef, headRef, stable }) {
	const original = originalPrNumber(headRef);
	const retry = original
		? `If the fix is still necessary, add the \`${BACKPORT_TO_STABLE_LABEL}\` label to #${original}.`
		: `If the fix is still necessary, backport it to \`${RELEASE_CANDIDATE_BRANCH_PREFIX}${stable.major}.${stable.minor}.x\`.`;

	return [
		BOT_MARKER,
		`This backport targets \`${baseRef}\`. The stable release line is now ${stable.major}.${stable.minor}. Patch releases come only from the stable and beta lines, so this PR cannot ship.`,
		'',
		retry,
	].join('\n');
}

/**
 * @param {{ stable: ReleaseLine, dryRun?: boolean }} params
 * @returns {Promise<number[]>} The numbers of the closed PRs.
 */
export async function closeOutdatedBackportPrs({ stable, dryRun = false }) {
	const { octokit, owner, repo } = initGithub();

	const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
		owner,
		repo,
		labels: BACKPORT_PR_LABEL,
		state: 'open',
		per_page: 100,
	});

	/** @type {number[]} */
	const closed = [];
	for (const issue of issues) {
		if (!issue.pull_request) continue;

		const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: issue.number });
		const line = parseReleaseCandidateBranch(pr.base.ref);
		if (!line || !isOlderThan(line, stable)) continue;

		console.log(`PR #${pr.number}: closing, base '${pr.base.ref}'${dryRun ? ' (dry-run)' : ''}`);
		closed.push(pr.number);
		if (dryRun) continue;

		await octokit.rest.issues.createComment({
			owner,
			repo,
			issue_number: pr.number,
			body: commentBody({ baseRef: pr.base.ref, headRef: pr.head.ref, stable }),
		});
		await octokit.rest.pulls.update({ owner, repo, pull_number: pr.number, state: 'closed' });
	}

	console.log(`${dryRun ? 'Would close' : 'Closed'} ${closed.length} outdated backport PR(s).`);
	return closed;
}

export async function main() {
	const stableVersion = process.env.STABLE_VERSION?.trim();
	const stable = stableVersion
		? parseReleaseLine(stableVersion)
		: resolveStableLine(listRemoteTagsWithCommits());
	if (!stable) {
		throw new Error(
			stableVersion
				? `STABLE_VERSION '${stableVersion}' is not a valid version`
				: 'Could not resolve the stable release line from the `stable` tag',
		);
	}

	console.log(`Stable release line: ${stable.major}.${stable.minor}`);
	const closed = await closeOutdatedBackportPrs({ stable, dryRun: process.env.DRY_RUN === 'true' });
	return closed.join(',');
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
