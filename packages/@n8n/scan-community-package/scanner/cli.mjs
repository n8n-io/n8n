#!/usr/bin/env node

import { resolvePackage, analyzePackageByName, getExitCode, EXIT_CODES } from './scanner.mjs';

const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('Usage: npx @n8n/scan-community-package <package-name>[@version]');
	process.exit(EXIT_CODES.ERROR);
}

const packageSpec = args[0];
try {
	const { packageName, version } = resolvePackage(packageSpec);
	const result = await analyzePackageByName(packageName, version);

	if (result.passed) {
		console.log(`✅ Package ${packageName}@${result.version} has passed all security checks`);
	} else if (result.error) {
		console.log(`❌ Could not complete the scan of ${packageName}@${result.version}`);
		console.log(`Reason: ${result.message}`);
	} else {
		console.log(`❌ Package ${packageName}@${result.version} has failed security checks`);
		console.log(`Reason: ${result.message}`);

		if (result.details) {
			console.log('\nDetails:');
			console.log(result.details);
		}
	}

	// Set rather than call process.exit() so piped stdout is flushed first
	process.exitCode = getExitCode(result);
} catch (error) {
	console.error('Analysis failed:', error);
	process.exitCode = EXIT_CODES.ERROR;
}
