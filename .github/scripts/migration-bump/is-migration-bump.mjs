import { basename, dirname } from 'node:path';

export const BUMP_AUTHOR = 'n8n-assistant[bot]';

// GitHub commits and signs a commit that an App creates through the API with no custom author or committer.
const GITHUB_COMMITTER = 'web-flow';
const MIGRATIONS_DIR = 'packages/@n8n/db/src/migrations/';
const TIMESTAMP_PREFIX = /^(?<timestamp>\d{10,16})-(?<rest>.+)$/;

/**
 * @typedef {{
 *   commits: Array<{
 *     sha: string,
 *     author: { login: string } | null,
 *     committer?: { login: string } | null,
 *     commit?: { verification?: { verified: boolean } },
 *   }>,
 *   files: Array<{ status: string, filename: string, previous_filename?: string, patch?: string, changes?: number }>,
 * }} Changes
 *
 * @typedef {{ from: string, to: string }} TimestampMove
 */

/**
 * @param {Changes['files'][number]} file
 * @returns {TimestampMove | null}
 */
function renamedTimestamp(file) {
	if (file.status !== 'renamed' || !file.previous_filename) return null;
	if (dirname(file.previous_filename) !== dirname(file.filename)) return null;
	const from = TIMESTAMP_PREFIX.exec(basename(file.previous_filename))?.groups;
	const to = TIMESTAMP_PREFIX.exec(basename(file.filename))?.groups;
	if (!from || !to || from.rest !== to.rest) return null;
	return { from: from.timestamp, to: to.timestamp };
}

/**
 * @param {string} patch
 */
function changedLines(patch) {
	const lines = patch.split('\n');
	return {
		removed: lines.filter((line) => line.startsWith('-')).map((line) => line.slice(1)),
		added: lines.filter((line) => line.startsWith('+')).map((line) => line.slice(1)),
	};
}

/**
 * @param {Changes['files'][number]} file
 * @param {TimestampMove[]} moves
 */
function isTimestampSubstitution(file, moves) {
	if (file.status === 'renamed') {
		const move = renamedTimestamp(file);
		if (!moves.some(({ from, to }) => from === move?.from && to === move?.to)) return false;
	} else if (file.status !== 'modified') {
		return false;
	}

	if (file.patch === undefined) return file.status === 'renamed' && file.changes === 0;
	const { removed, added } = changedLines(file.patch);
	const substitute = (/** @type {string} */ line) =>
		moves.reduce((text, { from, to }) => text.replaceAll(from, to), line);
	return (
		removed.length === added.length &&
		removed.every((line, index) => substitute(line) === added[index])
	);
}

/**
 * True when the App created every commit through the API, and the only change is migration timestamps replaced by later ones.
 *
 * @param {Changes} changes
 * @returns {boolean}
 */
export function isMigrationBump({ commits, files }) {
	const moves = files
		.filter(({ filename }) => filename.startsWith(MIGRATIONS_DIR))
		.map(renamedTimestamp)
		.filter((move) => move !== null);
	return (
		commits.length > 0 &&
		commits.every(
			({ author, committer, commit }) =>
				author?.login === BUMP_AUTHOR &&
				committer?.login === GITHUB_COMMITTER &&
				commit?.verification?.verified === true,
		) &&
		moves.length > 0 &&
		files.every((file) => isTimestampSubstitution(file, moves))
	);
}
