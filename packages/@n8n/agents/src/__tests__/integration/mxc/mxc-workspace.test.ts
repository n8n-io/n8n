/**
 * Runs the `mxc` workspace provider against the real Microsoft Execution Containers runtime.
 * Needs a host where MXC is supported (macOS 15+ on Apple Silicon, Windows 11 24H2+, or Linux
 * with bubblewrap), so it only runs when MXC_INTEGRATION is set:
 *
 *   MXC_INTEGRATION=1 pnpm --filter @n8n/agents test:integration mxc
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MxcLocalFilesystem } from '../../../workspace/filesystem/mxc-local-filesystem';
import { MxcSandbox } from '../../../workspace/sandbox/mxc-sandbox';

const isWindows = process.platform === 'win32';

const commands = {
	read: (path: string) => (isWindows ? `type "${path}"` : `cat '${path}'`),
	write: (path: string) => (isWindows ? `echo pwned> "${path}"` : `echo pwned > '${path}'`),
	sleep: (seconds: number) =>
		isWindows
			? `powershell -NoProfile -Command Start-Sleep -Seconds ${seconds}`
			: `sleep ${seconds}`,
	fetch: isWindows
		? 'curl.exe -sS --max-time 5 https://example.com'
		: 'curl -sS --max-time 5 https://example.com',
};

describe.skipIf(!process.env.MXC_INTEGRATION)('mxc workspace (real MXC)', () => {
	let root: string;
	let inputs: string;
	let secret: string;
	let outside: string;
	let sandbox: MxcSandbox;
	let filesystem: MxcLocalFilesystem;

	beforeAll(async () => {
		root = mkdtempSync(join(tmpdir(), 'mxc-it-'));
		inputs = join(root, 'inputs');
		secret = join(root, 'secret');
		outside = join(root, 'outside');
		for (const dir of [inputs, secret, outside]) mkdirSync(dir);
		writeFileSync(join(inputs, 'sales.csv'), 'region,amount\nEU,10\nUS,20\n');
		writeFileSync(join(secret, 'id_rsa'), 'PRIVATE KEY');
		writeFileSync(join(outside, 'notes.txt'), 'outside the policy');
		mkdirSync(join(inputs, 'private'));
		writeFileSync(join(inputs, 'private', 'salaries.csv'), 'CONFIDENTIAL');
		process.env.N8N_MXC_IT_SECRET = 'do-not-leak';

		sandbox = new MxcSandbox({
			id: 'it-workspace',
			workspaceRoot: join(root, 'workspaces'),
			readonlyPaths: [inputs],
			deniedPaths: [secret, join(inputs, 'private')],
			timeout: 30_000,
			...(isWindows && process.env.MXC_DENIALS_DIR
				? { denialsReportDir: process.env.MXC_DENIALS_DIR }
				: {}),
		});
		await sandbox._start();
		filesystem = new MxcLocalFilesystem(sandbox);
		await filesystem._init();
	});

	afterAll(() => {
		delete process.env.N8N_MXC_IT_SECRET;
		rmSync(root, { recursive: true, force: true });
	});

	it('runs a command in the workspace folder', async () => {
		const result = await sandbox.executeCommand('echo hello-from-mxc');

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('hello-from-mxc');
	});

	it('lets commands write inside the workspace', async () => {
		const result = await sandbox.executeCommand(commands.write('result.txt'));

		expect(result.exitCode).toBe(0);
		expect(readFileSync(join(sandbox.workspaceDir, 'result.txt'), 'utf8')).toContain('pwned');
	});

	it('lets commands read the input folders', async () => {
		const result = await sandbox.executeCommand(commands.read(join(inputs, 'sales.csv')));

		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('EU,10');
	});

	it('blocks commands from writing to the input folders', async () => {
		const target = join(inputs, 'tampered.txt');
		const result = await sandbox.executeCommand(commands.write(target));

		expect(result.success).toBe(false);
		expect(existsSync(target)).toBe(false);
	});

	it('blocks commands from reading denied folders', async () => {
		const result = await sandbox.executeCommand(commands.read(join(secret, 'id_rsa')));

		expect(result.success).toBe(false);
		expect(result.stdout).not.toContain('PRIVATE KEY');
	});

	it('blocks denied folders inside a read-only input folder', async () => {
		const result = await sandbox.executeCommand(
			commands.read(join(inputs, 'private', 'salaries.csv')),
		);

		expect(result.success).toBe(false);
		expect(result.stdout).not.toContain('CONFIDENTIAL');
	});

	it('does not pass the n8n process environment to commands', async () => {
		const result = await sandbox.executeCommand(isWindows ? 'set' : 'env');

		expect(result.exitCode).toBe(0);
		expect(result.stdout).not.toContain('do-not-leak');
	});

	it.skipIf(isWindows)(
		'stops file tools from writing through a link that a command created',
		async () => {
			const target = join(outside, 'created-by-link.txt');
			await sandbox.executeCommand(`ln -s '${target}' link.txt`);

			await expect(filesystem.writeFile('link.txt', 'pwned')).rejects.toThrow(/Access denied/);
			expect(existsSync(target)).toBe(false);
		},
	);

	it('blocks commands from reading files the policy does not list', async () => {
		const result = await sandbox.executeCommand(commands.read(join(outside, 'notes.txt')));

		expect(result.success).toBe(false);
		expect(result.stdout).not.toContain('outside the policy');
	});

	it('blocks commands from writing outside the policy', async () => {
		const target = join(outside, 'escape.txt');
		const result = await sandbox.executeCommand(commands.write(target));

		expect(result.success).toBe(false);
		expect(existsSync(target)).toBe(false);
	});

	it('blocks network access', async () => {
		const result = await sandbox.executeCommand(commands.fetch);

		expect(result.success).toBe(false);
		expect(result.stdout).not.toContain('Example Domain');
		// The failure must come from the network block, not from a missing curl binary.
		expect(result.exitCode).not.toBe(127);
		expect(result.stderr).not.toMatch(/not found|not recognized/i);
	});

	it('times out long-running commands', async () => {
		const result = await sandbox.executeCommand(commands.sleep(10), [], { timeout: 1_500 });

		expect(result.success).toBe(false);
		expect(result.timedOut).toBe(true);
	});

	it('stops a command when the run is aborted', async () => {
		const controller = new AbortController();
		setTimeout(() => controller.abort(), 500);

		const startedAt = Date.now();
		const result = await sandbox.executeCommand(commands.sleep(10), [], {
			abortSignal: controller.signal,
		});

		expect(result.killed).toBe(true);
		expect(Date.now() - startedAt).toBeLessThan(8_000);
	});

	it('confines file tools to the workspace and input folders', async () => {
		await filesystem.writeFile('report.md', '# Report');

		expect(await filesystem.readFile('report.md', { encoding: 'utf8' })).toBe('# Report');
		await expect(filesystem.readFile(join(secret, 'id_rsa'))).rejects.toThrow(/Access denied/);
		await expect(filesystem.writeFile(join(inputs, 'x.csv'), 'x')).rejects.toThrow(/Access denied/);
	});

	it.runIf(isWindows && !!process.env.MXC_DENIALS_DIR)(
		'records denied accesses in a Windows denial report',
		async () => {
			const result = await sandbox.executeCommand(commands.read(join(secret, 'id_rsa')));

			expect(result.stderr).toMatch(/Denied accesses were recorded in/);
		},
	);
});
