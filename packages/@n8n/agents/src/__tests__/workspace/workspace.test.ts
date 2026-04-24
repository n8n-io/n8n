import type { WorkspaceFilesystem, WorkspaceSandbox } from '../../workspace/types';
import { Workspace } from '../../workspace/workspace';

function makeFakeFilesystem(overrides: Partial<WorkspaceFilesystem> = {}): WorkspaceFilesystem {
	return {
		id: 'test-fs',
		name: 'TestFS',
		provider: 'test',
		status: 'pending',
		readFile: jest.fn(),
		writeFile: jest.fn(),
		appendFile: jest.fn(),
		deleteFile: jest.fn(),
		copyFile: jest.fn(),
		moveFile: jest.fn(),
		mkdir: jest.fn(),
		rmdir: jest.fn(),
		readdir: jest.fn(),
		exists: jest.fn(),
		stat: jest.fn(),
		...overrides,
	};
}

function makeFakeSandbox(overrides: Partial<WorkspaceSandbox> = {}): WorkspaceSandbox {
	return {
		id: 'test-sandbox',
		name: 'TestSandbox',
		provider: 'test',
		status: 'pending',
		...overrides,
	};
}

describe('Workspace', () => {
	describe('constructor', () => {
		it('generates an id when none is provided', () => {
			const ws = new Workspace({});
			expect(ws.id).toMatch(/^workspace-[0-9a-f-]+$/);
		});

		it('uses a custom id when provided', () => {
			const ws = new Workspace({ id: 'my-ws' });
			expect(ws.id).toBe('my-ws');
		});

		it('generates a name from the id when none is provided', () => {
			const ws = new Workspace({ id: 'abc' });
			expect(ws.name).toBe('workspace-abc');
		});

		it('uses a custom name when provided', () => {
			const ws = new Workspace({ id: 'abc', name: 'My Workspace' });
			expect(ws.name).toBe('My Workspace');
		});

		it('starts with pending status', () => {
			const ws = new Workspace({});
			expect(ws.status).toBe('pending');
		});

		it('exposes filesystem and sandbox', () => {
			const fs = makeFakeFilesystem();
			const sb = makeFakeSandbox();
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			expect(ws.filesystem).toBe(fs);
			expect(ws.sandbox).toBe(sb);
		});

		it('returns undefined for absent filesystem and sandbox', () => {
			const ws = new Workspace({});

			expect(ws.filesystem).toBeUndefined();
			expect(ws.sandbox).toBeUndefined();
		});

		it('generates unique IDs using randomUUID', () => {
			const ws1 = new Workspace({});
			const ws2 = new Workspace({});
			expect(ws1.id).not.toBe(ws2.id);
			expect(ws1.id).toMatch(/^workspace-/);
		});
	});

	describe('init', () => {
		it('calls filesystem._init then sandbox._start', async () => {
			const order: string[] = [];
			const fs = makeFakeFilesystem({
				_init: jest.fn(async () => {
					await Promise.resolve();
					order.push('fs-init');
				}),
			});
			const sb = makeFakeSandbox({
				_start: jest.fn(async () => {
					await Promise.resolve();
					order.push('sb-start');
				}),
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			await ws.init();

			expect(order).toEqual(['fs-init', 'sb-start']);
			expect(ws.status).toBe('ready');
		});

		it('sets status to ready when no providers', async () => {
			const ws = new Workspace({});
			await ws.init();
			expect(ws.status).toBe('ready');
		});

		it('initializes only filesystem when no sandbox', async () => {
			const fs = makeFakeFilesystem({
				_init: jest.fn().mockResolvedValue(undefined),
			});
			const ws = new Workspace({ filesystem: fs });

			await ws.init();

			expect(fs._init).toHaveBeenCalled();
			expect(ws.status).toBe('ready');
		});

		it('starts only sandbox when no filesystem', async () => {
			const sb = makeFakeSandbox({
				_start: jest.fn().mockResolvedValue(undefined),
			});
			const ws = new Workspace({ sandbox: sb });

			await ws.init();

			expect(sb._start).toHaveBeenCalled();
			expect(ws.status).toBe('ready');
		});

		it('destroys filesystem and sets error status when sandbox start fails', async () => {
			const fs = makeFakeFilesystem({
				_init: jest.fn().mockResolvedValue(undefined),
				_destroy: jest.fn().mockResolvedValue(undefined),
			});
			const sb = makeFakeSandbox({
				_start: jest.fn().mockRejectedValue(new Error('sandbox start failed')),
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			await expect(ws.init()).rejects.toThrow('sandbox start failed');

			expect(fs._init).toHaveBeenCalled();
			expect(fs._destroy).toHaveBeenCalled();
			expect(ws.status).toBe('error');
		});

		it('is idempotent when already ready', async () => {
			const fs = makeFakeFilesystem({
				_init: jest.fn().mockResolvedValue(undefined),
			});
			const ws = new Workspace({ filesystem: fs });

			await ws.init();
			(fs._init as jest.Mock).mockClear();

			await ws.init();

			expect(fs._init).not.toHaveBeenCalled();
		});

		it('deduplicates concurrent init calls', async () => {
			let resolveInit: () => void;
			const fs = makeFakeFilesystem({
				_init: jest.fn(
					async () =>
						await new Promise<void>((r) => {
							resolveInit = r;
						}),
				),
			});
			const ws = new Workspace({ filesystem: fs });

			const p1 = ws.init();
			const p2 = ws.init();

			resolveInit!();
			await Promise.all([p1, p2]);

			expect(fs._init).toHaveBeenCalledTimes(1);
			expect(ws.status).toBe('ready');
		});
	});

	describe('destroy', () => {
		it('calls sandbox._destroy then filesystem._destroy', async () => {
			const order: string[] = [];
			const fs = makeFakeFilesystem({
				_destroy: jest.fn(async () => {
					await Promise.resolve();
					order.push('fs-destroy');
				}),
			});
			const sb = makeFakeSandbox({
				_destroy: jest.fn(async () => {
					await Promise.resolve();
					order.push('sb-destroy');
				}),
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			await ws.destroy();

			expect(order).toEqual(['sb-destroy', 'fs-destroy']);
			expect(ws.status).toBe('destroyed');
		});

		it('sets status to destroyed when no providers', async () => {
			const ws = new Workspace({});
			await ws.destroy();
			expect(ws.status).toBe('destroyed');
		});

		it('transitions to error when sandbox destroy throws', async () => {
			const fs = makeFakeFilesystem({
				_destroy: jest.fn().mockResolvedValue(undefined),
			});
			const sb = makeFakeSandbox({
				_destroy: jest.fn().mockRejectedValue(new Error('sandbox boom')),
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			await expect(ws.destroy()).rejects.toThrow('sandbox boom');

			expect(fs._destroy).toHaveBeenCalled();
			expect(ws.status).toBe('error');
		});
	});

	describe('getInstructions', () => {
		it('combines sandbox and filesystem instructions', () => {
			const fs = makeFakeFilesystem({
				getInstructions: () => 'FS instructions',
			});
			const sb = makeFakeSandbox({
				getInstructions: () => 'SB instructions',
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			expect(ws.getInstructions()).toBe('SB instructions\n\nFS instructions');
		});

		it('returns empty string when no providers', () => {
			const ws = new Workspace({});
			expect(ws.getInstructions()).toBe('');
		});

		it('omits empty instruction strings', () => {
			const fs = makeFakeFilesystem({
				getInstructions: () => '',
			});
			const sb = makeFakeSandbox({
				getInstructions: () => 'SB only',
			});
			const ws = new Workspace({ filesystem: fs, sandbox: sb });

			expect(ws.getInstructions()).toBe('SB only');
		});
	});

	describe('getTools', () => {
		it('returns filesystem tools when filesystem is set', () => {
			const fs = makeFakeFilesystem();
			const ws = new Workspace({ filesystem: fs });

			const tools = ws.getTools();

			const names = tools.map((t) => t.name);
			expect(names).toContain('workspace_read_file');
			expect(names).toContain('workspace_write_file');
			expect(names).toContain('workspace_list_files');
			expect(names).toContain('workspace_file_stat');
			expect(names).toContain('workspace_mkdir');
		});

		it('returns execute_command tool when sandbox has executeCommand', () => {
			const sb = makeFakeSandbox({
				executeCommand: jest.fn(),
			});
			const ws = new Workspace({ sandbox: sb });

			const tools = ws.getTools();
			const names = tools.map((t) => t.name);
			expect(names).toContain('workspace_execute_command');
		});

		it('returns empty array when no providers', () => {
			const ws = new Workspace({});
			expect(ws.getTools()).toEqual([]);
		});

		it('does not include execute_command if sandbox has no executeCommand', () => {
			const sb = makeFakeSandbox();
			const ws = new Workspace({ sandbox: sb });

			const tools = ws.getTools();
			const names = tools.map((t) => t.name);
			expect(names).not.toContain('workspace_execute_command');
		});
	});
});
