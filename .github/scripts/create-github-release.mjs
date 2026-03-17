import {
	deleteRelease,
	ensureEnvVar,
	getExistingRelease,
	initGithub,
	isReleaseTrack,
	writeGithubOutput,
} from './github-helpers.mjs';

/**
 * Creates release in GitHub.
 *
 * Required env variables:
 *	- RELEASE_TAG	 - Release tag on git e.g. n8n@2.13.0
 *	- BODY - Body of the release. Contains release notes etc.
 *	- IS_PRE_RELEASE - If releasing in pre-release. Currently only for beta track.
 *	- MAKE_LATEST - If released version should be marked as latest on GitHub
 *	- COMMIT	- Commitish for release to point to
 *
 * Optional env variables:
 *	- ADDITIONAL_TAGS	-	Comma-separated list of additional tags to release under e.g. beta
 *
 * GitHub variables
 *	- GITHUB_TOKEN	-	 Used to authenticate to octokit - Can be overwritten for privileged access
 *	- GITHUB_REPOSITORY	-	 Used to determine target repository
 * */
async function createGitHubRelease() {
	const RELEASE_TAG = ensureEnvVar('RELEASE_TAG');
	const ADDITIONAL_TAGS = process.env.ADDITIONAL_TAGS ?? '';
	const BODY = ensureEnvVar('BODY');
	const IS_PRE_RELEASE = ensureEnvVar('IS_PRE_RELEASE');
	const MAKE_LATEST = ensureEnvVar('MAKE_LATEST');
	const COMMIT = ensureEnvVar('COMMIT');

	const { octokit, owner, repo } = initGithub();

	const allTags = [
		RELEASE_TAG,
		...ADDITIONAL_TAGS.split(',')
			.map((t) => t.trim())
			.filter(Boolean),
	];
	const releases = [];

	for (const tag of allTags) {
		const existingRelease = await getExistingRelease(tag);
		const isReleaseTrackTag = isReleaseTrack(tag);

		// If we have an existing track release, we want to
		// delete the old release before pushing a new one.
		if (isReleaseTrackTag && existingRelease) {
			await deleteRelease(existingRelease.id);
		}

		const releaseResponse = await octokit.rest.repos.createRelease({
			tag_name: tag,
			name: tag,
			body: BODY,
			draft: false,
			prerelease: IS_PRE_RELEASE === 'true',
			make_latest: MAKE_LATEST === 'true' ? 'true' : 'false',
			target_commitish: COMMIT,
			owner,
			repo,
		});

		const release = releaseResponse.data;
		releases.push(release);

		console.log(`Successfully created release ${release.html_url}`);
	}

	writeGithubOutput({
		release_urls: releases.map((release) => release.html_url).join(', '),
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	createGitHubRelease();
}
