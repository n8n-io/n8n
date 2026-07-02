// On a minor release, reconcile backport labels across all PRs that carry them.
//
// A minor release promotes the current beta to stable, so:
//   - `Backport to Stable` is cleared (that line moves forward with this release)
//   - a PR marked `Backport to Beta` now needs `Backport to Stable` instead
//   - if that beta change is already in this minor's branch cut, `Backport to
//     Beta` is dropped too (nothing left to backport)
//
// Runs from release-publish.yml when the minor release PR is merged.

import { ensureEnvVar, initGithub, addLabel, removeLabel } from './github-helpers.mjs';

export const STABLE_LABEL = 'Backport to Stable';
export const BETA_LABEL = 'Backport to Beta';

const BOT_MARKER = '<!-- promote-backport-labels-on-minor -->';

/**
 * Pure closed-form of the reconciliation rules. Given a PR's current labels and
 * whether its change already landed in this minor's branch cut, return the
 * desired end state. Keeping this pure makes it unit-testable without GitHub.
 *
 * @param {{ hadStable: boolean, hadBeta: boolean, includedInRelease: boolean }} input
 * @returns {{ wantStable: boolean, wantBeta: boolean }}
 */
export function computeDesiredLabels({ hadStable, hadBeta, includedInRelease }) {
	// remove stable → if beta, add stable back → so stable ends present iff beta.
	const wantStable = hadBeta;
	// beta stays unless it already shipped in this minor.
	const wantBeta = hadBeta && !includedInRelease;
	return { wantStable, wantBeta };
}

/**
 * True if the PR's merge commit is reachable from the release cut (i.e. the
 * change is already part of this minor release). Uses the compare API so no
 * local git history is required.
 *
 * @param {import('@actions/github/lib/utils').GitHub} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {string} releaseRef ref (tag/sha) the minor release was cut at
 * @param {string | null} mergeSha PR's merge commit
 */
async function isIncludedInRelease(octokit, owner, repo, releaseRef, mergeSha) {
	if (!mergeSha) return false; // not merged yet → nothing shipped

	const { data } = await octokit.rest.repos.compareCommitsWithBasehead({
		owner,
		repo,
		basehead: `${releaseRef}...${mergeSha}`,
	});

	// base=releaseRef, head=mergeSha. "behind"/"identical" ⇒ mergeSha is an
	// ancestor of the release cut ⇒ change is in the cut.
	return data.status === 'behind' || data.status === 'identical';
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
	const releaseRef = ensureEnvVar('RELEASE_REF');
	const version = ensureEnvVar('RELEASE_VERSION');
	const dryRun = process.env.DRY_RUN === 'true';

	const { octokit, owner, repo } = initGithub();

	// Union of PRs carrying either label (issues.listForRepo requires ALL labels,
	// so query each label and merge).
	/** @type {Map<number, Set<string>>} */
	const prLabels = new Map();
	for (const label of [STABLE_LABEL, BETA_LABEL]) {
		const issues = await octokit.paginate(octokit.rest.issues.listForRepo, {
			owner,
			repo,
			labels: label,
			state: 'all',
			per_page: 100,
		});
		for (const issue of issues) {
			if (!issue.pull_request) continue; // labels can also land on plain issues
			const names = new Set((issue.labels ?? []).map((l) => (typeof l === 'string' ? l : l.name)));
			prLabels.set(issue.number, names);
		}
	}

	console.log(`Found ${prLabels.size} PR(s) with backport labels.`);

	for (const [number, labels] of prLabels) {
		const hadStable = labels.has(STABLE_LABEL);
		const hadBeta = labels.has(BETA_LABEL);

		// Only resolve ancestry when it can affect the outcome (beta PRs).
		let includedInRelease = false;
		if (hadBeta) {
			const { data: pr } = await octokit.rest.pulls.get({ owner, repo, pull_number: number });
			includedInRelease = await isIncludedInRelease(
				octokit,
				owner,
				repo,
				releaseRef,
				pr.merge_commit_sha,
			);
		}

		const { wantStable, wantBeta } = computeDesiredLabels({ hadStable, hadBeta, includedInRelease });

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
		if (hadBeta && !wantBeta) {
			ops.push(() => removeLabel(number, BETA_LABEL));
			reasons.push(`Removed \`${BETA_LABEL}\` — already included in the ${version} minor release.`);
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
