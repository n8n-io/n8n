import semver from 'semver';
import {
	listRemoteTagsWithCommits,
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
 * @param {Map<string, string>} tagToSha
 **/
export function getSemverTagForTrack(track, tagToSha) {
	const commit = tagToSha.get(track);
	if (!commit) return '';

	const tags = [...tagToSha].filter(([, sha]) => sha === commit).map(([tag]) => tag);
	return highestSemverTag(tags);
}

function main() {
	const tagToSha = listRemoteTagsWithCommits();
	/** @type { Record<string, string> } */
	const outputs = {};
	for (const track of RELEASE_TRACKS) {
		outputs[track] = getSemverTagForTrack(track, tagToSha);
	}

	writeGithubOutput(outputs);

	console.log('Current release versions: ');
	for (const [k, v] of Object.entries(outputs)) {
		console.log(`${k}: ${v || '(not found)'}`);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) {
	try {
		main();
	} catch (err) {
		console.error(String(err?.message ?? err));
		process.exit(1);
	}
}
