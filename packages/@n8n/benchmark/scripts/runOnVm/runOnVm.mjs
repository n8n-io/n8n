#!/usr/bin/env zx
/**
 * This script runs the benchmarks using a given docker compose setup
 */

import { $ } from 'zx';

const [n8nSetupToUse] = argv._;

if (!n8nSetupToUse) {
	printUsage();
	process.exit(1);
}

function printUsage() {
	console.log('Usage: zx runOnVm.mjs <envName>');
	console.log('   eg: zx runOnVm.mjs sqlite');
}

async function main() {
	const composeFilePath = path.join(__dirname, 'n8nSetups', n8nSetupToUse);
	const n8nTag = argv.n8nDockerTag || process.env.N8N_DOCKER_TAG || 'latest';
	const benchmarkTag = argv.benchmarkDockerTag || process.env.BENCHMARK_DOCKER_TAG || 'latest';
	const k6ApiToken = argv.k6ApiToken || process.env.K6_API_TOKEN || undefined;

	const $$ = $({
		cwd: composeFilePath,
		verbose: true,
		env: {
			N8N_VERSION: n8nTag,
			BENCHMARK_VERSION: benchmarkTag,
			K6_API_TOKEN: k6ApiToken,
		},
	});

	try {
		await $$`docker-compose up -d n8n`;

		await $$`docker-compose run benchmark run`;
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
		console.error('');
		await dumpN8nInstanceLogs($$);
	} finally {
		await $$`docker-compose down`;
	}
}

async function dumpN8nInstanceLogs($$) {
	console.error('n8n instance logs:');
	await $$`docker-compose logs n8n`;
}

main();
