#!/usr/bin/env node
// The laptop sends this file over SSH as one standalone module. Do not import sibling files.
// It also works in an older Codespace checkout.
import { execFileSync, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const quote = (value) => `'${value.replaceAll("'", "'\\''")}'`;

function readJson(file) {
	try {
		return JSON.parse(readFileSync(file, 'utf8'));
	} catch (error) {
		if (error.code === 'ENOENT') return undefined;
		throw new Error(`Cannot read ${file}. Restore or remove this state file, then retry.`);
	}
}

function saveJson(file, value) {
	writeFileSync(`${file}.tmp`, JSON.stringify(value), { mode: 0o600 });
	renameSync(`${file}.tmp`, file);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		stdio: ['ignore', 'inherit', 'inherit'],
		...options,
	});
	if (result.error || result.status !== 0) {
		throw new Error(`${command} failed. Check the output above, then retry.`);
	}
}

async function freePort() {
	const server = createServer();
	await new Promise((resolve, reject) => {
		server.once('error', reject);
		server.listen(0, '127.0.0.1', resolve);
	});
	const { port } = server.address();
	await new Promise((resolve) => server.close(resolve));
	return port;
}

async function request(server, path, directory, options = {}, timeout = 60_000) {
	return await fetch(`http://127.0.0.1:${server.port}${path}`, {
		...options,
		headers: {
			authorization: `Basic ${Buffer.from(`opencode:${server.password}`).toString('base64')}`,
			'x-opencode-directory': encodeURIComponent(directory),
			'content-type': 'application/json',
		},
		signal: AbortSignal.timeout(timeout),
	});
}

async function health(server, directory) {
	try {
		const response = await request(server, '/global/health', directory, {}, 3000);
		if (!response.ok) return undefined;
		const result = await response.json();
		return result.healthy === true && typeof result.version === 'string' ? result : undefined;
	} catch {
		return undefined;
	}
}

const serverFile = (stateDir) => join(stateDir, 'server.json');

async function runningServer({ stateDir, mainDirectory }) {
	const previous = readJson(serverFile(stateDir));
	return previous && (await health(previous, mainDirectory)) ? previous : undefined;
}

async function startServer({ stateDir, mainDirectory, workspaces }) {
	const tmuxSession = 'n8n-opencode-server';
	if (spawnSync('tmux', ['has-session', '-t', `=${tmuxSession}`]).status === 0) {
		throw new Error(
			`OpenCode is still starting or is unhealthy. Check ${stateDir}/server.log, then retry. The running server was not stopped.`,
		);
	}

	const server = { port: await freePort(), password: randomBytes(32).toString('hex') };
	const launcher = join(stateDir, 'serve.sh');
	// Read secrets when the server starts. Do not store provider keys in the launcher.
	writeFileSync(
		launcher,
		[
			'#!/bin/bash',
			'. /usr/local/lib/codespaces-env.sh 2>/dev/null || true',
			'unset AGENT_WORKER_TOKEN N8N_DEQUEUE_URL SLACK_BOT_TOKEN',
			`export TURBO_CACHE_DIR=${quote(join(workspaces, '.turbo-cache'))}`,
			`[ -d "$TURBO_CACHE_DIR" ] || cp -r ${quote(join(mainDirectory, '.turbo/cache'))} "$TURBO_CACHE_DIR" 2>/dev/null || mkdir -p "$TURBO_CACHE_DIR"`,
			`export OPENCODE_SERVER_USERNAME=opencode OPENCODE_SERVER_PASSWORD=${quote(server.password)}`,
			`export OPENCODE_CONFIG_CONTENT=${quote(
				JSON.stringify({
					enabled_providers: ['openrouter'],
					provider: { openrouter: { options: { apiKey: '{env:OPENROUTER_API_KEY}' } } },
				}),
			)}`,
			`cd ${quote(mainDirectory)} || exit 1`,
			`exec opencode serve --hostname 127.0.0.1 --port ${server.port} >> ${quote(join(stateDir, 'server.log'))} 2>&1`,
			'',
		].join('\n'),
		{ mode: 0o600 },
	);
	saveJson(serverFile(stateDir), server);
	run('tmux', ['new-session', '-d', '-s', tmuxSession, `bash ${quote(launcher)}`]);
	console.error('Starting the OpenCode server…');
	for (let attempt = 0; attempt < 60; attempt++) {
		if (await health(server, mainDirectory)) return server;
		await delay(500);
	}
	throw new Error(`OpenCode did not become ready. Check ${stateDir}/server.log.`);
}

