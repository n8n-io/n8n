/**
 * Fails a PR that grows the code-health baseline (`.code-health-baseline.json`) unless it carries
 * the explicit opt-in label.
 *
 * The baseline is a ratchet: `check baseline` + commit is the cheapest way to turn a red
 * `Static Analysis` check green, and the diff is a large JSON blob that is effectively invisible in
 * review. This gate makes growth a deliberate, labelled decision — the fix is the code change, not
 * recording a new exception. A full, shrinking regeneration is expected to add the label.
 *
 * Comparison is on `totalViolations` between the PR head (checked-out file) and the PR base branch
 * (fetched via the contents API), so it holds regardless of how the blob was edited.
 *
 * Exit codes:
 *   0 – baseline did not grow, or growth is opted into via the label
 *   1 – baseline grew without the opt-in label
 */

import fs from 'node:fs';
import path from 'node:path';
import { initGithub, getEventFromGithubEventPath, readPrLabels } from '../github-helpers.mjs';

export const BASELINE_PATH = '.code-health-baseline.json';
export const OPT_IN_LABEL = 'allow-baseline-growth';

/**
 * Parse the `totalViolations` count out of a baseline file's contents. Returns 0 for a missing or
 * unparseable file, so a first-time baseline or a base branch without one is treated as "no
 * violations recorded yet" rather than blocking.
 *
 * @param {string | null | undefined} contents
 * @returns {number}
 */
export function parseTotalViolations(contents) {
	if (!contents) return 0;
	try {
		const parsed = JSON.parse(contents);
		return typeof parsed.totalViolations === 'number' ? parsed.totalViolations : 0;
	} catch {
		return 0;
	}
}

/**
 * @param {{ baseTotal: number, headTotal: number, hasOptInLabel: boolean }} args
 * @returns {boolean} whether the check should fail
 */
export function shouldFail({ baseTotal, headTotal, hasOptInLabel }) {
	return headTotal > baseTotal && !hasOptInLabel;
}

/**
 * @param {import('@actions/github/lib/utils').GitHub} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {string} ref
 * @returns {Promise<string | null>} file contents, or null if it does not exist at that ref
 */
async function getBaselineAtRef(octokit, owner, repo, ref) {
	try {
		const { data } = await octokit.rest.repos.getContent({
			owner,
			repo,
			path: BASELINE_PATH,
			ref,
		});
		if (Array.isArray(data) || data.type !== 'file' || !data.content) return null;
		return Buffer.from(data.content, 'base64').toString('utf8');
	} catch (ex) {
		if (ex?.status === 404) return null;
		throw ex;
	}
}

async function main() {
	const event = getEventFromGithubEventPath();
	const pr = event.pull_request;
	const { octokit, owner, repo } = initGithub();

	const headFile = path.resolve(process.cwd(), BASELINE_PATH);
	const headTotal = parseTotalViolations(
		fs.existsSync(headFile) ? fs.readFileSync(headFile, 'utf8') : null,
	);

	const baseTotal = parseTotalViolations(await getBaselineAtRef(octokit, owner, repo, pr.base.sha));

	const hasOptInLabel = readPrLabels(pr).includes(OPT_IN_LABEL);

	if (shouldFail({ baseTotal, headTotal, hasOptInLabel })) {
		console.log(
			`::error::${BASELINE_PATH} grew from ${baseTotal} to ${headTotal} violations. ` +
				`The baseline is a ratchet — fix the violation instead of recording it. ` +
				`If the growth is genuinely intended (e.g. a full regeneration), a maintainer can add the ` +
				`\`${OPT_IN_LABEL}\` label.`,
		);
		process.exit(1);
	}

	if (headTotal < baseTotal) {
		console.log(`Baseline shrank from ${baseTotal} to ${headTotal} violations. 🎉`);
	} else if (headTotal > baseTotal) {
		console.log(
			`Baseline grew from ${baseTotal} to ${headTotal} violations, allowed by the \`${OPT_IN_LABEL}\` label.`,
		);
	} else {
		console.log(`Baseline unchanged at ${headTotal} violations.`);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
