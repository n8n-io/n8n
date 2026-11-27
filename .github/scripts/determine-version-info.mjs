import { readFileSync } from 'node:fs';
import {
	RELEASE_TRACKS,
	RELEASE_PREFIX,
	listRemoteTagsWithCommits,
	resolveReleaseTagForTrack,
	tagVersionInfoToReleaseCandidateBranchName,
	trySh,
	writeGithubOutput,
} from './github-helpers.mjs';
import semver from 'semver';

const V3_CUTOVER_BASELINE = '3.4.1';

/**
 * @param {any} packageVersion
 * @param {{ prerelease?: boolean }} [options]
 */
export function determineTrack(packageVersion, { prerelease = false } = {}) {
	if (!semver.valid(packageVersion)) {
		throw new Error(`Package semver not valid. Got ${packageVersion}`);
	}

	let bump = determineBump(packageVersion);
	const releaseType = determineReleaseType(packageVersion);

	if (prerelease) {
		if (semver.major(packageVersion) !== 3 || semver.prerelease(packageVersion) !== null) {
			throw new Error(`Standalone prereleases require a bare v3 version. Got ${packageVersion}`);
		}

		const previousVersion = determinePreviousRelease(packageVersion);
		const output = {
			previous_version: previousVersion,
			version: packageVersion,
			track: 'rc',
			bump,
			new_stable_version: null,
			release_type: 'rc',
			rc_branch: tagVersionInfoToReleaseCandidateBranchName({
				version: packageVersion,
				tag: /** @type {import('./github-helpers.mjs').ReleaseVersion} */ (`n8n@${packageVersion}`),
			}),
			prerelease: true,
		};

		writeGithubOutput(output);
		console.log(
			`Determined prerelease info: ${Object.entries(output)
				.map(([key, val]) => `${key}=${val}`)
				.join(', ')}`,
		);

		return output;
	}

	/** @type { Partial<Record<import('./github-helpers.mjs').ReleaseTrack, import('./github-helpers.mjs').TagVersionInfo>> } */
	const trackToReleaseMap = {};
	for (const t of RELEASE_TRACKS) {
		trackToReleaseMap[t] = resolveReleaseTagForTrack(t);
	}

	console.log('Current Tracks: ', JSON.stringify(trackToReleaseMap, null, 4));

	let newStable = null;

	const matchingTracks = RELEASE_TRACKS.filter((candidate) => {
		const tagVersionInfo = trackToReleaseMap[candidate];
		return tagVersionInfo && matchesTrack(tagVersionInfo, packageVersion);
	});
	const maintenanceTrack = matchingTracks.find((candidate) => candidate.startsWith('v'));
	if (maintenanceTrack && matchingTracks.length > 1) {
		throw new Error(
			`The ${maintenanceTrack} maintenance line overlaps with another release track.`,
		);
	}
	if (
		maintenanceTrack &&
		(maintenanceTrack !== `v${semver.major(packageVersion)}` || bump !== 'patch')
	) {
		throw new Error(
			`The ${maintenanceTrack} maintenance track only supports patches for its major version.`,
		);
	}
	let [track] = matchingTracks;

	if (!track) {
		let previousBeta = trackToReleaseMap.beta?.version;
		if (!previousBeta) {
			throw new Error(
				'Likely updating to new beta release, but no existing beta tag was found in git.',
			);
		}
		if (
			semver.major(previousBeta) === 2 &&
			packageVersion === semver.inc(V3_CUTOVER_BASELINE, 'minor')
		) {
			const baselineTag = `${RELEASE_PREFIX}${V3_CUTOVER_BASELINE}`;
			if (!trySh('git', ['merge-base', '--is-ancestor', `refs/tags/${baselineTag}`, 'HEAD']).ok) {
				throw new Error(`The v3 cutover release must descend from ${baselineTag}.`);
			}
			previousBeta = V3_CUTOVER_BASELINE;
		}
		// If not track was found in current versions, we verify we're building a
		// new beta version and the input is not invalid.
		assertNewBetaRelease(previousBeta, packageVersion);

		track = 'beta';
		newStable = previousBeta;
	}

	if (!track) {
		throw new Error('Could not determine track for release. Exiting...');
	}

	const rc_branch = tagVersionInfoToReleaseCandidateBranchName(
		{
			version: packageVersion,
			tag: /** @type {import('./github-helpers.mjs').ReleaseVersion} */ (`n8n@${packageVersion}`),
		},
		track,
	);

	const previousVersion = newStable ?? trackToReleaseMap[track]?.version;

	const output = {
		previous_version: previousVersion,
		version: packageVersion,
		track,
		bump,
		new_stable_version: newStable,
		release_type: releaseType,
		rc_branch,
		prerelease: false,
	};

	writeGithubOutput(output);
	console.log(
		`Determined track info: ${Object.entries(output)
			.map(([key, val]) => `${key}=${val}`)
			.join(', ')}`,
	);

	return output;
}

function determinePreviousRelease(packageVersion) {
	const versions = [...listRemoteTagsWithCommits().keys()]
		.filter((tag) => tag.startsWith(RELEASE_PREFIX))
		.map((tag) => tag.slice(RELEASE_PREFIX.length))
		.filter((version) => semver.valid(version) && semver.lt(version, packageVersion))
		.sort(semver.rcompare);

	if (!versions[0]) {
		throw new Error(`Could not find a release before ${packageVersion}`);
	}

	return versions[0];
}

/**
 * The current version matches the track, if their Major and Minor semvers match.
 *
 * This means that we are working with a patch release
 *
 * @param {import("./github-helpers.mjs").TagVersionInfo} tagVersionInfo
 * @param {any} currentVersion
 */
function matchesTrack(tagVersionInfo, currentVersion) {
	if (semver.major(tagVersionInfo.version) !== semver.major(currentVersion)) {
		return false;
	}
	if (semver.minor(tagVersionInfo.version) !== semver.minor(currentVersion)) {
		return false;
	}
	return true;
}

/**
 * @param {string} currentBetaVersion
 * @param {any} currentVersion
 */
function assertNewBetaRelease(currentBetaVersion, currentVersion) {
	if (semver.major(currentBetaVersion) !== semver.major(currentVersion)) {
		throw new Error('Major version bumps are not allowed by this pipeline');
	}

	const bumpedCurrentBeta = semver.inc(currentBetaVersion, 'minor');
	if (semver.minor(bumpedCurrentBeta) !== semver.minor(currentVersion)) {
		throw new Error(
			`Trying to upgrade minor version by more than one increment. Previous: ${bumpedCurrentBeta}, Requested: ${currentVersion}`,
		);
	}
}

function determineReleaseType(currentVersion) {
	if (currentVersion.includes('-rc.')) {
		return 'rc';
	}
	if (currentVersion.includes('-exp')) {
		return 'rc';
	}
	return 'stable';
}

function determineBump(currentVersion) {
	if (semver.patch(currentVersion) === 0 && determineReleaseType(currentVersion) != 'rc') {
		return 'minor';
	}
	return 'patch';
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	const packageJson = JSON.parse(readFileSync('./package.json', 'utf8'));
	determineTrack(packageJson.version, { prerelease: process.env.PRERELEASE === 'true' });
}
