import { execFile } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const exec = promisify(execFile);

export interface BashResult {
	code: number;
	stdout: string;
	stderr: string;
}

/** Runs a script with the real bash, the way the sandbox runs generated commands. */
export async function runBash(
	script: string,
	options: { env?: NodeJS.ProcessEnv; cwd?: string } = {},
): Promise<BashResult> {
	try {
		const result = await exec('/bin/bash', ['-c', script], {
			cwd: options.cwd,
			env: { ...process.env, ...options.env },
			timeout: 20_000,
		});
		return { code: 0, ...result };
	} catch (error) {
		const failed = error as { code?: number; stdout?: string; stderr?: string };
		return {
			code: typeof failed.code === 'number' ? failed.code : 1,
			stdout: failed.stdout ?? '',
			stderr: failed.stderr ?? '',
		};
	}
}

export async function makeTempDir(prefix: string): Promise<string> {
	return await mkdtemp(join(tmpdir(), prefix));
}

export async function createGitRepo(repo: string, files: Record<string, string>): Promise<void> {
	await mkdir(repo, { recursive: true });
	await exec('git', ['init', '-q', '-b', 'main', repo]);
	await exec('git', ['config', 'user.name', 'Test'], { cwd: repo });
	await exec('git', ['config', 'user.email', 'test@example.invalid'], { cwd: repo });
	for (const [path, content] of Object.entries(files)) await writeFile(join(repo, path), content);
	await exec('git', ['add', '.'], { cwd: repo });
	await exec('git', ['commit', '-q', '-m', 'Initial'], { cwd: repo });
}

/**
 * Creates `checkout` the way prepare does: a shallow clone of the main branch of a bare origin.
 * The seed repository and the bare origin go into `originDir`. Git also writes
 * refs/remotes/origin/HEAD in the clone, an alias of origin/main.
 */
export async function createShallowClone(
	originDir: string,
	checkout: string,
	files: Record<string, string>,
): Promise<void> {
	const seed = join(originDir, 'seed');
	const origin = join(originDir, 'origin.git');
	await createGitRepo(seed, files);
	await exec('git', ['clone', '-q', '--bare', seed, origin]);
	await exec('git', [
		'clone',
		'-q',
		'--depth',
		'1',
		'--branch',
		'main',
		`file://${origin}`,
		checkout,
	]);
}

export async function freePort(): Promise<number> {
	return await new Promise((resolve, reject) => {
		const server = createServer();
		server.once('error', reject);
		server.listen(0, '127.0.0.1', () => {
			const address = server.address();
			const port = typeof address === 'object' && address ? address.port : 0;
			server.close(() => resolve(port));
		});
	});
}

export async function waitFor<T>(
	read: () => Promise<T | undefined>,
	timeoutMs = 10_000,
): Promise<T> {
	const deadline = Date.now() + timeoutMs;
	for (;;) {
		const value = await read();
		if (value !== undefined) return value;
		if (Date.now() > deadline) throw new Error(`Condition not met within ${timeoutMs} ms`);
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
}

/** True when a member of the group runs. Zombies (exited, not reaped yet) do not count. */
export function processGroupAlive(pgid: number): boolean {
	return readdirSync('/proc').some((entry) => {
		if (!/^\d+$/.test(entry)) return false;
		try {
			const stat = readFileSync(`/proc/${entry}/stat`, 'utf8');
			const [state, , group] = stat.slice(stat.lastIndexOf(') ') + 2).split(' ');
			return state !== 'Z' && Number(group) === pgid;
		} catch {
			return false;
		}
	});
}

export function killProcessGroup(pgid: number): void {
	try {
		process.kill(-pgid, 'SIGKILL');
	} catch {
		// The group is already gone.
	}
}

/**
 * Creates a folder for PATH that holds only the named system tools plus fake executables. It
 * gives a script a controlled PATH, for example one without Node.js or curl.
 */
export async function createToolDir(
	tools: string[],
	fakes: Record<string, string> = {},
): Promise<string> {
	const directory = await makeTempDir('n8n-coding-tools-');
	for (const tool of tools) {
		const { stdout } = await exec('/bin/bash', ['-c', `command -v ${tool}`]);
		await symlink(stdout.trim(), join(directory, tool));
	}
	for (const [name, script] of Object.entries(fakes)) {
		await writeFile(join(directory, name), `#!/bin/bash\n${script}\n`);
		await chmod(join(directory, name), 0o755);
	}
	return directory;
}
