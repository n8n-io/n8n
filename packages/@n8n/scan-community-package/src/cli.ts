#!/usr/bin/env node

import { resolvePackage, analyzePackageByName } from './scanner.js';

const [packageSpec] = process.argv.slice(2);
if (!packageSpec) {
	console.error('Usage: npx @n8n/scan-community-package <package-name>[@version]');
	process.exit(1);
}

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
} catch (error: unknown) {
	console.error('Analysis failed:', error);
	process.exit(1);
}
