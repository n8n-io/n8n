#!/usr/bin/env zx
/**
 * Script to run benchmarks on the cloud benchmark environment.
 * This script will:
 * 	1. Provision a benchmark environment using Terraform.
 * 	2. Run the benchmarks on the VM.
 * 	3. Destroy the cloud environment.
 *
 * NOTE: Must be run in the root of the package.
 *
 * Usage:
 * 	 zx scripts/runBenchmarksOnCloud.mjs [--debug] <n8n setup to use>
 *
 */
// @ts-check
import fs from 'fs';
import minimist from 'minimist';
import { sleep, which } from 'zx';
import path from 'path';
import { SshClient } from './sshClient.mjs';
import { TerraformClient } from './terraformClient.mjs';

/**
 * @typedef {Object} BenchmarkEnv
 * @property {string} vmName
 */

const RESOURCE_GROUP_NAME = 'n8n-benchmarking';

const paths = {
	n8nSetupsDir: path.join(path.resolve('scripts'), 'runOnVm', 'n8nSetups'),
};

async function main() {
	const config = await parseAndValidateConfig();
	await ensureDependencies();

	console.log('Using n8n tag', config.n8nTag);
	console.log('Using benchmark cli tag', config.benchmarkTag);

	const terraformClient = new TerraformClient({
		privateKeyPath: paths.privateKeyPath,
		isVerbose: config.isVerbose,
	});

	try {
		const benchmarkEnv = await terraformClient.provisionEnvironment();

		await runBenchmarksOnVm(config, benchmarkEnv);
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
	} finally {
		await terraformClient.destroyEnvironment();
	}
}

async function ensureDependencies() {
	await which('terraform');
	await which('az');
}

/**
 * @param {Config} config
 * @param {BenchmarkEnv} benchmarkEnv
 */
async function runBenchmarksOnVm(config, benchmarkEnv) {
	console.log(`Setting up the environment for ${config.n8nSetupToUse}...`);

	const sshClient = new SshClient({
		vmName: benchmarkEnv.vmName,
		resourceGroupName: RESOURCE_GROUP_NAME,
		verbose: config.isVerbose,
	});

	await ensureVmIsReachable(sshClient);

	const scriptsDir = await transferScriptsToVm(sshClient);

	// Bootstrap the environment with dependencies
	console.log('Running bootstrap script...');
	const bootstrapScriptPath = path.join(scriptsDir, 'bootstrap.sh');
	await sshClient.ssh(`chmod a+x ${bootstrapScriptPath} && ${bootstrapScriptPath}`);

	// Give some time for the VM to be ready
	await sleep(1000);

	if (config.n8nSetupToUse === 'all') {
		const availableSetups = readAvailableN8nSetups();

		for (const n8nSetup of availableSetups) {
			await runBenchmarkForN8nSetup({
				config,
				sshClient,
				scriptsDir,
				n8nSetup,
			});
		}
	} else {
		await runBenchmarkForN8nSetup({
			config,
			sshClient,
			scriptsDir,
			n8nSetup: config.n8nSetupToUse,
		});
	}
}

/**
 * @param {{ config: Config; sshClient: any; scriptsDir: string; n8nSetup: string; }} opts
 */
async function runBenchmarkForN8nSetup({ config, sshClient, scriptsDir, n8nSetup }) {
	console.log(`Running benchmarks for ${n8nSetup}...`);
	const runScriptPath = path.join(scriptsDir, 'runOnVm.mjs');

	const flags = {
		n8nDockerTag: config.n8nTag,
		benchmarkDockerTag: config.benchmarkTag,
		k6ApiToken: config.k6ApiToken,
	};

	const flagsString = Object.entries(flags)
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `--${key}=${value}`)
		.join(' ');

	await sshClient.ssh(`npx zx ${runScriptPath} ${flagsString} ${n8nSetup}`, {
		// Test run should always log its output
		verbose: true,
	});
}

async function ensureVmIsReachable(sshClient) {
	await sshClient.ssh('echo "VM is reachable"');
}

/**
 * @returns Path where the scripts are located on the VM
 */
async function transferScriptsToVm(sshClient) {
	await sshClient.ssh('rm -rf ~/n8n');

	await sshClient.ssh('git clone --depth=1 https://github.com/n8n-io/n8n.git');

	return '~/n8n/packages/@n8n/benchmark/scripts/runOnVm';
}

function readAvailableN8nSetups() {
	const setups = fs.readdirSync(paths.n8nSetupsDir);

	return setups;
}

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {string} n8nSetupToUse
 * @property {string} n8nTag
 * @property {string} benchmarkTag
 * @property {string} [k6ApiToken]
 *
 * @returns {Promise<Config>}
 */
async function parseAndValidateConfig() {
	const args = minimist(process.argv.slice(3), {
		boolean: ['debug', 'help'],
	});

	if (args.help) {
		printUsage();
		process.exit(0);
	}

	const n8nSetupToUse = await getAndValidateN8nSetup(args);
	const isVerbose = args.debug || false;
	const n8nTag = args.n8nTag || process.env.N8N_DOCKER_TAG || 'latest';
	const benchmarkTag = args.benchmarkTag || process.env.BENCHMARK_DOCKER_TAG || 'latest';
	const k6ApiToken = args.k6ApiToken || process.env.K6_API_TOKEN || undefined;

	return {
		isVerbose,
		n8nSetupToUse,
		n8nTag,
		benchmarkTag,
		k6ApiToken,
	};
}

/**
 * @param {minimist.ParsedArgs} args
 */
async function getAndValidateN8nSetup(args) {
	// Last parameter is the n8n setup to use
	const n8nSetupToUse = args._[args._.length - 1];
	if (!n8nSetupToUse || n8nSetupToUse === 'all') {
		return 'all';
	}

	const availableSetups = readAvailableN8nSetups();

	if (!availableSetups.includes(n8nSetupToUse)) {
		printUsage();
		process.exit(1);
	}

	return n8nSetupToUse;
}

function printUsage() {
	const availableSetups = readAvailableN8nSetups();

	console.log('Usage: zx scripts/runInCloud.mjs [n8n setup name]');
	console.log('   eg: zx scripts/runInCloud.mjs');
	console.log('');
	console.log('Options:');
	console.log(
		`  [n8n setup name]     Against which n8n setup to run the benchmarks. One of: ${['all', ...availableSetups].join(', ')}. Default is all`,
	);
	console.log('  --debug              Enable verbose output');
	console.log('  --n8nTag             Docker tag for n8n image. Default is latest');
	console.log('  --benchmarkTag       Docker tag for benchmark cli image. Default is latest');
	console.log(
		'  --k6ApiToken         API token for k6 cloud. Default is read from K6_API_TOKEN env var. If omitted, k6 cloud will not be used',
	);
	console.log('');
}

main().catch(console.error);
