#!/usr/bin/env zx
/**
 * Script to run benchmarks either on the cloud benchmark environment or locally.
 *
 * NOTE: Must be run in the root of the package.
 *
 * Usage:
 * 	 zx scripts/run.mjs
 *
 */
// @ts-check
import fs from 'fs';
import minimist from 'minimist';
import path from 'path';
import { runInCloud } from './runInCloud.mjs';
import { runLocally } from './runLocally.mjs';

const paths = {
	n8nSetupsDir: path.join(path.resolve('scripts'), 'n8nSetups'),
};

async function main() {
	const config = await parseAndValidateConfig();

	const n8nSetupsToUse =
		config.n8nSetupToUse === 'all' ? readAvailableN8nSetups() : [config.n8nSetupToUse];

	console.log('Using n8n tag', config.n8nTag);
	console.log('Using benchmark cli tag', config.benchmarkTag);
	console.log('Using environment', config.env);
	console.log('Using n8n setups', n8nSetupsToUse.join(', '));
	console.log('');

	if (config.env === 'cloud') {
		await runInCloud({
			benchmarkTag: config.benchmarkTag,
			isVerbose: config.isVerbose,
			k6ApiToken: config.k6ApiToken,
			n8nTag: config.n8nTag,
			n8nSetupsToUse,
		});
	} else {
		await runLocally({
			benchmarkTag: config.benchmarkTag,
			isVerbose: config.isVerbose,
			k6ApiToken: config.k6ApiToken,
			n8nTag: config.n8nTag,
			runDir: config.runDir,
			n8nSetupsToUse,
		});
	}
}

function readAvailableN8nSetups() {
	const setups = fs.readdirSync(paths.n8nSetupsDir);

	return setups;
}

/**
 * @typedef {Object} Config
 * @property {boolean} isVerbose
 * @property {'cloud' | 'local'} env
 * @property {string} n8nSetupToUse
 * @property {string} n8nTag
 * @property {string} benchmarkTag
 * @property {string} [k6ApiToken]
 * @property {string} [runDir]
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
	const runDir = args.runDir || undefined;
	const env = args.env || 'local';

	if (!env) {
		printUsage();
		process.exit(1);
	}

	return {
		isVerbose,
		env,
		n8nSetupToUse,
		n8nTag,
		benchmarkTag,
		k6ApiToken,
		runDir,
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

	console.log(`Usage: zx scripts/${path.basename(__filename)} [n8n setup name]`);
	console.log(`   eg: zx scripts/${path.basename(__filename)}`);
	console.log('');
	console.log('Options:');
	console.log(
		`  [n8n setup name]     Against which n8n setup to run the benchmarks. One of: ${['all', ...availableSetups].join(', ')}. Default is all`,
	);
	console.log(
		'  --env                Env where to run the benchmarks. Either cloud or local. Default is local.',
	);
	console.log('  --debug              Enable verbose output');
	console.log('  --n8nTag             Docker tag for n8n image. Default is latest');
	console.log('  --benchmarkTag       Docker tag for benchmark cli image. Default is latest');
	console.log(
		'  --k6ApiToken         API token for k6 cloud. Default is read from K6_API_TOKEN env var. If omitted, k6 cloud will not be used',
	);
	console.log(
		'  --runDir         Directory to share with the n8n container for storing data. Needed only for local runs.',
	);
	console.log('');
}

main().catch(console.error);
