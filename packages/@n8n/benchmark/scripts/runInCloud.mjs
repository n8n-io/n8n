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
import { $, sleep, tmpdir, which } from 'zx';
import path from 'path';
import { SshClient } from './sshClient.mjs';
import { TerraformClient } from './terraformClient.mjs';

const SSH_USER = 'benchmark';

const paths = {
	privateKeyPath: path.join(path.resolve('infra'), 'privatekey.pem'),
	runOnVmScriptDir: path.join(path.resolve('scripts'), 'runOnVm'),
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

		await runBenchmarksOnVm(config, benchmarkEnv.ip);
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
	} finally {
		await terraformClient.destroyEnvironment();
	}
}

async function ensureDependencies() {
	await which('terraform');
	await which('ssh');
	await which('scp');
	await which('tar');
}

/**
 *
 * @param {Config} config
 * @param {string} ip
 */
async function runBenchmarksOnVm(config, ip) {
	console.log(`Setting up the environment for ${config.n8nSetupToUse}...`);

	const sshClient = new SshClient({
		hostname: ip,
		username: SSH_USER,
		privateKeyPath: paths.privateKeyPath,
		verbose: config.isVerbose,
	});

	await ensureVmIsReachable(sshClient);

	await transferScriptsToVm(sshClient, config.isVerbose);

	// Bootstrap the environment with dependencies
	console.log('Running bootstrap script...');
	await sshClient.ssh('chmod a+x ~/bootstrap.sh && ~/bootstrap.sh');

	// Give some time for the VM to be ready
	await sleep(1000);

	console.log('Running benchmarks...');
	await sshClient.ssh(
		`npx zx ~/runOnVm.mjs --n8nDockerTag=${config.n8nTag} --benchmarkDockerTag=${config.benchmarkTag} ${config.n8nSetupToUse}`,
		{
			// Test run should always log its output
			verbose: true,
		},
	);
}

async function ensureVmIsReachable(sshClient) {
	await sshClient.ssh('echo "VM is reachable"');
}

async function transferScriptsToVm(sshClient, isVerbose) {
	const $$ = $({ verbose: isVerbose });

	const tmpDir = tmpdir();
	const archiveName = 'scriptSetup.tar.gz';
	const tarballPath = path.join(tmpDir, archiveName);

	await $$`tar -czf ${tarballPath} -C ${paths.runOnVmScriptDir} .`;

	await sshClient.scp(tarballPath, `~/${archiveName}`);

	await sshClient.ssh(`tar -xzf ~/${archiveName} -C ~/`);
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
 *
 * @returns {Promise<Config>}
 */
async function parseAndValidateConfig() {
	const args = minimist(process.argv.slice(2), {
		boolean: ['debug'],
	});

	const n8nSetupToUse = await getAndValidateN8nSetup(args);
	const isVerbose = args.debug || false;
	const n8nTag = args.n8nTag || process.env.N8N_DOCKER_TAG || 'latest';
	const benchmarkTag = args.benchmarkTag || process.env.BENCHMARK_DOCKER_TAG || 'latest';

	return {
		isVerbose,
		n8nSetupToUse,
		n8nTag,
		benchmarkTag,
	};
}

/**
 * @param {minimist.ParsedArgs} args
 */
async function getAndValidateN8nSetup(args) {
	// Last parameter is the n8n setup to use
	const n8nSetupToUse = args._[args._.length - 1];

	if (!n8nSetupToUse) {
		printUsage();
		process.exit(1);
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

	console.log('Usage: zx scripts/runInCloud.mjs <n8n setup name>');
	console.log('   eg: zx scripts/runInCloud.mjs sqlite');
	console.log('');
	console.log('Options:');
	console.log('  --debug              Enable verbose output');
	console.log('  --n8nTag             Docker tag for n8n image. Default is latest');
	console.log('  --benchmarkTag       Docker tag for benchmark cli image. Default is latest');
	console.log('');
	console.log('Available setups:');
	console.log(`  ${availableSetups.join(', ')}`);
}

main().catch(console.error);
