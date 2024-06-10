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
	process.env.VUE_APP_MAX_PINNED_DATA_SIZE = `${16 * 1024}`;

	if (options.customEnv) {
		Object.keys(options.customEnv).forEach((key) => {
			process.env[key] = options.customEnv[key];
		});
	}

	const cmd = `start-server-and-test ${options.startCommand} ${options.url} '${options.testCommand}'`;
	const testProcess = spawn(cmd, [], { stdio: 'inherit', shell: true });

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
			startCommand: 'dev',
			url: 'http://localhost:8080/favicon.ico',
			testCommand: 'cypress open',
			customEnv: {
				CYPRESS_BASE_URL: 'http://localhost:8080',
			},
		});
		break;
	case 'all':
		runTests({
			startCommand: 'start',
			url: 'http://localhost:5678/favicon.ico',
			testCommand: 'cypress run --headless',
		});
		break;
	default:
		console.error('Unknown scenario');
		process.exit(1);
}
