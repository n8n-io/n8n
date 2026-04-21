import semver from 'semver';
import {
	getCommitForRef,
	listTagsPointingAt,
	RELEASE_PREFIX,
	RELEASE_TRACKS,
	stripReleasePrefixes,
	writeGithubOutput,
} from './github-helpers.mjs';

/**
 * Given a list of tag names, return the highest semver tag (keeping the original 'v' prefix),
 * or "" if none match semver.
 *
 * @param {string[]} tags
 **/
function highestSemverTag(tags) {
	const candidates = tags
		.filter((t) => t.startsWith(RELEASE_PREFIX))
		.map((t) => ({
			tag: t,
			version: stripReleasePrefixes(t),
		}))
		.filter(({ version }) => semver.valid(version));

	if (candidates.length === 0) return '';

	candidates.sort((a, b) => semver.rcompare(a.version, b.version));
	return candidates[0]?.tag;
}

/**
 * @param {string} track
 **/
function getSemverTagForTrack(track) {
	const commit = getCommitForRef(track);
	if (!commit) return '';

	const tags = listTagsPointingAt(commit);
	return highestSemverTag(tags);
}

function main() {
	/** @type { Record<string, string> } */
	const outputs = {};
	for (const track of RELEASE_TRACKS) {
		outputs[track] = getSemverTagForTrack(track);
	}

	writeGithubOutput(outputs);

	console.log('Current release versions: ');
	for (const [k, v] of Object.entries(outputs)) {
		console.log(`${k}: ${v || '(not found)'}`);
	}
}

try {
	main();
} catch (err) {
	console.error(String(err?.message ?? err));
	process.exit(1);
}
