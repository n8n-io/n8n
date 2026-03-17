import semver from 'semver';
import {
	getCommitForRef,
	localRefExists,
	RELEASE_CANDIDATE_BRANCH_PREFIX,
	remoteBranchExists,
	resolveReleaseTagForTrack,
	sh,
	tagVersionInfoToReleaseCandidateBranchName,
	writeGithubOutput,
} from './github-helpers.mjs';

/**
 * @typedef BranchChanges
 * @property { import('./github-helpers.mjs').TagVersionInfo[] } branchesToEnsure TagVersionInfo for branches the system needs to make sure exist
 * @property { string[] } branchesToDeprecate Branches the system needs to remove as deprecated
 * */

/**
 * Look into git tags and determine which release candidate branches need to
 * exist and which need to be deprecated and removed.
 *
 * @returns { BranchChanges }
 * */
export function determineBranchChanges() {
	const branchesToDeprecate = [];

	const currentBetaVersion = resolveReleaseTagForTrack('beta');
	const currentStableVersion = resolveReleaseTagForTrack('stable');

	if (!currentBetaVersion || !currentStableVersion) {
		throw new Error(
			`Could not find current stable and/or beta tags. Beta: ${currentBetaVersion?.tag ?? 'not found'}, Stable: ${currentStableVersion?.tag ?? 'not found'}`,
		);
	}

	const branchesToEnsure = [currentBetaVersion, currentStableVersion];

	const stableVersion = currentStableVersion.version;
	// Deprecated branch is the current stable minus 2 versions. e.g. stable: 2.9.x, deprecated is 2.7.x
	const deprecatedMinorVersion = semver.minor(stableVersion) - 2;

	if (deprecatedMinorVersion >= 0) {
		const deprecatedBranch = `${RELEASE_CANDIDATE_BRANCH_PREFIX}${semver.major(stableVersion)}.${deprecatedMinorVersion}.x`;
		branchesToDeprecate.push(deprecatedBranch);
	}

	return {
		branchesToEnsure,
		branchesToDeprecate,
	};
}

/**
 * @param {import("./github-helpers.mjs").TagVersionInfo} tagInfo
 */
function ensureBranch(tagInfo) {
	const branch = tagVersionInfoToReleaseCandidateBranchName(tagInfo);

	if (remoteBranchExists(branch)) {
		console.log(`Branch ${branch} already exists on origin. Skipping.`);
		return branch;
	}

	const commitRef = getCommitForRef(tagInfo.tag);

	console.log(`Creating branch ${branch} from ${tagInfo.tag} (${commitRef})`);
	// Create local branch (force safe: it shouldn't exist, but keep it robust)
	if (localRefExists(`refs/heads/${branch}`)) {
		sh('git', ['branch', '-f', branch, commitRef]);
	} else {
		sh('git', ['switch', '-c', branch, commitRef]);
	}

	sh('git', ['push', 'origin', branch]);

	return branch;
}

/**
 * @param {string} branch
 */
function removeBranch(branch) {
	if (!remoteBranchExists(branch)) {
		console.log(`Couldn't find branch ${branch}. Skipping removal.`);
		return null;
	}

	console.log(`Removing remote branch ${branch} from origin...`);
	// Delete remote branch
	sh('git', ['push', 'origin', '--delete', branch]);

	// Optional local cleanup (keeps reruns tidy)
	if (localRefExists(`refs/heads/${branch}`)) {
		console.log(`Removing local branch ${branch}...`);
		sh('git', ['branch', '-D', branch]);
	}

	return branch;
}

function main() {
	const branchChanges = determineBranchChanges();

	console.log('💡 Determined branch changes');
	console.log('');
	console.log(
		`		Branches to ensure: ${branchChanges.branchesToEnsure.map(tagVersionInfoToReleaseCandidateBranchName).join(', ')}`,
	);
	console.log(`		Branches to deprecate: ${branchChanges.branchesToDeprecate.join(', ')}`);
	console.log('');
	console.log('Preparing to apply changes...');

	let ensuredBranches = [];
	for (const tagInfo of branchChanges.branchesToEnsure) {
		const branch = ensureBranch(tagInfo);
		ensuredBranches.push(branch);
	}

	console.log('');
	console.log('Starting deprecation of branches...');

	let removedBranches = [];
	for (const branch of branchChanges.branchesToDeprecate) {
		const removedBranch = removeBranch(branch);
		if (removedBranch) {
			removedBranches.push(removedBranch);
		}
	}

	console.log('Done!');

	writeGithubOutput({
		ensuredBranches: ensuredBranches.join(','),
		removedBranches: removedBranches.join(','),
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
