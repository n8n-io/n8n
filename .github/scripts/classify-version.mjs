#!/usr/bin/env node

import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import semver from 'semver';

class VersionClassifier {
	constructor() {
		this.githubOutput = process.env.GITHUB_OUTPUT || null;
	}

	classify(versionString) {
		// Reject versions with 'v' prefix
		if (versionString.startsWith('v')) {
			throw new Error(`Invalid version format: ${versionString}`);
		}

		// Parse version with semver
		const parsed = semver.parse(versionString);

		if (!parsed) {
			throw new Error(`Invalid version format: ${versionString}`);
		}

		// Extract components
		const major = parsed.major;
		const minor = parsed.minor;
		const patch = parsed.patch;
		const prerelease = parsed.prerelease.length > 0 ? parsed.prerelease.join('.') : '';
		const isPrerelease = parsed.prerelease.length > 0;

		// Identify prerelease types
		const isRc = parsed.prerelease.length > 0 && parsed.prerelease[0] === 'rc';
		const isBeta = parsed.prerelease.length > 0 && parsed.prerelease[0] === 'beta';
		const isDev = parsed.prerelease.length > 0 && parsed.prerelease[0] === 'dev';
		const isExp = parsed.prerelease.length > 0 && parsed.prerelease[0] === 'exp';

		return {
			major,
			minor,
			patch,
			prerelease,
			is_prerelease: isPrerelease,
			is_rc: isRc,
			is_beta: isBeta,
			is_dev: isDev,
			is_exp: isExp,
		};
	}

	output(data) {
		if (this.githubOutput) {
			// Write to GITHUB_OUTPUT for GitHub Actions
			const outputs = [
				`major=${data.major}`,
				`minor=${data.minor}`,
				`patch=${data.patch}`,
				`prerelease=${data.prerelease}`,
				`is_prerelease=${data.is_prerelease}`,
				`is_rc=${data.is_rc}`,
				`is_beta=${data.is_beta}`,
				`is_dev=${data.is_dev}`,
				`is_exp=${data.is_exp}`,
			];
			appendFileSync(this.githubOutput, outputs.join('\n') + '\n');

			// Debug output for CI logs
			console.log(`Parsed version: major=${data.major}, minor=${data.minor}, patch=${data.patch}, prerelease=${data.prerelease}`);
		} else {
			// Output JSON to stdout for local testing
			console.log(JSON.stringify(data, null, 2));
		}
	}
}

// CLI - Simple argument parsing
if (fileURLToPath(import.meta.url) === process.argv[1]) {
	const args = process.argv.slice(2);
	const getArg = (name) => {
		const index = args.indexOf(`--${name}`);
		if (index === -1 || !args[index + 1]) return undefined;
		const value = args[index + 1];
		// Handle empty strings and 'null' as undefined
		return value === '' || value === 'null' ? undefined : value;
	};

	try {
		const versionString = getArg('version');

		if (!versionString) {
			console.error('Error: --version is required');
			process.exit(1);
		}

		const classifier = new VersionClassifier();
		const result = classifier.classify(versionString);
		classifier.output(result);
	} catch (error) {
		console.error(`Error: ${error.message}`);
		process.exit(1);
	}
}

export default VersionClassifier;
