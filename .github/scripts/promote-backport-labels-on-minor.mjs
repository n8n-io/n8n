// On a minor release, reconcile backport labels across open PRs that carry them.
//
// A minor release promotes the current beta to stable, so:
//   - `Backport to Stable` is cleared (that line moves forward with this release)
//   - a PR marked `Backport to Beta` now needs `Backport to Stable` instead
//     (the beta line it targeted is now stable)
//
// Only open PRs are touched — they haven't shipped in this release yet, so
// `Backport to Beta` is left in place.
//
// Runs from release-publish-post-release.yml on a minor release.

import { ensureEnvVar, initGithub, addLabel, removeLabel } from './github-helpers.mjs';

export const STABLE_LABEL = 'Backport to Stable';
export const BETA_LABEL = 'Backport to Beta';

const BOT_MARKER = '<!-- promote-backport-labels-on-minor -->';

/**
 * Pure closed-form of the reconciliation rule for open PRs: a PR should carry
 * `Backport to Stable` iff it carried `Backport to Beta` (remove stable, then
 * re-add it for beta PRs). `Backport to Beta` is never modified.
 *
 * @param {{ hadBeta: boolean }} input
 * @returns {{ wantStable: boolean }}
 */
export function computeDesiredLabels({ hadBeta }) {
	return { wantStable: hadBeta };
}

/** @param {string[]} reasons */
function commentBody(version, reasons) {
	return [
		BOT_MARKER,
		`Backport labels updated for the **${version}** minor release:`,
		'',
		...reasons.map((r) => `- ${r}`),
	].join('\n');
}

async function main() {
	const version = ensureEnvVar('RELEASE_VERSION');
	const dryRun = process.env.DRY_RUN === 'true';

	const { octokit, owner, repo } = initGithub();

	// Union of open PRs carrying either label (issues.listForRepo requires ALL
	// labels, so query each label and merge).
	/** @type {Map<number, Set<string>>} */
	const prLabels = new Map();
	for (const label of [STABLE_LABEL, BETA_LABEL]) {
		const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
			owner,
			repo,
			labels: label,
			state: 'open',
			per_page: 100,
		});
		for (const issue of issues) {
			if (!issue.pull_request) continue; // labels can also land on plain issues
			const names = new Set((issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)));
			prLabels.set(issue.number, names);
		}
	}

	console.log(`Found ${prLabels.size} open PR(s) with backport labels.`);

	for (const [number, labels] of prLabels) {
		const hadStable = labels.has(STABLE_LABEL);
		const hadBeta = labels.has(BETA_LABEL);

		const { wantStable } = computeDesiredLabels({ hadBeta });

		/** @type {string[]} */
		const reasons = [];
		const ops = [];

		if (hadStable && !wantStable) {
			ops.push(() => removeLabel(number, STABLE_LABEL));
			reasons.push(`Removed \`${STABLE_LABEL}\` — cleared on every minor release.`);
		}
		if (!hadStable && wantStable) {
			ops.push(() => addLabel(number, STABLE_LABEL));
			reasons.push(`Added \`${STABLE_LABEL}\` — promoted from \`${BETA_LABEL}\` (beta is now stable).`);
		}

		if (ops.length === 0) continue;

		console.log(`PR #${number}: ${reasons.join(' ')}${dryRun ? ' (dry-run)' : ''}`);
		if (dryRun) continue;

		for (const op of ops) await op();
		await octokit.rest.issues.createComment({
			owner,
			repo,
			issue_number: number,
			body: commentBody(version, reasons),
		});
	}
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