function prepareWorkspace({ name, directory, mainDirectory, stateDir }) {
	if (!existsSync(directory)) {
		console.error(`Creating worktree ${directory}…`);
		const branch = `session/${name}`;
		const exists =
			spawnSync('git', [
				'-C',
				mainDirectory,
				'show-ref',
				'--verify',
				'--quiet',
				`refs/heads/${branch}`,
			]).status === 0;
		run(
			'git',
			[
				'-C',
				mainDirectory,
				'worktree',
				'add',
				...(exists ? [] : ['-b', branch]),
				directory,
				...(exists ? [branch] : []),
			],
			{ stdio: ['ignore', 2, 2] },
		);
	}
	// A failed install must be retried even if it left a node_modules directory.
	const installed = join(stateDir, `${name}.installed`);
	const installing = join(stateDir, `${name}.installing`);
	if (
		!existsSync(join(directory, 'node_modules')) ||
		existsSync(installing) ||
		(name !== 'agent' && !existsSync(installed))
	) {
		console.error(`Installing dependencies in ${directory}…`);
		writeFileSync(installing, '', { mode: 0o600 });
		run('pnpm', ['install'], { cwd: directory, stdio: ['ignore', 2, 2] });
		writeFileSync(installed, '', { mode: 0o600 });
		rmSync(installing);
	}
}

async function ensureSession({ name, fresh, directory, stateDir, server }) {
	const sessionFile = join(stateDir, `${name}.session.json`);
	const saved = fresh ? undefined : readJson(sessionFile);
	let session;
	if (saved) {
		const response = await request(server, `/session/${encodeURIComponent(saved.id)}`, directory);
		if (response.ok) session = await response.json();
		else if (response.status !== 404)
			throw new Error(`Cannot resume OpenCode session (${response.status}).`);
		if (session && session.directory !== directory)
			throw new Error('The saved OpenCode session belongs to another directory. Use --new.');
	}
	if (!session) {
		const response = await request(server, '/session', directory, {
			method: 'POST',
			body: JSON.stringify({ title: `n8n: ${name}` }),
		});
		if (!response.ok) throw new Error(`Cannot create OpenCode session (${response.status}).`);
		session = await response.json();
		if (typeof session.id !== 'string' || session.directory !== directory)
			throw new Error('OpenCode returned an invalid session.');
		saveJson(sessionFile, { id: session.id });
	}
	return session.id;
}

export async function prepareOpenCode({
	name = 'agent',
	fresh = false,
	workspaces = '/workspaces',
} = {}) {
	const stateDir = join(workspaces, '.n8n-opencode');
	const mainDirectory = join(workspaces, 'n8n');
	if (!/^\w[\w-]*$/.test(name)) throw new Error('Invalid OpenCode workspace name.');
	mkdirSync(stateDir, { recursive: true, mode: 0o700 });
	const directory = name === 'agent' ? mainDirectory : join(workspaces, `wt-${name}`);
	let server = await runningServer({ stateDir, mainDirectory });
	// On a cold start, fail before the worktree install when OpenCode is missing on the Codespace.
	if (!server) execFileSync('opencode', ['--version'], { stdio: ['ignore', 'pipe', 'inherit'] });
	prepareWorkspace({ name, directory, mainDirectory, stateDir });
	server ??= await startServer({ stateDir, mainDirectory, workspaces });
	const sessionID = await ensureSession({ name, fresh, directory, stateDir, server });
	// Only the parent process reads stdout. Never send this record to terminal output.
	return { ...server, directory, sessionID };
}

if (process.argv[1] === '-') {
	try {
		const [name, fresh] = process.argv.slice(2);
		console.log(JSON.stringify(await prepareOpenCode({ name, fresh: fresh === 'true' })));
	} catch (error) {
		console.error(error.message);
		process.exitCode = 1;
	}
}
