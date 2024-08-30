#!/usr/bin/env zx
/**
 * Script to run benchmarks on the cloud benchmark environment.
 * This script will:
 * 	1. Provision a benchmark environment using Terraform.
 * 	2. Run the benchmarks on the VM.
 * 	3. Destroy the cloud environment.
 *
 * NOTE: Must be run in the root of the package.
 */
// @ts-check
import { sleep, which } from 'zx';
import path from 'path';
import { SshClient } from './clients/sshClient.mjs';
import { TerraformClient } from './clients/terraformClient.mjs';

/**
 * @typedef {Object} BenchmarkEnv
 * @property {string} vmName
 */

const RESOURCE_GROUP_NAME = 'n8n-benchmarking';

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {string[]} n8nSetupsToUse
 * @property {string} n8nTag
 * @property {string} benchmarkTag
 * @property {string} [k6ApiToken]
 *
 * @param {Config} config
 */
export async function runInCloud(config) {
	await ensureDependencies();

	const terraformClient = new TerraformClient({
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
	console.log(`Setting up the environment...`);

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

	for (const n8nSetup of config.n8nSetupsToUse) {
		await runBenchmarkForN8nSetup({
			config,
			sshClient,
			scriptsDir,
			n8nSetup,
		});
	}
}

/**
 * @param {{ config: Config; sshClient: any; scriptsDir: string; n8nSetup: string; }} opts
 */
async function runBenchmarkForN8nSetup({ config, sshClient, scriptsDir, n8nSetup }) {
	console.log(`Running benchmarks for ${n8nSetup}...`);
	const runScriptPath = path.join(scriptsDir, 'runForN8nSetup.mjs');

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
	await sshClient.ssh('rm -rf ~/n8n && git clone --depth=1 https://github.com/n8n-io/n8n.git');

	return '~/n8n/packages/@n8n/benchmark/scripts';
}
