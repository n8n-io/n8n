#!/usr/bin/env node

import { resolvePackage, analyzePackageByName, getExitCode, EXIT_CODES } from './scanner.js';

const [packageSpec] = process.argv.slice(2);
if (!packageSpec) {
	console.error('Usage: npx @n8n/scan-community-package <package-name>[@version]');
	process.exit(EXIT_CODES.SCAN_INCOMPLETE);
}

try {
	const { packageName, version } = resolvePackage(packageSpec);
	const result = await analyzePackageByName(packageName, version);
	const label = `${packageName}@${result.version}`;

	if (result.passed) {
		console.log(`✅ Package ${label} has passed all security checks`);
	} else {
		console.log(
			result.error === undefined
				? `❌ Package ${label} has failed security checks`
				: `❌ Could not complete the scan of ${label}`,
		);
		console.log(`Reason: ${result.message}`);

		if (result.details) {
			console.log('\nDetails:');
			console.log(result.details);
		}
	}

	// Set rather than call process.exit() so piped stdout is flushed first
	process.exitCode = getExitCode(result);
} catch (error: unknown) {
	console.error('Analysis failed:', error);
	process.exitCode = EXIT_CODES.SCAN_INCOMPLETE;
}
