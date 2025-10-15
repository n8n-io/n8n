#!/usr/bin/env zx
/**
 * This script runs the benchmarks for the given n8n setup.
 */
// @ts-check
import path from 'path';
import { $, argv, fs } from 'zx';
import { DockerComposeClient } from './clients/docker-compose-client.mjs';
import { flagsObjectToCliArgs } from './utils/flags.mjs';

const paths = {
	n8nSetupsDir: path.join(__dirname, 'n8n-setups'),
	mockApiDataPath: path.join(__dirname, 'mock-api'),
};

const N8N_ENCRYPTION_KEY = 'very-secret-encryption-key';

async function main() {
	const [n8nSetupToUse] = argv._;
	validateN8nSetup(n8nSetupToUse);

	const composeFilePath = path.join(paths.n8nSetupsDir, n8nSetupToUse);
	const setupScriptPath = path.join(paths.n8nSetupsDir, n8nSetupToUse, 'setup.mjs');
	const n8nTag = argv.n8nDockerTag || process.env.N8N_DOCKER_TAG || 'latest';
	const benchmarkTag = argv.benchmarkDockerTag || process.env.BENCHMARK_DOCKER_TAG || 'latest';
	const k6ApiToken = argv.k6ApiToken || process.env.K6_API_TOKEN || undefined;
	const resultWebhookUrl =
		argv.resultWebhookUrl || process.env.BENCHMARK_RESULT_WEBHOOK_URL || undefined;
	const resultWebhookAuthHeader =
		argv.resultWebhookAuthHeader || process.env.BENCHMARK_RESULT_WEBHOOK_AUTH_HEADER || undefined;
	const baseRunDir = argv.runDir || process.env.RUN_DIR || '/n8n';
	const n8nLicenseCert = argv.n8nLicenseCert || process.env.N8N_LICENSE_CERT || undefined;
	const n8nLicenseActivationKey = process.env.N8N_LICENSE_ACTIVATION_KEY || undefined;
	const n8nLicenseTenantId = argv.n8nLicenseTenantId || process.env.N8N_LICENSE_TENANT_ID || '1';
	const envTag = argv.env || 'local';
	const vus = argv.vus;
	const duration = argv.duration;

	const hasN8nLicense = !!n8nLicenseCert || !!n8nLicenseActivationKey;
	if (n8nSetupToUse === 'scaling-multi-main' && !hasN8nLicense) {
		console.error(
			'n8n license is required to run the multi-main scaling setup. Please provide N8N_LICENSE_CERT or N8N_LICENSE_ACTIVATION_KEY (and N8N_LICENSE_TENANT_ID if needed)',
		);
		process.exit(1);
	}

	if (!fs.existsSync(baseRunDir)) {
		console.error(
			`The run directory "${baseRunDir}" does not exist. Please specify a valid directory using --runDir`,
		);
		process.exit(1);
	}

	const runDir = path.join(baseRunDir, n8nSetupToUse);
	fs.emptyDirSync(runDir);

	const dockerComposeClient = new DockerComposeClient({
		$: $({
			cwd: composeFilePath,
			verbose: true,
			env: {
				PATH: process.env.PATH,
				N8N_VERSION: n8nTag,
				N8N_LICENSE_CERT: n8nLicenseCert,
				N8N_LICENSE_ACTIVATION_KEY: n8nLicenseActivationKey,
				N8N_LICENSE_TENANT_ID: n8nLicenseTenantId,
				N8N_ENCRYPTION_KEY,
				BENCHMARK_VERSION: benchmarkTag,
				K6_API_TOKEN: k6ApiToken,
				BENCHMARK_RESULT_WEBHOOK_URL: resultWebhookUrl,
				BENCHMARK_RESULT_WEBHOOK_AUTH_HEADER: resultWebhookAuthHeader,
				RUN_DIR: runDir,
				MOCK_API_DATA_PATH: paths.mockApiDataPath,
			},
		}),
	});

	// Run the setup script if it exists
	if (fs.existsSync(setupScriptPath)) {
		const setupScript = await import(setupScriptPath);
		await setupScript.setup({ runDir });
	}

	try {
		await dockerComposeClient.$('up', '-d', '--remove-orphans', 'n8n');

		const tags = Object.entries({
			Env: envTag,
			N8nVersion: n8nTag,
			N8nSetup: n8nSetupToUse,
		})
			.map(([key, value]) => `${key}=${value}`)
			.join(',');

		const cliArgs = flagsObjectToCliArgs({
			scenarioNamePrefix: n8nSetupToUse,
			vus,
			duration,
			tags,
		});

		await dockerComposeClient.$('run', 'benchmark', 'run', ...cliArgs);
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error.message);
		console.error('');
		await printContainerStatus(dockerComposeClient);
		throw error;
	} finally {
		await dumpLogs(dockerComposeClient);
		await dockerComposeClient.$('down');
	}
}

async function printContainerStatus(dockerComposeClient) {
	console.error('Container statuses:');
	await dockerComposeClient.$('ps', '-a');
}

async function dumpLogs(dockerComposeClient) {
	console.info('Container logs:');
	await dockerComposeClient.$('logs');
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
