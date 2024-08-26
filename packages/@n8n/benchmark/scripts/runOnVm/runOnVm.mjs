#!/usr/bin/env zx
/**
 * This script runs the benchmarks using a given docker compose setup
 */
// @ts-check
import path from 'path';
import { $, argv, fs } from 'zx';

const paths = {
	n8nSetupsDir: path.join(__dirname, 'n8nSetups'),
};

async function main() {
	const [n8nSetupToUse] = argv._;
	validateN8nSetup(n8nSetupToUse);

	const composeFilePath = path.join(paths.n8nSetupsDir, n8nSetupToUse);
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
			N8N_BENCHMARK_SCENARIO_NAME_PREFIX: n8nSetupToUse,
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

function printUsage() {
	const availableSetups = getAllN8nSetups();
	console.log('Usage: zx runOnVm.mjs <n8n setup to use>');
	console.log(`   eg: zx runOnVm.mjs ${availableSetups[0]}`);
	console.log('');
	console.log('Available setups:');
	console.log(availableSetups.join(', '));
}

/**
 * @returns {string[]}
 */
function getAllN8nSetups() {
	return fs.readdirSync(paths.n8nSetupsDir);
}

function validateN8nSetup(givenSetup) {
	const availableSetups = getAllN8nSetups();
	if (!availableSetups.includes(givenSetup)) {
		printUsage();
		process.exit(1);
	}
}

main();
