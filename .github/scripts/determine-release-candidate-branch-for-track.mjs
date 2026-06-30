import {
	ensureEnvVar,
	listCommitsBetweenRefs,
	resolveRcBranchForTrack,
	resolveReleaseTagForTrack,
	writeGithubOutput,
} from './github-helpers.mjs';

function main() {
	const track = /** @type { import('./github-helpers.mjs').ReleaseTrack } */ (
		ensureEnvVar('TRACK')
	);

	const currentTag = resolveReleaseTagForTrack(track);

	const releaseCandidateBranch = resolveRcBranchForTrack(track);

	if (!currentTag?.tag || !releaseCandidateBranch) {
		throw new Error(
			`Couldn't resolve needed parameters. currentTag.tag=${currentTag?.tag}, releaseCandidateBranch=${releaseCandidateBranch}`,
		);
	}

	console.log(`Commits between ${releaseCandidateBranch} and ${currentTag.tag}:`);
	console.log(listCommitsBetweenRefs(releaseCandidateBranch, currentTag.tag));

	const commitList = listCommitsBetweenRefs(releaseCandidateBranch, currentTag.tag)
		.split('\n')
		.filter((commit) => commit.trim().length > 0);
	const actionableCommitList = filterActionableCommits(commitList);

	// `force` lets a dispatch create the PR even without actionable commits,
	// but never when there are literally no commits between versions.
	const force = process.env.FORCE === 'true';
	const shouldCreatePr = commitList.length > 0 && (actionableCommitList.length > 0 || force);

	const output = {
		release_candidate_branch: releaseCandidateBranch,
		should_create_pr: shouldCreatePr ? 'true' : 'false',
	};

	console.log(output);

	writeGithubOutput(output);
}

/**
 * @param { string[] } commitList
 * */
export function filterActionableCommits(commitList) {
	return commitList.filter((commit) => !commit.trimStart().startsWith('ci:'));
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
