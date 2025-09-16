#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { createChangelogStream } from './changelog-utils.mjs';

/**
 * Generate changelog for a specific package using conventional commits
 * For independent packages, generates changelog from recent commits
 * Usage: node generate-package-changelog.mjs --package-path <path> --version <version>
 */

const { values } = parseArgs({
	options: {
		'package-path': { type: 'string' },
		version: { type: 'string' },
	},
});

const packagePath = values['package-path'];
const version = values.version;

if (!packagePath || !version) {
	console.error(
		'Usage: node generate-package-changelog.mjs --package-path <path> --version <version>',
	);
	process.exit(1);
}

const packageJsonPath = join(packagePath, 'package.json');
const changelogPath = join(packagePath, 'CHANGELOG.md');

const packageInfo = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
const packageName = packageInfo.name;

console.log(`Generating changelog for ${packageName} v${version}`);

try {
	const relativePath = packagePath.replace(process.cwd() + '/', '');

	// For workflow runs, only include commits from the current push
	// Use GitHub event context if available, otherwise fall back to HEAD^..HEAD
	const fromCommit = process.env.GITHUB_BEFORE || 'HEAD^';

	// Create changelog stream using shared utilities (matches main changelog behavior)
	const changelogStream = createChangelogStream({
		independentPackage: true,
		gitRawCommitsOpts: {
			from: fromCommit,
			path: relativePath
		}
	});

	// Generate new changelog content
	const chunks = [];
	changelogStream.on('data', (chunk) => {
		chunks.push(chunk);
	});

	changelogStream.on('end', () => {
		const newChangelogContent = Buffer.concat(chunks).toString();

		// Read existing changelog or create new one
		let existingChangelog = '';
		if (existsSync(changelogPath)) {
			existingChangelog = readFileSync(changelogPath, 'utf8');
		}

		// Prepend new version to existing changelog
		const updatedChangelog = newChangelogContent + (existingChangelog ? '\n' + existingChangelog : '');

		writeFileSync(changelogPath, updatedChangelog);
		console.log(`✓ Updated ${changelogPath}`);
	});

	changelogStream.on('error', (error) => {
		console.error(`Failed to generate changelog for ${packageName}:`, error);
		process.exit(1);
	});

} catch (error) {
	console.error(`Failed to generate changelog for ${packageName}:`, error);
	process.exit(1);
}