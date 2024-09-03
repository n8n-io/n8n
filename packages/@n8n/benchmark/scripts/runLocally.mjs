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
import { $ } from 'zx';
import path from 'path';

/**
 * @typedef {Object} BenchmarkEnv
 * @property {string} vmName
 */

const paths = {
	scriptsDir: path.join(path.resolve('scripts')),
};

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {string[]} n8nSetupsToUse
 * @property {string} n8nTag
 * @property {string} benchmarkTag
 * @property {string} [runDir]
 * @property {string} [k6ApiToken]
 * @property {string} [n8nLicenseCert]
 *
 * @param {Config} config
 */
export async function runLocally(config) {
	const runScriptPath = path.join(paths.scriptsDir, 'runForN8nSetup.mjs');

	const flags = Object.entries({
		n8nDockerTag: config.n8nTag,
		benchmarkDockerTag: config.benchmarkTag,
		runDir: config.runDir,
	})
		.filter(([, value]) => value !== undefined)
		.map(([key, value]) => `--${key}=${value}`);

	try {
		for (const n8nSetup of config.n8nSetupsToUse) {
			console.log(`Running benchmarks for n8n setup: ${n8nSetup}`);

			await $({
				env: {
					...process.env,
					K6_API_TOKEN: config.k6ApiToken,
					N8N_LICENSE_CERT: config.n8nLicenseCert,
				},
			})`npx ${runScriptPath} ${flags} ${n8nSetup}`;
		}
	} catch (error) {
		console.error('An error occurred while running the benchmarks:');
		console.error(error);
	}
}
