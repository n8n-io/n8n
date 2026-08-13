// Invoked from .github/workflows/ci-cla-check.yml via actions/github-script.
//
// Translates the buckets emitted by check-signatures.mjs into a single
// commit status on the head SHA. The status `context` name is what a
// repository ruleset gates on; description and target_url are best-effort
// human signals.
//
// State mapping:
//   - success: every contributor is signed and every commit author is linked
//   - error  : only failures were API lookup errors (transient)
//   - failure: at least one contributor is verified unsigned, or commits
//              have author emails not linked to a GitHub account

/**
 * @typedef { InstanceType<typeof import("@actions/github/lib/utils").GitHub> } GitHubInstance
 * @typedef { import("@actions/github/lib/context").Context } Context
 * @typedef { typeof import("@actions/core") } Core
 */

/**
 * @param {{ github: GitHubInstance, context: Context, core: Core }} params
 */
export default async function postFinalClaStatus({ github, context }) {
	const allSigned = process.env.ALL_SIGNED === 'true';
	const unsigned = (process.env.UNSIGNED ?? '').split(',').filter(Boolean);
	const errored = (process.env.ERRORED ?? '').split(',').filter(Boolean);
	const unlinked = JSON.parse(process.env.UNLINKED || '[]');

	/** @type {'success' | 'failure' | 'error' | 'pending'} */
	let state;
	let description;
	if (allSigned) {
		state = 'success';
		description = 'All contributors have signed the CLA';
	} else if (errored.length > 0 && unsigned.length === 0 && unlinked.length === 0) {
		state = 'error';
		description = `Could not verify: ${errored.join(', ')}`;
	} else {
		state = 'failure';
		const parts = [];
		if (unsigned.length > 0) parts.push(`unsigned: ${unsigned.join(', ')}`);
		if (errored.length > 0) parts.push(`errored: ${errored.join(', ')}`);
		if (unlinked.length > 0) parts.push(`${unlinked.length} unlinked commit(s)`);
		description = parts.join(' | ');
	}

	// GitHub commit status description is capped at 140 chars.
	if (description.length > 140) {
		description = description.slice(0, 137) + '…';
	}

	const prNumber = process.env.PR_NUMBER;
	const target_url = prNumber
		? `${context.payload.repository?.html_url}/pull/${prNumber}`
		: process.env.CLA_SIGN_URL;

	await github.rest.repos.createCommitStatus({
		owner: context.repo.owner,
		repo: context.repo.repo,
		sha: /** @type {string} */ (process.env.HEAD_SHA),
		state,
		context: /** @type {string} */ (process.env.STATUS_CONTEXT),
		description,
		target_url,
	});
}
