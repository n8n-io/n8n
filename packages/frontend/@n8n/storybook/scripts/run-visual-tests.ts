/**
 * Runs the visual tests with the browser in the pinned Playwright container.
 *
 * Usage: pnpm --filter @n8n/storybook test:visual [vitest arguments], for example `-u`.
 *
 * Vitest and Vite run on this computer. Chromium runs in the container, so each
 * screenshot comes from the same Linux browser and fonts on every computer and
 * in CI. A local `-u` then writes the same reference images that CI compares.
 */
import { type ChildProcess, spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/** Bump with the `playwright` catalog version, then run `test:visual -u`. */
const PLAYWRIGHT_IMAGE =
	'mcr.microsoft.com/playwright:v1.62.1-noble@sha256:dcc5531e97840b9b5e794f2814476b21571c5124a3fca2267d73041f56e7580e';
const CONTAINER_LABEL = 'n8n.visual-tests=1';
/** Finds this run's container, also one that `docker run` made while a signal stopped it. */
const RUN_LABEL = `n8n.visual-tests.run=${randomUUID()}`;
const SERVER_PORT = 3000;
/** `vitest.visual.config.ts` reads the browser server address from this variable. */
const WS_ENDPOINT_ENV = 'N8N_VISUAL_TESTS_WS_ENDPOINT';
/** The first run downloads the `playwright` package in the container. */
const SERVER_START_TIMEOUT_MS = 180_000;

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let currentChild: ChildProcess | undefined;

class VisualTestsError extends Error {}

function fail(message: string): never {
	throw new VisualTestsError(message);
}

function installedPlaywrightVersion(): string {
	const manifest: unknown = JSON.parse(
		readFileSync(path.join(packageDir, 'node_modules/playwright/package.json'), 'utf8'),
	);
	if (
		typeof manifest !== 'object' ||
		manifest === null ||
		!('version' in manifest) ||
		typeof manifest.version !== 'string'
	) {
		fail('Cannot read the version of the installed `playwright` package.');
	}
	return manifest.version;
}

function checkImageVersion() {
	const imageVersion = /:v(\d+\.\d+\.\d+)-/.exec(PLAYWRIGHT_IMAGE)?.[1];
	const installedVersion = installedPlaywrightVersion();
	if (imageVersion !== installedVersion) {
		fail(
			`The Playwright image is ${imageVersion ?? 'unknown'}, but the installed \`playwright\` package is ${installedVersion}. ` +
				'Set PLAYWRIGHT_IMAGE in scripts/run-visual-tests.ts to the same version, then run `test:visual -u`.',
		);
	}
}

function checkDocker() {
	if (spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0) {
		fail('The visual tests need a running Docker engine. Start Docker, then run them again.');
	}
}

/** Runs a command to its end and gives its output. Signals reach it through `currentChild`. */
async function run(command: string, args: string[]) {
	return await new Promise<{ code: number | null; stdout: string; stderr: string }>(
		(resolve, reject) => {
			const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
			currentChild = child;
			let stdout = '';
			let stderr = '';
			child.stdout?.on('data', (chunk: Buffer) => (stdout += chunk.toString()));
			child.stderr?.on('data', (chunk: Buffer) => (stderr += chunk.toString()));
			child.on('error', reject);
			child.on('close', (code) => {
				currentChild = undefined;
				resolve({ code, stdout, stderr });
			});
		},
	);
}

function removeContainers() {
	const ids = spawnSync('docker', ['ps', '--all', '--quiet', '--filter', `label=${RUN_LABEL}`], {
		encoding: 'utf8',
	})
		.stdout?.split('\n')
		.filter(Boolean);
	if (ids?.length) spawnSync('docker', ['rm', '--force', ...ids], { stdio: 'ignore' });
}

async function startBrowserServer(): Promise<string> {
	const started = await run('docker', [
		'run',
		'--detach',
		// No `--rm`: when the server fails to start, its logs must stay readable.
		// `removeContainers()` removes the container at the end of every run.
		'--init',
		// Playwright's advice for Chromium in Docker, against out-of-memory crashes.
		'--ipc=host',
		'--label',
		CONTAINER_LABEL,
		'--label',
		RUN_LABEL,
		'--publish',
		`127.0.0.1::${SERVER_PORT}`,
		PLAYWRIGHT_IMAGE,
		'npx',
		'-y',
		`playwright@${installedPlaywrightVersion()}`,
		'run-server',
		'--port',
		String(SERVER_PORT),
		'--host',
		'0.0.0.0',
	]);
	const containerId = started.stdout.trim();
	if (started.code !== 0 || !containerId) {
		fail(`Cannot start the Playwright container:\n${started.stderr}`);
	}

	const deadline = Date.now() + SERVER_START_TIMEOUT_MS;
	while (Date.now() < deadline) {
		const logs = await run('docker', ['logs', containerId]);
		const output = `${logs.stdout}${logs.stderr}`;
		const state = await run('docker', ['inspect', '--format', '{{.State.Status}}', containerId]);
		if (logs.code !== 0 || state.stdout.trim() !== 'running') {
			fail(`The Playwright container stopped before its server started:\n${output}`);
		}
		if (output.includes('Listening on')) {
			const port = await run('docker', ['port', containerId, String(SERVER_PORT)]);
			const hostPort = /:(\d+)\s*$/m.exec(port.stdout)?.[1];
			if (!hostPort) fail('Cannot read the published port of the Playwright container.');
			return `ws://127.0.0.1:${hostPort}/`;
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	fail(`The Playwright server did not start in ${SERVER_START_TIMEOUT_MS / 1000} s.`);
}

async function runVitest(wsEndpoint: string, args: string[]): Promise<number> {
	return await new Promise((resolve, reject) => {
		const child = spawn(
			process.execPath,
			[
				path.join(packageDir, 'node_modules/vitest/vitest.mjs'),
				'run',
				'--config',
				'vitest.visual.config.ts',
				...args,
			],
			{ cwd: packageDir, stdio: 'inherit', env: { ...process.env, [WS_ENDPOINT_ENV]: wsEndpoint } },
		);
		currentChild = child;
		child.on('error', reject);
		child.on('close', (code) => {
			currentChild = undefined;
			resolve(code ?? 1);
		});
	});
}

/** Stops the running command, waits until it exits, then removes the container. */
function stop(signal: NodeJS.Signals, exitCode: number) {
	const child = currentChild;
	const exit = () => {
		removeContainers();
		process.exit(exitCode);
	};
	if (child?.exitCode !== null || child.signalCode !== null) {
		exit();
		return;
	}
	child.once('close', exit);
	child.kill(signal);
	setTimeout(() => child.kill('SIGKILL'), 5_000).unref();
}

process.on('SIGINT', () => stop('SIGINT', 130));
process.on('SIGTERM', () => stop('SIGTERM', 143));

const args = process.argv.slice(2);
// pnpm passes a leading `--` through to the script.
if (args[0] === '--') args.shift();

try {
	checkImageVersion();
	checkDocker();
	const wsEndpoint = await startBrowserServer();
	process.exitCode = await runVitest(wsEndpoint, args);
} catch (error) {
	if (!(error instanceof VisualTestsError)) throw error;
	console.error(error.message);
	process.exitCode = 1;
} finally {
	removeContainers();
}
