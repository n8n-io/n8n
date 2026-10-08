import { mkdir, readFile, rm, stat, utimes, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import {
	CODING_TIME_LIMIT_EXIT_CODE,
	buildLaunchCommand,
	buildLaunchScript,
	buildStatusCommand,
	buildStopCommand,
	type CodingProcessName,
} from '../agent-coding-scripts';
import { parseCodingSessionsOutput, parseCodingStatusOutput } from '../agent-coding-status';
import {
	createGitRepo,
	createShallowClone,
	createToolDir,
	freePort,
	killProcessGroup,
	makeTempDir,
	processGroupAlive,
	runBash,
	waitFor,
} from './test-utils/coding-sandbox';

// These tests run the generated scripts with the real bash, Node.js and Git, as the sandbox does.
// Every launched process group is killed in afterEach.
const launched: number[] = [];
let workspace: string;
let meta: string;

beforeEach(async () => {
	workspace = await makeTempDir('n8n-coding-status-');
	meta = join(workspace, '.coding');
	await mkdir(meta, { recursive: true });
});

afterEach(async () => {
	for (const pgid of launched.splice(0)) killProcessGroup(pgid);
	await rm(workspace, { recursive: true, force: true });
});

async function launch(
	name: CodingProcessName,
	command: string,
	options: { timeLimitSeconds?: number; metaDir?: string; beforeLaunch?: string } = {},
): Promise<number> {
	const metaDir = options.metaDir ?? meta;
	const script = join(metaDir, `${name}.sh`);
	await writeFile(
		script,
		buildLaunchScript({
			workspaceRoot: workspace,
			meta: metaDir,
			name,
			command,
			timeLimitSeconds: options.timeLimitSeconds,
		}),
	);
	const result = await runBash(
		buildLaunchCommand({ meta: metaDir, name, script, beforeLaunch: options.beforeLaunch }),
	);
	expect(result).toMatchObject({ code: 0, stderr: '' });
	const pid = Number(await readFile(join(metaDir, `${name}.pid`), 'utf8'));
	launched.push(pid);
	return pid;
}

/** Waits for the first beat of the monitor. The script has set its traps by then. */
async function waitForMonitor(name: CodingProcessName) {
	const heartbeat = join(meta, `${name}.heartbeat`);
	const launcherBeat = (await stat(heartbeat)).mtimeMs;
	await waitFor(async () => ((await stat(heartbeat)).mtimeMs !== launcherBeat ? true : undefined));
}

async function readStatus(port = 1, sessionId?: string) {
	const result = await runBash(
		buildStatusCommand({
			workspaceRoot: workspace,
			port,
			probePath: '/',
			mode: 'status',
			sessionId,
		}),
	);
	expect(result.stderr).toBe('');
	return parseCodingStatusOutput(result.stdout);
}

async function readFacts() {
	const result = await runBash(
		buildStatusCommand({ workspaceRoot: workspace, port: 1, probePath: '/', mode: 'status' }),
	);
	return JSON.parse(result.stdout) as { incarnation: string };
}

const serverCommand = (port: number) =>
	`node -e "require('http').createServer((request, response) => response.end('ok')).listen(${port}, '127.0.0.1')"`;

describe('coding status and stop scripts in a real shell', () => {
	it('reports phase, changes, dirty files and a live app, and stop ends the app process group', async () => {
		const repo = join(workspace, 'repo');
		await createGitRepo(repo, { 'app.txt': 'original\n' });
		await writeFile(join(repo, 'app.txt'), 'changed\n');
		await writeFile(join(repo, 'new file.txt'), 'one\ntwo\r\nthree');
		const port = await freePort();

		const pgid = await launch('app', serverCommand(port));
		const running = await waitFor(async () => {
			const status = await readStatus(port);
			return status.app === 'running' ? status : undefined;
		});

		expect(running).toEqual({
			phase: 'ready',
			branch: 'main',
			changes: [
				{ path: 'app.txt', status: 'M', additions: 1, deletions: 1 },
				{ path: 'new file.txt', status: '??', additions: 3, deletions: 0 },
			],
			uncommittedChanges: 2,
			uncommittedPaths: ['app.txt', 'new file.txt'],
			app: 'running',
			check: 'not_started',
			setupExitCode: null,
			checkExitCode: null,
		});
		expect(await readFile(join(meta, 'app.started'), 'utf8')).toBe((await readFacts()).incarnation);
		expect(processGroupAlive(pgid)).toBe(true);

		const stop = await runBash(buildStopCommand(workspace, meta, false));

		expect(stop).toMatchObject({ code: 0, stderr: '' });
		expect(processGroupAlive(pgid)).toBe(false);
		expect(await readFile(join(meta, 'app.stopped'), 'utf8')).toBe('stopped');
		const exitCode = await waitFor(
			async () => (await readFile(join(meta, 'app.exit'), 'utf8').catch(() => '')) || undefined,
		);
		expect(exitCode).toBe('143');
		expect((await readStatus(port)).app).toBe('stopped');
	}, 30_000);

	it('reports a running app as starting until it answers the probe', async () => {
		await createGitRepo(join(workspace, 'repo'), { 'app.txt': 'original\n' });
		const port = await freePort();

		await launch('app', `sleep 2\n${serverCommand(port)}`);

		expect((await readStatus(port)).app).toBe('starting');
		await waitFor(async () => ((await readStatus(port)).app === 'running' ? true : undefined));
	}, 30_000);

	it('stops an app that was launched a moment before', async () => {
		const pgid = await launch('app', 'sleep 30');

		const stop = await runBash(buildStopCommand(workspace, meta, false));

		expect(stop).toMatchObject({ code: 0, stderr: '' });
		await waitFor(async () => (processGroupAlive(pgid) ? undefined : true), 5_000);
		expect((await readStatus()).app).toBe('stopped');
	}, 30_000);

	it('stops an app that ignores SIGTERM with SIGKILL', async () => {
		const pgid = await launch('app', "trap '' TERM\nsleep 30");
		await waitForMonitor('app');

		const stop = await runBash(buildStopCommand(workspace, meta, false));

		expect(stop.code).toBe(0);
		expect(processGroupAlive(pgid)).toBe(false);
	}, 30_000);

	it('does not stop an app that an earlier sandbox run started', async () => {
		const pgid = await launch('app', 'sleep 30');
		// After a restart the stored PID can belong to an unrelated process group.
		await writeFile(join(meta, 'app.started'), 'another-boot:1');

		const stop = await runBash(buildStopCommand(workspace, meta, false));

		expect(stop.code).toBe(0);
		expect(processGroupAlive(pgid)).toBe(true);
		expect(await readFile(join(meta, 'app.stopped'), 'utf8')).toBe('stopped');
		expect((await readStatus()).app).toBe('stopped');
	}, 30_000);

	it('stops the apps of all sessions with the all scope', async () => {
		const sessionMeta = join(meta, 'sessions', 'b0f2d2a8-5ab8-4d3c-9d6a-2c0f8a0d4c11');
		await mkdir(sessionMeta, { recursive: true });
		const first = await launch('app', 'sleep 30');
		const second = await launch('app', 'sleep 30', { metaDir: sessionMeta });

		await runBash(buildStopCommand(workspace, sessionMeta, true));

		expect(processGroupAlive(first)).toBe(false);
		expect(processGroupAlive(second)).toBe(false);
	}, 30_000);

	it('replaces an app with a stale heartbeat instead of running a second copy', async () => {
		const stopAll = buildStopCommand(workspace, meta, true);
		const first = await launch('app', 'sleep 30', { beforeLaunch: stopAll });
		await waitForMonitor('app');
		const past = new Date(Date.now() - 5 * 60_000);
		await utimes(join(meta, 'app.heartbeat'), past, past);

		const second = await launch('app', 'sleep 30', { beforeLaunch: stopAll });

		expect(second).not.toBe(first);
		expect(processGroupAlive(first)).toBe(false);
		expect(processGroupAlive(second)).toBe(true);
		expect((await readStatus()).app).toBe('starting');
	}, 30_000);

	it('starts a process once, and starts it again when the run marker is from another sandbox run', async () => {
		const first = await launch('check', 'sleep 30');
		expect((await readStatus()).check).toBe('running');

		expect(await launch('check', 'sleep 30')).toBe(first);

		await writeFile(join(meta, 'check.started'), 'another-boot:1');
		expect((await readStatus()).check).toBe('stopped');
		const second = await launch('check', 'sleep 30');
		expect(second).not.toBe(first);
		expect((await readStatus()).check).toBe('running');
	}, 30_000);

	it('treats a stale heartbeat as stopped until the monitor writes a new one', async () => {
		await createGitRepo(join(workspace, 'repo'), { 'app.txt': 'original\n' });
		await writeFile(join(meta, 'stage'), 'installing');
		await launch('setup', 'sleep 30');
		await waitForMonitor('setup');
		const past = new Date(Date.now() - 5 * 60_000);
		await utimes(join(meta, 'setup.heartbeat'), past, past);

		expect((await readStatus()).phase).toBe('stopped');
		await waitFor(
			async () => ((await readStatus()).phase === 'installing' ? true : undefined),
			15_000,
		);
	}, 30_000);

	it('records exit code 143 when setup gets SIGTERM, so setup does not read as ready', async () => {
		await createGitRepo(join(workspace, 'repo'), { 'app.txt': 'original\n' });
		const pgid = await launch('setup', 'sleep 30');
		await waitForMonitor('setup');

		process.kill(-pgid, 'SIGTERM');
		await waitFor(async () => ((await readStatus()).setupExitCode === 143 ? true : undefined));

		expect((await readStatus()).phase).toBe('error');
	}, 30_000);

	it('reports stopped, not ready, when setup is killed without an exit code', async () => {
		await createGitRepo(join(workspace, 'repo'), { 'app.txt': 'original\n' });
		const pgid = await launch('setup', 'sleep 30');
		await waitForMonitor('setup');

		process.kill(-pgid, 'SIGKILL');
		await waitFor(async () => (processGroupAlive(pgid) ? undefined : true));

		const status = await readStatus();
		expect(status.phase).toBe('stopped');
		expect(status.setupExitCode).toBeNull();
	}, 30_000);

	it('stops a check that runs longer than its time limit and records exit code 124', async () => {
		const pgid = await launch('check', 'sleep 60', { timeLimitSeconds: 1 });

		await waitFor(
			async () =>
				(await readStatus()).checkExitCode === CODING_TIME_LIMIT_EXIT_CODE ? true : undefined,
			20_000,
		);

		expect((await readStatus()).check).toBe('failed');
		expect(await readFile(join(meta, 'check.log'), 'utf8')).toContain(
			'The check ran longer than its time limit of 1 second, so it was stopped.',
		);
		await waitFor(async () => (processGroupAlive(pgid) ? undefined : true));
	}, 30_000);

	it('lists worktree sessions and skips chat files and folders with another id', async () => {
		const repo = join(workspace, 'repo');
		await createGitRepo(repo, { 'app.txt': 'original\n' });
		const { stdout: head } = await runBash('git rev-parse HEAD', { cwd: repo });
		const id = 'b0f2d2a8-5ab8-4d3c-9d6a-2c0f8a0d4c11';
		const chatId = '7d1c3f4e-2b6a-4e8f-9a0b-1c2d3e4f5a6b';
		const sessionDir = join(meta, 'sessions', id);
		await runBash(`git worktree add -q -b coding/first ${sessionDir}/repo HEAD`, { cwd: repo });
		const session = {
			id,
			name: 'First',
			branch: 'coding/first',
			baseBranch: 'main',
			baseCommit: head.trim(),
			original: false,
			createdAt: '2026-10-08T00:00:00.000Z',
			archivedAt: null,
		};
		await writeFile(join(sessionDir, 'session.json'), JSON.stringify(session));
		await writeFile(join(sessionDir, 'repo', 'app.txt'), 'first\n');
		await mkdir(join(meta, 'sessions', chatId));
		await writeFile(
			join(meta, 'sessions', chatId, 'session.json'),
			JSON.stringify({ id: chatId, worktreeId: id }),
		);
		const otherDir = join(meta, 'sessions', 'aaaaaaaa-5ab8-4d3c-9d6a-2c0f8a0d4c11');
		await mkdir(otherDir);
		await writeFile(join(otherDir, 'session.json'), JSON.stringify({ ...session, id: chatId }));

		const result = await runBash(
			buildStatusCommand({ workspaceRoot: workspace, port: 1, probePath: '/', mode: 'sessions' }),
		);
		const listed = parseCodingSessionsOutput(result.stdout);

		expect(listed.branches).toEqual(['coding/first', 'main']);
		expect(listed.sessions).toHaveLength(1);
		expect(listed.sessions[0]).toMatchObject({
			...session,
			status: {
				phase: 'ready',
				branch: 'coding/first',
				changes: [{ path: 'app.txt', status: 'M', additions: 1, deletions: 1 }],
			},
		});
		expect((await readStatus(1, id)).branch).toBe('coding/first');
	}, 30_000);

	describe('base branches of a shallow clone', () => {
		async function listBranches() {
			const result = await runBash(
				buildStatusCommand({ workspaceRoot: workspace, port: 1, probePath: '/', mode: 'sessions' }),
			);
			expect(result).toMatchObject({ code: 0, stderr: '' });
			const facts = JSON.parse(result.stdout) as { branches: string };
			return { printed: facts.branches, listed: parseCodingSessionsOutput(result.stdout).branches };
		}

		beforeEach(async () => {
			const repo = join(workspace, 'repo');
			await createShallowClone(join(workspace, 'remote'), repo, { 'app.txt': 'original\n' });
			const worktree = join(meta, 'sessions', 'b0f2d2a8-5ab8-4d3c-9d6a-2c0f8a0d4c11', 'repo');
			const added = await runBash(`git worktree add -q -b agent/due-dates '${worktree}' HEAD`, {
				cwd: repo,
			});
			expect(added.code).toBe(0);
		});

		it('lists local, worktree and remote branches without the remote name', async () => {
			const { printed, listed } = await listBranches();

			// Git prints the alias refs/remotes/origin/HEAD as the bare remote name.
			expect(printed).toMatch(/^origin\trefs\/remotes\/origin\/main$/m);
			expect(listed).toEqual(['agent/due-dates', 'main', 'origin/main']);
		});

		it('keeps a local branch named like the remote, which git prints as heads/origin', async () => {
			await runBash('git branch origin', { cwd: join(workspace, 'repo') });

			const { printed, listed } = await listBranches();

			// The local branch makes "origin" ambiguous, so git prints the alias in full.
			expect(printed).toMatch(/^origin\/HEAD\trefs\/remotes\/origin\/main$/m);
			expect(listed).toEqual(['agent/due-dates', 'main', 'heads/origin', 'origin/main']);
		});
	});

	it('fails with a clear message when the sandbox has no Node.js', async () => {
		const tools = await createToolDir([]);
		try {
			const result = await runBash(
				buildStatusCommand({ workspaceRoot: workspace, port: 1, probePath: '/', mode: 'status' }),
				{ env: { PATH: tools } },
			);
			expect(result.code).toBe(127);
			expect(result.stderr).toContain('Node.js is not available in this sandbox');
		} finally {
			await rm(tools, { recursive: true, force: true });
		}
	});

	it('fails when a requested session does not exist', async () => {
		const result = await runBash(
			buildStatusCommand({
				workspaceRoot: workspace,
				port: 1,
				probePath: '/',
				mode: 'status',
				sessionId: 'b0f2d2a8-5ab8-4d3c-9d6a-2c0f8a0d4c11',
			}),
		);
		expect(result.code).toBe(1);
		expect(result.stderr).toContain('not found');
	});
});
