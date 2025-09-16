#!/usr/bin/env node

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import conventionalChangelog from 'conventional-changelog';

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
	const gitRange = `${fromCommit}..HEAD`;

	// First, get only commits that affect this package
	const packageCommits = execSync(
		`git log --format="%H" ${gitRange} -- "${relativePath}/**" || true`,
		{ encoding: 'utf8' }
	).trim().split('\n').filter(hash => hash.trim());

	if (packageCommits.length === 0) {
		console.log('No commits found for this package in the specified range');
		process.exit(0);
	}

	console.log(`Found ${packageCommits.length} commits affecting ${packageName}`);

	// Transform function for independent packages (only meaningful changes)
	const independentPackageTransform = (commit, callback) => {
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

	// Generate changelog using conventional-changelog with commit filtering
	const changelogStream = conventionalChangelog({
		preset: 'angular',
		releaseCount: 1,
		transform: independentPackageTransform,
		gitRawCommitsOpts: {
			from: fromCommit,
			to: 'HEAD',
			format: '%B%n-hash-%n%H%n-gitTags-%n%d%n-committerDate-%n%ci',
		},
		writerOpts: {
			headerPartial: `# ${version} (${new Date().toISOString().split('T')[0]})\n\n`
		}
	});

	// Generate new changelog content
	const chunks = [];
	changelogStream.on('data', (chunk) => {
		chunks.push(chunk);
	});

	changelogStream.on('end', () => {
		let newChangelogContent = Buffer.concat(chunks).toString();

		// Fix the header to include version number
		newChangelogContent = newChangelogContent.replace(
			/^#\s+\(\d{4}-\d{2}-\d{2}\)/,
			`# ${version} (${new Date().toISOString().split('T')[0]})`
		);

		// Filter the generated changelog to only include commits that affect this package
		const lines = newChangelogContent.split('\n');
		const filteredLines = [];
		let currentCommitLines = [];
		let isCurrentCommitIncluded = false;

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];

			// Always include headers and empty lines
			if (line.startsWith('#') || line.startsWith('###') || line.trim() === '') {
				// First, add any pending commit lines if they should be included
				if (isCurrentCommitIncluded && currentCommitLines.length > 0) {
					filteredLines.push(...currentCommitLines);
				}
				filteredLines.push(line);
				currentCommitLines = [];
				isCurrentCommitIncluded = false;
				continue;
			}

			// Check if this line starts a new commit (starts with '* ')
			if (line.startsWith('* ')) {
				// First, add any pending commit lines if they should be included
				if (isCurrentCommitIncluded && currentCommitLines.length > 0) {
					filteredLines.push(...currentCommitLines);
				}

				// Start tracking a new commit
				currentCommitLines = [line];

				// Check if this commit affects our package
				const hashMatch = line.match(/\[([a-f0-9]{7,})\]/);
				if (hashMatch) {
					const shortHash = hashMatch[1];
					isCurrentCommitIncluded = packageCommits.some(fullHash => fullHash.startsWith(shortHash));
				} else {
					isCurrentCommitIncluded = false;
				}
			} else if (currentCommitLines.length > 0) {
				// This is a continuation of the current commit (wrapped line, etc.)
				currentCommitLines.push(line);
			}
		}

		// Handle any remaining commit at the end
		if (isCurrentCommitIncluded && currentCommitLines.length > 0) {
			filteredLines.push(...currentCommitLines);
		}

		// Clean up the filtered content and remove empty sections
		let cleanedContent = filteredLines.join('\n');

		// Remove empty sections (sections with only headers and no content)
		cleanedContent = cleanedContent.replace(/### [A-Za-z\s]+\n+(?=###|$)/g, '');

		// Remove excessive empty lines
		cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');

		newChangelogContent = cleanedContent.trim() + '\n\n';

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