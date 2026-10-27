import { ensureEnvVar, sh, writeGithubOutput } from './github-helpers.mjs';

function determineReleaseVersionChanges() {
	const previousVersion = ensureEnvVar('PREVIOUS_VERSION_TAG');
	const releaseVersion = ensureEnvVar('RELEASE_VERSION_TAG');

	const log = sh('git', [
		'--no-pager',
		'log',
		'--format="%s (%h)"',
		`${previousVersion}..${releaseVersion}`,
	]);

	writeGithubOutput({
		has_node_enhancements: hasNodeEnhancements(log),
		has_core_changes: hasCoreChanges(log),
	});
}

/**
 * Matches commit messages with
 *
 * fix(nodes)
 * fix(xyz Node)
 * feat(nodes)
 * feat(xyz Node)
 *
 * @param {string} log
 */
export function hasNodeEnhancements(log) {
	return /(fix|feat)\((.*Node|nodes)\)/.test(log);
}

/**
 * Matches commit messages with feat(core) or feat(editor)
 *
 * @param {string} log
 */
export function hasCoreChanges(log) {
	return /feat\((core|editor)\)/.test(log);
}

// only run when executed directly, not when imported by tests
if (import.meta.url === `file://${process.argv[1]}`) {
	determineReleaseVersionChanges();
}
