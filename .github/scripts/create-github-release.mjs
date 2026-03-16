import { ensureEnvVar, initGithub, isReleaseTrack, writeGithubOutput } from './github-helpers.mjs';

async function createGitHubRelease() {
	const RELEASE_TAG = ensureEnvVar('RELEASE_TAG');
	const ADDITIONAL_TAGS = process.env.ADDITIONAL_TAGS ?? '';
	const BODY = ensureEnvVar('BODY');
	const IS_PRE_RELEASE = ensureEnvVar('IS_PRE_RELEASE');
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
		const existingRelease = await getExistingRelease(octokit, owner, repo, tag);
		const isReleaseTrackTag = isReleaseTrack(tag);

		// If we have an existing track release, we want to
		// delete the old release before pushing a new one.
		if (isReleaseTrackTag && existingRelease) {
			await deleteRelease(octokit, owner, repo, existingRelease);
		}

		const releaseResponse = await octokit.rest.repos.createRelease({
			tag_name: tag,
			name: tag,
			body: BODY,
			draft: false,
			prerelease: IS_PRE_RELEASE === 'true',
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

/**
 * @param {import('./github-helpers.mjs').GitHubInstance} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {string} tag
 */
async function getExistingRelease(octokit, owner, repo, tag) {
	try {
		const releaseRequest = await octokit.rest.repos.getReleaseByTag({
			owner,
			repo,
			tag,
		});

		return releaseRequest.data;
	} catch (ex) {
		return undefined;
	}
}

/**
 * @param {import('./github-helpers.mjs').GitHubInstance} octokit
 * @param {string} owner
 * @param {string} repo
 * @param {{id: number}} release
 */
async function deleteRelease(octokit, owner, repo, release) {
	await octokit.rest.repos.deleteRelease({
		owner,
		repo,
		release_id: release.id,
	});
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	createGitHubRelease();
}
