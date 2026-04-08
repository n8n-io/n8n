import { InMemoryFilesystem, FakeProcessManager, FakeSandbox } from './test-utils';
import type { FileEntry } from '../../workspace/types';
import { Workspace } from '../../workspace/workspace';

// ---------------------------------------------------------------------------
// Integration tests
// ---------------------------------------------------------------------------

describe('Workspace integration with fakes', () => {
	let memFs: InMemoryFilesystem;
	let fakeProcessManager: FakeProcessManager;
	let fakeSandbox: FakeSandbox;
	let workspace: Workspace;

	beforeEach(async () => {
		memFs = new InMemoryFilesystem();
		fakeProcessManager = new FakeProcessManager();
		fakeSandbox = new FakeSandbox('test', fakeProcessManager);
		workspace = new Workspace({
			id: 'integration-test',
			filesystem: memFs,
			sandbox: fakeSandbox,
		});
		await workspace.init();
	});

	afterEach(async () => {
		await workspace.destroy();
	});

	it('initializes all providers and reaches ready state', () => {
		expect(workspace.status).toBe('ready');
		expect(memFs.status).toBe('ready');
		expect(fakeSandbox.status).toBe('running');
	});

	it('returns combined instructions', () => {
		const instructions = workspace.getInstructions();
		expect(instructions).toContain('Fake sandbox');
		expect(instructions).toContain('In-memory filesystem');
	});

	it('exposes all expected tools', () => {
		const tools = workspace.getTools();
		const names = tools.map((t) => t.name);

		expect(names).toContain('workspace_read_file');
		expect(names).toContain('workspace_write_file');
		expect(names).toContain('workspace_list_files');
		expect(names).toContain('workspace_file_stat');
		expect(names).toContain('workspace_mkdir');
		expect(names).toContain('workspace_execute_command');
	});

	describe('filesystem tools end-to-end', () => {
		it('write_file → read_file round-trip', async () => {
			const tools = workspace.getTools();
			const write = tools.find((t) => t.name === 'workspace_write_file')!;
			const read = tools.find((t) => t.name === 'workspace_read_file')!;

			await write.handler!(
				{ path: '/hello.txt', content: 'Hello from integration test!' },
				{} as never,
			);
			const result = await read.handler!({ path: '/hello.txt', encoding: 'utf-8' }, {} as never);

			expect((result as { content: string }).content).toBe('Hello from integration test!');
		});

		it('mkdir → write → list round-trip', async () => {
			const tools = workspace.getTools();
			const mkdirTool = tools.find((t) => t.name === 'workspace_mkdir')!;
			const write = tools.find((t) => t.name === 'workspace_write_file')!;
			const list = tools.find((t) => t.name === 'workspace_list_files')!;

			await mkdirTool.handler!({ path: '/project' }, {} as never);
			await write.handler!({ path: '/project/index.ts', content: 'export {}' }, {} as never);
			await write.handler!({ path: '/project/readme.md', content: '# Readme' }, {} as never);

			const result = (await list.handler!({ path: '/project' }, {} as never)) as {
				entries: FileEntry[];
			};

			expect(result.entries).toHaveLength(2);
			const names = result.entries.map((e) => e.name);
			expect(names).toContain('index.ts');
			expect(names).toContain('readme.md');
		});

		it('write → stat returns metadata', async () => {
			const tools = workspace.getTools();
			const write = tools.find((t) => t.name === 'workspace_write_file')!;
			const stat = tools.find((t) => t.name === 'workspace_file_stat')!;

			await write.handler!({ path: '/data.json', content: '{"key": "value"}' }, {} as never);
			const result = (await stat.handler!({ path: '/data.json' }, {} as never)) as {
				name: string;
				type: string;
				size: number;
			};

			expect(result.name).toBe('data.json');
			expect(result.type).toBe('file');
			expect(result.size).toBe(16);
		});
	});

	describe('sandbox tools end-to-end', () => {
		it('executes a command through the tool', async () => {
			fakeProcessManager.commandHandler = (cmd) => ({
				stdout: `ran: ${cmd}\n`,
				stderr: '',
				exitCode: 0,
			});

			const tools = workspace.getTools();
			const exec = tools.find((t) => t.name === 'workspace_execute_command')!;

			const result = (await exec.handler!({ command: 'echo test' }, {} as never)) as {
				success: boolean;
				stdout: string;
				exitCode: number;
			};

			expect(result.success).toBe(true);
			expect(result.stdout).toBe('ran: echo test\n');
			expect(result.exitCode).toBe(0);
		});

		it('reports command failure', async () => {
			fakeProcessManager.commandHandler = () => ({
				stdout: '',
				stderr: 'command not found',
				exitCode: 127,
			});

			const tools = workspace.getTools();
			const exec = tools.find((t) => t.name === 'workspace_execute_command')!;

			const result = (await exec.handler!({ command: 'invalid-cmd' }, {} as never)) as {
				success: boolean;
				stderr: string;
				exitCode: number;
			};

			expect(result.success).toBe(false);
			expect(result.exitCode).toBe(127);
			expect(result.stderr).toBe('command not found');
		});
	});

	describe('full lifecycle', () => {
		it('init → use → destroy cycle', async () => {
			const ws = new Workspace({
				filesystem: new InMemoryFilesystem('lc-fs'),
				sandbox: new FakeSandbox('lc-sb', new FakeProcessManager()),
			});

			expect(ws.status).toBe('pending');

			await ws.init();
			expect(ws.status).toBe('ready');
			expect(ws.filesystem!.status).toBe('ready');
			expect(ws.sandbox!.status).toBe('running');

			const tools = ws.getTools();
			expect(tools.length).toBeGreaterThan(0);

			await ws.destroy();
			expect(ws.status).toBe('destroyed');
			expect(ws.sandbox!.status).toBe('destroyed');
			expect(ws.filesystem!.status).toBe('destroyed');
		});

		it('workspace with only filesystem', async () => {
			const ws = new Workspace({ filesystem: new InMemoryFilesystem('fs-only') });
			await ws.init();

			const tools = ws.getTools();
			const names = tools.map((t) => t.name);
			expect(names).not.toContain('workspace_execute_command');
			expect(names).toContain('workspace_read_file');

			await ws.destroy();
		});

		it('workspace with only sandbox', async () => {
			const ws = new Workspace({
				sandbox: new FakeSandbox('sb-only', new FakeProcessManager()),
			});
			await ws.init();

			const tools = ws.getTools();
			const names = tools.map((t) => t.name);
			expect(names).toContain('workspace_execute_command');
			expect(names).not.toContain('workspace_read_file');

			await ws.destroy();
		});

		it('empty workspace lifecycle', async () => {
			const ws = new Workspace({});
			await ws.init();
			expect(ws.status).toBe('ready');
			expect(ws.getTools()).toEqual([]);
			await ws.destroy();
			expect(ws.status).toBe('destroyed');
		});
	});

	describe('in-memory filesystem operations', () => {
		it('supports append', async () => {
			await memFs.writeFile('/log.txt', 'line1\n');
			await memFs.appendFile('/log.txt', 'line2\n');

			const content = await memFs.readFile('/log.txt', { encoding: 'utf-8' });
			expect(content).toBe('line1\nline2\n');
		});

		it('supports copy and move', async () => {
			await memFs.writeFile('/original.txt', 'original');
			await memFs.copyFile('/original.txt', '/copy.txt');

			expect(await memFs.readFile('/copy.txt', { encoding: 'utf-8' })).toBe('original');

			await memFs.moveFile('/copy.txt', '/moved.txt');
			expect(await memFs.exists('/copy.txt')).toBe(false);
			expect(await memFs.readFile('/moved.txt', { encoding: 'utf-8' })).toBe('original');
		});

		it('supports rmdir recursive', async () => {
			await memFs.mkdir('/deep/nested', { recursive: true });
			await memFs.writeFile('/deep/nested/file.txt', 'data');

			await memFs.rmdir('/deep', { recursive: true });

			expect(await memFs.exists('/deep')).toBe(false);
			expect(await memFs.exists('/deep/nested/file.txt')).toBe(false);
		});

		it('readFile throws on non-existent file', async () => {
			await expect(memFs.readFile('/nonexistent')).rejects.toThrow('ENOENT');
		});

		it('deleteFile throws on non-existent file', async () => {
			await expect(memFs.deleteFile('/nonexistent')).rejects.toThrow('ENOENT');
		});
	});

	describe('fake process manager', () => {
		it('tracks spawned processes', async () => {
			const handle = await fakeProcessManager.spawn('echo hello');
			const processes = await fakeProcessManager.list();

			expect(processes).toHaveLength(1);
			expect(processes[0].pid).toBe(handle.pid);
		});

		it('can retrieve a handle by pid', async () => {
			const handle = await fakeProcessManager.spawn('ls');
			const retrieved = await fakeProcessManager.get(handle.pid);

			expect(retrieved).toBe(handle);
		});

		it('returns undefined for unknown pid', async () => {
			expect(await fakeProcessManager.get(999)).toBeUndefined();
		});

		it('can kill a process', async () => {
			const handle = await fakeProcessManager.spawn('sleep 100');
			const killed = await fakeProcessManager.kill(handle.pid);

			expect(killed).toBe(true);
			expect(handle.exitCode).toBe(137);
		});

		it('kill returns false for unknown pid', async () => {
			expect(await fakeProcessManager.kill(999)).toBe(false);
		});
	});

	describe('ProcessHandle stdout/stderr buffering', () => {
		it('buffers stdout and stderr', async () => {
			fakeProcessManager.commandHandler = () => ({
				stdout: 'output data',
				stderr: 'error data',
				exitCode: 0,
			});

			const handle = await fakeProcessManager.spawn('test');
			const collected: string[] = [];

			await handle.wait({
				onStdout: (data) => collected.push(`out:${data}`),
				onStderr: (data) => collected.push(`err:${data}`),
			});

			expect(handle.stdout).toBe('output data');
			expect(handle.stderr).toBe('error data');
			expect(collected).toContain('out:output data');
			expect(collected).toContain('err:error data');
		});

		it('supports multiple stdout/stderr listeners', async () => {
			fakeProcessManager.commandHandler = () => ({
				stdout: 'hello',
				stderr: '',
				exitCode: 0,
			});

			const handle = await fakeProcessManager.spawn('test');
			const listener1: string[] = [];
			const listener2: string[] = [];

			handle.addStdoutListener((d) => listener1.push(d));
			handle.addStdoutListener((d) => listener2.push(d));

			await handle.wait();

			expect(listener1).toEqual(['hello']);
			expect(listener2).toEqual(['hello']);
		});
	});
});
