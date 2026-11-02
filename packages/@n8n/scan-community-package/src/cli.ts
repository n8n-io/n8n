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
	type PackageScan,
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

const analyzePackage = async (spec: string): Promise<PackageScan> => {
	if (isLocalPath(spec)) return await analyzeLocalPackage(path.resolve(spec));
	const { packageName, version } = resolvePackage(spec);
	return await analyzePackageByName(packageName, version);
};

const run = async (spec: string): Promise<{ report: ScanReport; exitCode: number }> => {
	try {
		const result = await analyzePackage(spec);
		const { packageName } = result;
		const label = formatPackageSpec(packageName, result.version);
		const exitCode = getExitCode(result);
		const isPartialScan = (result.skippedChecks ?? []).length > 0;

		console.log(
			{
				[EXIT_CODES.SCAN_SUCCEEDED]: isPartialScan
					? `✅ Package "${label}" has passed the security checks that run before publishing`
					: `✅ Package "${label}" has passed all security checks`,
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

		if (isPartialScan) {
			console.log(
				'\n⚠️ This was a local scan. The npm provenance and attested source checks run after you publish.',
			);
		}

		return { report: buildReport(packageName, result), exitCode };
	} catch (error: unknown) {
		console.error('Analysis failed:', error);
		const report = buildReport(spec, {
			version: null,
			passed: false,
			message: `Analysis failed: ${errorMessage(error)}`,
			error,
		});
		return { report, exitCode: EXIT_CODES.INTERNAL_ERROR };
	}
};

const { report, exitCode } = await run(packageSpec);
// Set rather than call process.exit() so piped stdout is flushed first
process.exitCode = exitCode;

if (output) {
	try {
		fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
	} catch (error: unknown) {
		console.error(`Could not write the report to "${output}": ${errorMessage(error)}`);
		process.exitCode = EXIT_CODES.INTERNAL_ERROR;
	}
}
