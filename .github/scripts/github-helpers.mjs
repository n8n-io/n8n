import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import semver from 'semver';

export const RELEASE_TRACKS = /** @type { const } */ ([
	//
	'stable',
	'beta',
	'v1',
]);

/**
 * @typedef {typeof RELEASE_TRACKS[number]} ReleaseTrack
 * */

/**
 * @typedef {`${number}.${number}.${number}`} SemVer
 * */

/**
 * @typedef {`${RELEASE_PREFIX}${SemVer}`} ReleaseVersion
 * */

/**
 * @typedef {{ tag: ReleaseVersion, version: SemVer}} TagVersionInfo
 * */

export const RELEASE_PREFIX = 'n8n@';

/**
 * Given a list of tags, return the highest semver for tags like "n8n@2.7.0".
 * Returns the *tag string* (e.g. "n8n@2.7.0") or null.
 *
 * @param {string[]} tags
 *
 * @returns { ReleaseVersion | null }
 * */
export function pickHighestReleaseTag(tags) {
	const versions = tags
		.filter((t) => t.startsWith(RELEASE_PREFIX))
		.map((t) => ({ tag: t, v: stripReleasePrefixes(t) }))
		.filter(({ v }) => semver.valid(v))
		.sort((a, b) => semver.rcompare(a.v, b.v));

	return /** @type { ReleaseVersion } */ (versions[0]?.tag) ?? null;
}

/**
 * @param {any} track
 *
 * @returns { ReleaseTrack }
 * */
export function ensureReleaseTrack(track) {
	if (!RELEASE_TRACKS.includes(track)) {
		throw new Error(`Invalid track ${track}. Available tracks are ${RELEASE_TRACKS.join(', ')}`);
	}

	return track;
}

/**
 * Resolve a release track tag (stable/beta/etc.) to the corresponding
 * n8n@x.y.z tag pointing at the same commit.
 *
 * Returns null if the track tag or release tag is missing.
 *
 * @param { typeof RELEASE_TRACKS[number] } track
 *
 * @returns { TagVersionInfo }
 * */
export function resolveReleaseTagForTrack(track) {
	const commit = getCommitForRef(track);
	if (!commit) return null;

	const tagsAtCommit = listTagsPointingAt(commit);
	const releaseTag = pickHighestReleaseTag(tagsAtCommit);
	if (!releaseTag) return null;

	return {
		tag: releaseTag,
		version: stripReleasePrefixes(releaseTag),
	};
}

/**
 * Resolve a release track tag (stable/beta/etc.) to the corresponding
 * release-candidate/<major>.<minor>.x branch, based on the n8n@<x.y.z> tag
 * pointing at the same commit.
 *
 * Returns null if the track tag or release tag is missing.
 *
 * @param { typeof RELEASE_TRACKS[number] } track
 * */
export function resolveRcBranchForTrack(track) {
	const commit = getCommitForRef(track);
	if (!commit) return null;

	const tagsAtCommit = listTagsPointingAt(commit);
	const releaseTag = pickHighestReleaseTag(tagsAtCommit);
	if (!releaseTag) return null;

	const version = stripReleasePrefixes(releaseTag);
	const parsed = semver.parse(version);
	if (!parsed) return null;

	return `release-candidate/${parsed.major}.${parsed.minor}.x`;
}

/**
 * @param {string} tag
 *
 * @returns { SemVer }
 * */
export function stripReleasePrefixes(tag) {
	return /** @type { SemVer } */ (
		tag.startsWith(RELEASE_PREFIX) ? tag.slice(RELEASE_PREFIX.length) : tag
	);
}

/**
 * @returns { string[] }
 * */
export function readPrLabels() {
	const eventPath = ensureEnvVar('GITHUB_EVENT_PATH');

	const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
	/** @type { string[] | { name: string }[] } */
	const labels = event?.pull_request?.labels ?? [];

	return labels.map((l) => (typeof l === 'string' ? l : l?.name)).filter(Boolean);
}

/**
 * Ensures git tag exists.
 *
 * @throws { Error } if no tag was found
 * */
export function ensureTagExists(tag) {
	sh('git', ['fetch', '--force', '--no-tags', 'origin', `refs/tags/${tag}:refs/tags/${tag}`]);
}

/**
 * @param {string} bump
 *
 * @returns { bump is import("semver").ReleaseType }
 * */
export function isReleaseType(bump) {
	return ['major', 'minor', 'patch'].includes(bump);
}

/**
 * @param {string} variableName
 */
export function ensureEnvVar(variableName) {
	const v = process.env[variableName];
	if (!v) {
		throw new Error(`Missing required env var: ${variableName}`);
	}
	return v;
}

/**
 * @param {string} cmd
 * @param {readonly string[]} args
 * @param {import("node:child_process").ExecFileOptionsWithStringEncoding} args
 *
 * @example sh("git", ["tag", "--points-at", commit]);
 * */
export function sh(cmd, args, opts = {}) {
	return execFileSync(cmd, args, { encoding: 'utf8', ...opts }).trim();
}

/**
 * @param {string} cmd
 * @param {readonly string[]} args
 * @param {import("node:child_process").ExecFileOptionsWithStringEncoding} args
 *
 * @example trySh("git", ["tag", "--points-at", commit]);
 * */
export function trySh(cmd, args, opts = {}) {
	try {
		return { ok: true, out: sh(cmd, args, opts) };
	} catch {
		return { ok: false, out: '' };
	}
}

/**
 * Append outputs to GITHUB_OUTPUT if available.
 *
 * @param {Record<string, string>} obj
 */
export function writeGithubOutput(obj) {
	const path = process.env.GITHUB_OUTPUT;
	if (!path) return;

	const lines = Object.entries(obj)
		.map(([k, v]) => `${k}=${v ?? ''}`)
		.join('\n');

	fs.appendFileSync(path, lines + '\n', 'utf8');
}

/**
 * Resolve a ref (tag/branch/SHA) to the underlying commit SHA.
 * Uses ^{} so annotated tags are peeled to the commit.
 * Returns null if ref doesn't exist.
 *
 * @param {string} ref
 */
export function getCommitForRef(ref) {
	const res = trySh('git', ['rev-parse', `${ref}^{}`]);
	return res.ok && res.out ? res.out : null;
}

/**
 * List all tags that point at the given commit SHA.
 *
 * @param {string} commit
 */
export function listTagsPointingAt(commit) {
	const res = trySh('git', ['tag', '--points-at', commit]);
	if (!res.ok || !res.out) return [];

	return res.out
		.split('\n')
		.map((s) => s.trim())
		.filter(Boolean);
}
