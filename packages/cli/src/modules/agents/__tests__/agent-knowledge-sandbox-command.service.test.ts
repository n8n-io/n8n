import { AgentKnowledgeSandboxCommandService } from '../agent-knowledge-sandbox-command.service';
import type { KnowledgeSandboxWorkspace } from '../agent-knowledge-sandbox-workspace.service';

function makeWorkspace(executeCommand = jest.fn()): KnowledgeSandboxWorkspace {
	return {
		sandbox: {
			id: 'sandbox-1',
			name: 'Sandbox',
			provider: 'n8n-sandbox',
			status: 'running',
			executeCommand,
		},
		filesystem: {} as KnowledgeSandboxWorkspace['filesystem'],
		provider: 'n8n-sandbox',
		workspaceRoot: '/home/user/workspace',
		knowledgeRoot: '/home/user/workspace/agent-knowledge',
		internalRoot: '/home/user/workspace/.agent-knowledge-internal',
		manifestPath: '/home/user/workspace/.agent-knowledge-internal/manifest.json',
	};
}

function commandResult(stdout: string, options: { timedOut?: boolean } = {}) {
	return {
		success: true,
		exitCode: 0,
		stdout,
		stderr: '',
		executionTimeMs: 1,
		timedOut: options.timedOut ?? false,
	};
}

describe('AgentKnowledgeSandboxCommandService', () => {
	let service: AgentKnowledgeSandboxCommandService;

	beforeEach(() => {
		service = new AgentKnowledgeSandboxCommandService();
	});

	it('search invokes rg with default args', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(commandResult('file-1-notes.txt:2:needle\n'));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'search',
			pattern: 'needle',
			fixedStrings: true,
		});

		expect(result.command).toBe('search');
		expect(result.exitCode).toBe(0);
		expect(result.stdout).toContain('needle');
		expect(executeCommand).toHaveBeenCalledTimes(1);
		expect(executeCommand).toHaveBeenCalledWith(
			'rg',
			[
				'--no-heading',
				'--line-number',
				'--with-filename',
				'--color',
				'never',
				'-F',
				'--',
				'needle',
				'.',
			],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
	});

	it('search supports count, case-insensitive, context, and explicit files', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('a.txt:1\n'));
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'search',
			pattern: 'needle',
			outputMode: 'count',
			caseInsensitive: true,
			context: 3,
			fixedStrings: false,
			files: ['a.txt'],
		});

		expect(executeCommand).toHaveBeenCalledWith(
			'rg',
			[
				'--no-heading',
				'--line-number',
				'--with-filename',
				'--color',
				'never',
				'-i',
				'--count',
				'-C',
				'3',
				'--',
				'needle',
				'a.txt',
			],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
	});

	it('search rejects an empty pattern', async () => {
		const executeCommand = jest.fn();
		const workspace = makeWorkspace(executeCommand);

		await expect(service.run(workspace, { command: 'search', pattern: '   ' })).rejects.toThrow(
			'Search pattern is required',
		);
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('search rejects absolute paths and parent segments', async () => {
		const executeCommand = jest.fn();
		const workspace = makeWorkspace(executeCommand);

		await expect(
			service.run(workspace, { command: 'search', pattern: 'needle', files: ['/etc/passwd'] }),
		).rejects.toThrow('Absolute paths are not allowed');
		await expect(
			service.run(workspace, { command: 'search', pattern: 'needle', files: ['../secret.txt'] }),
		).rejects.toThrow('Parent path segments are not allowed');
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('search clamps context to 0-5', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult(''));
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'search',
			pattern: 'needle',
			context: 9,
			fixedStrings: true,
		});

		expect(executeCommand.mock.calls[0]?.[1]).toEqual(expect.arrayContaining(['-C', '5']));
	});

	it('read without range invokes sed for the first 500 lines', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('hello world'));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'read',
			file: 'notes.txt',
		});

		expect(result.command).toBe('read');
		expect(executeCommand).toHaveBeenCalledWith(
			'sed',
			['-n', '1,500p', 'notes.txt'],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
	});

	it('read with line range invokes sed for the requested window', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('line 2\nline 3\n'));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'read',
			file: 'notes.txt',
			startLine: 10,
			endLine: 12,
		});

		expect(result.command).toBe('read');
		expect(executeCommand).toHaveBeenCalledWith(
			'sed',
			['-n', '10,12p', 'notes.txt'],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
	});

	it('read clamps oversized line ranges and marks the result truncated', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('line 2\n'));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, {
			command: 'read',
			file: 'notes.txt',
			startLine: 10,
			endLine: 1000,
		});

		expect(executeCommand).toHaveBeenCalledWith(
			'sed',
			['-n', '10,509p', 'notes.txt'],
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
		expect(result.truncated).toBe(true);
	});

	it('rejects absolute paths, parent segments, and control characters for read', async () => {
		const executeCommand = jest.fn();
		const workspace = makeWorkspace(executeCommand);

		await expect(service.run(workspace, { command: 'read', file: '/etc/passwd' })).rejects.toThrow(
			'Absolute paths are not allowed',
		);
		await expect(
			service.run(workspace, { command: 'read', file: '../secret.txt' }),
		).rejects.toThrow('Parent path segments are not allowed');
		await expect(
			service.run(workspace, { command: 'read', file: 'notes\u0000.txt' }),
		).rejects.toThrow('Invalid path');
		expect(executeCommand).not.toHaveBeenCalled();
	});

	it('truncates stdout without breaking UTF-8', async () => {
		const executeCommand = jest.fn().mockResolvedValueOnce(commandResult('é'.repeat(40_000)));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, { command: 'read', file: 'notes.txt' });

		expect(result.truncated).toBe(true);
		expect(Buffer.byteLength(result.stdout)).toBeLessThanOrEqual(64 * 1024);
	});

	it('marks timed out commands as truncated', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(commandResult('hello', { timedOut: true }));
		const workspace = makeWorkspace(executeCommand);

		const result = await service.run(workspace, { command: 'read', file: 'notes.txt' });

		expect(result.truncated).toBe(true);
	});

	it('scopes search commands to the knowledge root cwd', async () => {
		const executeCommand = jest
			.fn()
			.mockResolvedValueOnce(commandResult('file-1-notes.txt:1:needle\n'));
		const workspace = makeWorkspace(executeCommand);

		await service.run(workspace, {
			command: 'search',
			pattern: 'needle',
			fixedStrings: true,
		});

		const rgArgs = executeCommand.mock.calls[0]?.[1];
		expect(executeCommand.mock.calls[0]?.[2]).toEqual(
			expect.objectContaining({ cwd: workspace.knowledgeRoot }),
		);
		expect(rgArgs).toEqual(expect.arrayContaining(['.', 'needle']));
		expect(rgArgs).not.toContain(workspace.manifestPath);
		expect(rgArgs).not.toContain(workspace.internalRoot);
	});

	it('throws clear error when executeCommand is missing', async () => {
		const workspace = makeWorkspace();
		workspace.sandbox = {
			...workspace.sandbox,
			executeCommand: undefined,
		};

		await expect(service.run(workspace, { command: 'read', file: 'notes.txt' })).rejects.toThrow(
			'Agent knowledge sandbox does not support command execution',
		);
	});
});
