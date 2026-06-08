// Invoked from .github/workflows/ci-cla-check.yml via actions/github-script.
//
// Adds the `cla-signed` label when every contributor has signed, and
// removes it otherwise. Idempotent: re-runs safely without duplicating
// the label or erroring if it's already in the desired state. Creates
// the label on first use so the workflow is self-contained.

/**
 * @typedef { InstanceType<typeof import("@actions/github/lib/utils").GitHub> } GitHubInstance
 * @typedef { import("@actions/github/lib/context").Context } Context
 * @typedef { typeof import("@actions/core") } Core
 */

const LABEL_NAME = 'cla-signed';
const LABEL_COLOR = '0e8a16'; // GitHub's standard green
const LABEL_DESCRIPTION = 'All contributors on this PR have signed the CLA';

/**
 * @param {{ github: GitHubInstance, context: Context, core: Core }} params
 */
export default async function manageClaLabel({ github, context, core }) {
	const { owner, repo } = context.repo;
	const issue_number = Number(process.env.PR_NUMBER);
	const allSigned = process.env.ALL_SIGNED === 'true';

	if (allSigned) {
		// Make sure the label exists before trying to apply it — addLabels
		// errors if the label is missing from the repo.
		try {
			await github.rest.issues.getLabel({ owner, repo, name: LABEL_NAME });
		} catch (e) {
			if (errorStatus(e) === 404) {
				try {
					await github.rest.issues.createLabel({
						owner,
						repo,
						name: LABEL_NAME,
						color: LABEL_COLOR,
						description: LABEL_DESCRIPTION,
					});
				} catch (createErr) {
					// 422 = race with a parallel run that just created it. Fine.
					if (errorStatus(createErr) !== 422) throw createErr;
				}
			} else {
				throw e;
			}
		}

		await github.rest.issues.addLabels({
			owner,
			repo,
			issue_number,
			labels: [LABEL_NAME],
		});
		core.info(`Applied "${LABEL_NAME}" label to PR #${issue_number}`);
	} else {
		// 404 just means the label wasn't on the PR — nothing to undo.
		try {
			await github.rest.issues.removeLabel({
				owner,
				repo,
				issue_number,
				name: LABEL_NAME,
			});
			core.info(`Removed "${LABEL_NAME}" label from PR #${issue_number}`);
		} catch (e) {
			if (errorStatus(e) !== 404) throw e;
		}
	}
}

/**
 * Octokit's request errors carry an HTTP `status` field, but TypeScript
 * sees catch parameters as `unknown`. This guard narrows safely.
 * @param {unknown} e
 * @returns {number | undefined}
 */
function errorStatus(e) {
	return typeof e === 'object' && e !== null && 'status' in e && typeof e.status === 'number'
		? e.status
		: undefined;
}
