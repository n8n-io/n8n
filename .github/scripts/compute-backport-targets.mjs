// Creates backport PR's according to labels on merged PR

import { readPrLabels, resolveRcBranchForTrack, writeGithubOutput } from './github-helpers.mjs';

/** @type { Record<string, import('./github-helpers.mjs').ReleaseTrack> } */
const BACKPORT_BY_TAG_MAP = {
	'Backport to Beta': 'beta',
	'Backport to Stable': 'stable',
};

const BACKPORT_BY_BRANCH_MAP = {
	'Backport to v1': '1.x',
};

/**
 * @param {Set<string>} labels
 *
 * @returns { Set<string> }
 */
export function labelsToReleaseCandidateBranches(labels) {
	const targets = new Set();

	// Backport by tag map includes mapping of label to git tag to resolve
	for (const [label, tag] of Object.entries(BACKPORT_BY_TAG_MAP)) {
		// Check if backport label is present
		if (!labels.has(label)) {
			continue;
		}

		const branch = resolveRcBranchForTrack(tag);
		// Make sure our backport branch exists
		if (!branch) {
			continue;
		}

		targets.add(branch);
	}

	// Backport by branch map includes mapping of label to git branch. This is used for
	// older versions of n8n. v1, etc.
	for (const [label, branch] of Object.entries(BACKPORT_BY_BRANCH_MAP)) {
		// Check if backport label is present
		if (!labels.has(label)) {
			continue;
		}

		targets.add(branch);
	}

	return targets;
}

async function main() {
	const labels = new Set(readPrLabels());
	if (!labels || labels.size === 0) {
		console.log('No labels on PR. Exiting...');
		return;
	}

	const backportBranches = labelsToReleaseCandidateBranches(labels);

	if (backportBranches.size === 0) {
		console.log('No backports needed. Exiting...');
		return;
	}

	const target_branches = [...backportBranches].join(' '); // korthout/backport-action@v4 uses space-delimited branch list
	writeGithubOutput({ target_branches });
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	await main();
}
