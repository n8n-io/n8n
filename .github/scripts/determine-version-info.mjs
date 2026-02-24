import { readFileSync } from 'node:fs';
import { RELEASE_TRACKS, resolveReleaseTagForTrack, writeGithubOutput } from './github-helpers.mjs';
import semver from 'semver';

/**
 * @param {any} packageVersion
 */
export function determineTrack(packageVersion) {
	if (!semver.valid(packageVersion)) {
		throw new Error(`Package semver not valid. Got ${packageVersion}`);
	}

	/** @type { Partial<Record<import('./github-helpers.mjs').ReleaseTrack, import('./github-helpers.mjs').TagVersionInfo>> } */
	const trackToReleaseMap = {};
	for (const t of RELEASE_TRACKS) {
		trackToReleaseMap[t] = resolveReleaseTagForTrack(t);
	}

	console.log('Current Tracks: ', JSON.stringify(trackToReleaseMap, null, 4));

	let track = null;
	let newStable = null;
	let bump = determineBump(packageVersion);
	const releaseType = determineReleaseType(packageVersion);

	// Check through our current release versions, if semver matches,
	// we inherit the track pointer from them
	for (const [releaseTrack, tagVersionInfo] of Object.entries(trackToReleaseMap)) {
		if (tagVersionInfo && matchesTrack(tagVersionInfo, packageVersion)) {
			track = releaseTrack;
			break;
		}
	}

	if (!track) {
		if (!trackToReleaseMap.beta?.version) {
			throw new Error(
				'Likely updating to new beta release, but no existing beta tag was found in git.',
			);
		}
		// If not track was found in current versions, we verify we're building a
		// new beta version and the input is not invalid.
		assertNewBetaRelease(trackToReleaseMap.beta.version, packageVersion);

		track = 'beta';
		newStable = trackToReleaseMap.beta.version;
	}

	if (!track) {
		throw new Error('Could not determine track for release. Exiting...');
	}

	const output = {
		version: packageVersion,
		track,
		bump,
		new_stable_version: newStable,
		release_type: releaseType,
	};

	writeGithubOutput(output);
	console.log(
		`Determined track info: track=${track}, version=${packageVersion}, new_stable_version=${newStable}, release_type=${releaseType}`,
	);

	return output;
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
	determineTrack(packageJson.version);
}
