import {
	countCommitsBetweenRefs,
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

	const commitCount = countCommitsBetweenRefs(releaseCandidateBranch, currentTag.tag);

	writeGithubOutput({
		release_candidate_branch: releaseCandidateBranch,
		should_update: commitCount > 0 ? 'true' : 'false',
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	main();
}
