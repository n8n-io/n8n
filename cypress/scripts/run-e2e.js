#!/usr/bin/env node
const { spawn } = require('child_process');
const { mkdirSync, mkdtempSync } = require('fs');
const { tmpdir } = require('os');
const { join } = require('path');

function runTests(options) {
	const testsDir = join(tmpdir(), 'n8n-e2e/');
	mkdirSync(testsDir, { recursive: true });

	const userFolder = mkdtempSync(testsDir);

	process.env.N8N_USER_FOLDER = userFolder;
	process.env.E2E_TESTS = 'true';
	process.env.NODE_OPTIONS = '--dns-result-order=ipv4first';

	// Automatically pass through any N8N_ENV_FEAT_* environment variables
	Object.keys(process.env).forEach((key) => {
		if (key.startsWith('N8N_ENV_FEAT_')) {
			// These are already in process.env and will be inherited by the spawned process
			console.log(`Passing through environment feature flag: ${key}=${process.env[key]}`);
		}
	});

	if (options.customEnv) {
		Object.keys(options.customEnv).forEach((key) => {
			process.env[key] = options.customEnv[key];
		});
	}

	const cmd = `start-server-and-test ${options.startCommand} ${options.url} '${options.testCommand}'`;
	const testProcess = spawn(cmd, [], {
		stdio: 'inherit',
		shell: true,
		env: process.env, // TODO: Maybe pass only the necessary environment variables instead of all
	});

	// Listen for termination signals to properly kill the test process
	process.on('SIGINT', () => {
		testProcess.kill('SIGINT');
	});

	process.on('SIGTERM', () => {
		testProcess.kill('SIGTERM');
	});

	testProcess.on('exit', (code) => {
		process.exit(code);
	});
}

const scenario = process.argv[2];

switch (scenario) {
	case 'ui':
		runTests({
			startCommand: 'start',
			url: 'http://localhost:5678/favicon.ico',
			testCommand: 'cypress open',
		});
		break;
	case 'dev':
		runTests({
			startCommand: 'develop',
			url: 'http://localhost:8080/favicon.ico',
			testCommand: 'cypress open',
			customEnv: {
				CYPRESS_BASE_URL: 'http://localhost:8080',
			},
		});
		break;
	case 'all':
		const specSuiteFilter = process.argv[3];
		const specParam = specSuiteFilter ? ` --spec **/*${specSuiteFilter}*` : '';

		runTests({
			startCommand: 'start',
			url: 'http://localhost:5678/favicon.ico',
			testCommand: `cypress run --headless ${specParam}`,
		});
		break;
	case 'debugFlaky': {
		const filter = process.argv[3];
		const burnCount = process.argv[4] || 5;

		const envArgs = [`burn=${burnCount}`];

		if (filter) {
			envArgs.push(`grep=${filter}`);
			envArgs.push(`grepFilterSpecs=true`);
		}

		const envString = envArgs.join(',');
		const testCommand = `cypress run --headless --env "${envString}"`;

		console.log(`Executing test command: ${testCommand}`);

		runTests({
			startCommand: 'start',
			url: 'http://localhost:5678/favicon.ico',
			testCommand: testCommand,
			failFast: true,
		});
		break;
	}
	default:
		console.error('Unknown scenario');
		process.exit(1);
}
