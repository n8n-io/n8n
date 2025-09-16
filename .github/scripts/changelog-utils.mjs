#!/usr/bin/env node

import conventionalChangelog from 'conventional-changelog';

/**
 * Shared changelog generation utilities
 * Extracted from update-changelog.mjs to ensure consistency
 */

// Transform function matching main changelog exactly
export function getMainChangelogTransform() {
	return (commit, callback) => {
		const hasNoChangelogInHeader = commit.header && commit.header.includes('(no-changelog)');
		const isBenchmarkScope = commit.scope === 'benchmark';

		// Ignore commits that have 'benchmark' scope or '(no-changelog)' in the header
		callback(null, hasNoChangelogInHeader || isBenchmarkScope ? undefined : commit);
	};
}

// Transform function for independent packages (more restrictive)
export function getIndependentPackageChangelogTransform() {
	return (commit, callback) => {
		const hasNoChangelogInHeader = commit.header && commit.header.includes('(no-changelog)');

		// For independent packages, only include meaningful changes
		const meaningfulTypes = ['feat', 'fix', 'perf'];
		if (commit.type && !meaningfulTypes.includes(commit.type)) {
			callback(null, undefined);
			return;
		}

		// Ignore commits that have 'benchmark' scope or '(no-changelog)' in the header
		callback(null, hasNoChangelogInHeader ? undefined : commit);
	};
}

// Create conventional changelog stream with main changelog settings
export function createChangelogStream(options = {}) {
	const {
		tagPrefix,
		releaseCount = 1,
		independentPackage = false,
		gitRawCommitsOpts = {},
		writerOpts = {},
	} = options;

	const changelogOptions = {
		preset: 'angular',
		releaseCount,
		gitRawCommitsOpts,
		transform: independentPackage
			? getIndependentPackageChangelogTransform()
			: getMainChangelogTransform(),
		writerOpts,
	};

	// Only set tagPrefix when explicitly provided
	if (tagPrefix !== undefined) {
		changelogOptions.tagPrefix = tagPrefix;
	}

	return conventionalChangelog(changelogOptions).on('error', (err) => {
		console.error(err.stack);
		throw err;
	});
}