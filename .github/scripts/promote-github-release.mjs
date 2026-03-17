import {
	ensureEnvVar,
	getExistingRelease,
	initGithub,
	writeGithubOutput,
} from './github-helpers.mjs';

/**
 * Promotes a GitHub release to latest
 *
 * Required env variables:
 *	- RELEASE_TAG	 - Release tag on git e.g. n8n@2.13.0
 *
 * GitHub variables
 *	- GITHUB_TOKEN	-	 Used to authenticate to octokit - Can be overwritten for privileged access
 *	- GITHUB_REPOSITORY	-	 Used to determine target repository
 * */
async function promoteGitHubRelease() {
	const RELEASE_TAG = ensureEnvVar('RELEASE_TAG');
	const { octokit, owner, repo } = initGithub();

	const existingRelease = await getExistingRelease(RELEASE_TAG);
	if (!existingRelease) {
		console.warn("Couldn't find release by tag. Exiting...");
		process.exit(1);
	}

	const releaseResponse = await octokit.rest.repos.updateRelease({
		owner,
		repo,
		release_id: existingRelease.id,
		make_latest: 'true',
	});

	console.log(`Successfully updated release ${releaseResponse.data.html_url}`);

	writeGithubOutput({
		release_url: releaseResponse.data.html_url,
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	promoteGitHubRelease();
}
