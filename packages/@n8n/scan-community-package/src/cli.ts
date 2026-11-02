#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from 'node:util';

import {
	resolvePackage,
	analyzeLocalPackage,
	analyzePackageByName,
	isLocalPath,
	buildReport,
	errorMessage,
	formatPackageSpec,
	getExitCode,
	EXIT_CODES,
	type ScanReport,
} from './scanner.js';

const USAGE =
	'Usage: npx @n8n/scan-community-package <package-name>[@version] | <path> [--output <file>]';

let packageSpec: string | undefined;
let output: string | undefined;
try {
	const { positionals, values } = parseArgs({
		allowPositionals: true,
		options: { output: { type: 'string' } },
	});
	packageSpec = positionals[0];
	output = values.output;
} catch (error: unknown) {
	console.error(errorMessage(error));
}

if (!packageSpec) {
	console.error(USAGE);
	process.exit(EXIT_CODES.INTERNAL_ERROR);
}

const writeReport = (report: ScanReport) => {
	if (output) fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
};

const scan = async (spec: string) => {
	if (isLocalPath(spec)) return await analyzeLocalPackage(path.resolve(spec));
	const { packageName, version } = resolvePackage(spec);
	return await analyzePackageByName(packageName, version);
};

try {
	const result = await scan(packageSpec);
	const { packageName } = result;
	const label = formatPackageSpec(packageName, result.version);
	const exitCode = getExitCode(result);

	console.log(
		{
			[EXIT_CODES.SCAN_SUCCEEDED]: `✅ Package "${label}" has passed all security checks`,
			[EXIT_CODES.SCAN_FAILED]: `❌ Package "${label}" has failed security checks`,
			[EXIT_CODES.INTERNAL_ERROR]: `❌ Could not complete the scan of "${label}"`,
		}[exitCode],
	);

	if (!result.passed) {
		console.log(`Reason: ${result.message}`);

		if (result.details) {
			console.log('\nDetails:');
			console.log(result.details);
		}
	}

	if (isLocalPath(packageSpec)) {
		console.log(
			'\n⚠️ This was a local scan. The npm provenance and attested source checks run after you publish.',
		);
	}

	writeReport(buildReport(packageName, result));
	// Set rather than call process.exit() so piped stdout is flushed first
	process.exitCode = exitCode;
} catch (error: unknown) {
	console.error('Analysis failed:', error);
	writeReport(
		buildReport(packageSpec, {
			version: null,
			passed: false,
			message: `Analysis failed: ${errorMessage(error)}`,
			error,
		}),
	);
	process.exitCode = EXIT_CODES.INTERNAL_ERROR;
}
