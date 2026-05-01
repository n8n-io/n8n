#!/usr/bin/env node

const args = process.argv.slice(2);
if (args.length < 1) {
	console.error('Usage: npx @n8n/scan-community-package <package-name>[@version]');
	process.exit(1);
}

import { resolvePackage, analyzePackageByName } from './scanner.mjs';

const packageSpec = args[0];
const { packageName, version } = resolvePackage(packageSpec);
try {
	const result = await analyzePackageByName(packageName, version);

	if (result.passed) {
		console.log(`✅ Package ${packageName}@${result.version} has passed all security checks`);
	} else {
		console.log(`❌ Package ${packageName}@${result.version} has failed security checks`);
		console.log(`Reason: ${result.message}`);

		if (result.details) {
			console.log('\nDetails:');
			console.log(result.details);
		}
	}
} catch (error) {
	console.error('Analysis failed:', error);
	process.exit(1);
}
