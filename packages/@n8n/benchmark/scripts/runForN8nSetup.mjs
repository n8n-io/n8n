#!/usr/bin/env zx
/**
 * This script runs the benchmarks for the given n8n setup.
 */
// @ts-check
import path from 'path';
import { $, argv, fs } from 'zx';
import { DockerComposeClient } from './clients/dockerComposeClient.mjs';

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
	const baseRunDir = argv.runDir || process.env.RUN_DIR || '/n8n';

	if (!fs.existsSync(baseRunDir)) {
		console.error(
			`The run directory "${baseRunDir}" does not exist. Please specify a valid directory using --runDir`,
		);
		process.exit(1);
	}

	const runDir = path.join(baseRunDir, n8nSetupToUse);
	fs.emptyDirSync(runDir);
	// Make sure the n8n container user (node) has write permissions to the run directory
	await $`chmod 777 ${runDir}`;

	const dockerComposeClient = new DockerComposeClient({
		$: $({
			cwd: composeFilePath,
			verbose: true,
			env: {
				N8N_VERSION: n8nTag,
				BENCHMARK_VERSION: benchmarkTag,
				K6_API_TOKEN: k6ApiToken,
				RUN_DIR: runDir,
			},
		}),
	});

	try {
		await dockerComposeClient.$('up', '-d', '--remove-orphans', 'n8n');

		await dockerComposeClient.$('run', 'benchmark', 'run', `--scenarioNamePrefix=${n8nSetupToUse}`);
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
		console.error('');
		await dumpN8nInstanceLogs(dockerComposeClient);
	} finally {
		await dockerComposeClient.$('down');
	}
}

async function dumpN8nInstanceLogs(dockerComposeClient) {
	console.error('n8n instance logs:');
	await dockerComposeClient.$('logs', 'n8n');
}

function printUsage() {
	const availableSetups = getAllN8nSetups();
	console.log('Usage: zx runForN8nSetup.mjs --runDir /path/for/n8n/data <n8n setup to use>');
	console.log(`   eg: zx runForN8nSetup.mjs --runDir /path/for/n8n/data ${availableSetups[0]}`);
	console.log('');
	console.log('Flags:');
	console.log(
		'  --runDir <path>             Directory to share with the n8n container for storing data. Default is /n8n',
	);
	console.log('  --n8nDockerTag <tag>        Docker tag for n8n image. Default is latest');
	console.log(
		'  --benchmarkDockerTag <tag>  Docker tag for benchmark cli image. Default is latest',
	);
	console.log('  --k6ApiToken <token>        K6 API token to upload the results');
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
