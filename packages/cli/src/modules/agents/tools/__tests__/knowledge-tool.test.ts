import type { SandboxFilesystem } from '@n8n/ai-utilities/sandbox';
import { spawn } from 'node:child_process';

import { AgentKnowledgeCsvService } from '../../agent-knowledge-csv.service';
import { AgentKnowledgeSandboxCommandService } from '../../agent-knowledge-sandbox-command.service';
import type {
	AgentKnowledgeSandboxWorkspaceService,
	KnowledgeSandboxWorkspace,
} from '../../agent-knowledge-sandbox-workspace.service';
import type {
	AgentKnowledgeService,
	KnowledgeSandboxExpectedManifest,
} from '../../agent-knowledge.service';
import { createSearchKnowledgeTool } from '../knowledge/tool';
import { searchKnowledgeInputSchema, searchKnowledgeParsingSchema } from '../knowledge/schemas';
import type { JSONSchema7 } from 'json-schema';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

const agentId = 'agent-1';
const projectId = 'project-1';
const COMMAND_TIMEOUT_MS = 5_000;

async function executeLocalSandboxCommand(
	command: string,
	args: string[],
	options: {
		cwd?: string;
		timeout?: number;
		onStdout?: (chunk: string) => void;
		onStderr?: (chunk: string) => void;
	} = {},
): Promise<{
	success: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	executionTimeMs: number;
	timedOut?: boolean;
}> {
	const cwd = options.cwd ?? process.cwd();
	const timeout = options.timeout ?? COMMAND_TIMEOUT_MS;
	const startedAt = Date.now();

	return await new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			shell: false,
			env: {
				PATH: process.env.PATH,
				HOME: cwd,
				GIT_CONFIG_NOSYSTEM: '1',
				GIT_CONFIG_GLOBAL: '/dev/null',
				GIT_TERMINAL_PROMPT: '0',
			},
		});
		let stdout = '';
		let stderr = '';
		let timedOut = false;
		const timer = setTimeout(() => {
			timedOut = true;
			child.kill('SIGKILL');
		}, timeout);

		child.stdout.on('data', (chunk: Buffer) => {
			const text = chunk.toString('utf8');
			stdout += text;
			options.onStdout?.(text);
		});
		child.stderr.on('data', (chunk: Buffer) => {
			const text = chunk.toString('utf8');
			stderr += text;
			options.onStderr?.(text);
		});
		child.on('error', reject);
		child.on('close', (exitCode) => {
			clearTimeout(timer);
			resolve({
				success: exitCode === 0,
				exitCode: exitCode ?? 1,
				stdout,
				stderr,
				executionTimeMs: Date.now() - startedAt,
				timedOut,
			});
		});
	});
}

describe('search_knowledge tool', () => {
	let sandboxCommandService: AgentKnowledgeSandboxCommandService;
	let csvService: AgentKnowledgeCsvService;
	let sandboxWorkspaceService: AgentKnowledgeSandboxWorkspaceService;
	let knowledgeService: jest.Mocked<
		Pick<
			AgentKnowledgeService,
			| 'buildExpectedSandboxManifest'
			| 'listWorkspaceFiles'
			| 'materializeWorkspaceFilesIntoSandbox'
			| 'materializeWorkspaceIntoSandbox'
			| 'openWorkspaceFileStream'
			| 'resolveStoredFilesForMaterialization'
			| 'resolveWorkspaceFilesForRuntime'
			| 'resolveWorkspaceForSandboxOperation'
		>
	>;

	function mockKnowledgeService() {
		return knowledgeService as unknown as AgentKnowledgeService;
	}

	function createTool() {
		return createSearchKnowledgeTool({
			agentId,
			projectId,
			knowledgeService: mockKnowledgeService(),
			sandboxCommandService,
			csvService,
			sandboxWorkspaceService,
		});
	}

	beforeEach(() => {
		sandboxCommandService = new AgentKnowledgeSandboxCommandService();
		jest.spyOn(sandboxCommandService, 'run');
		sandboxWorkspaceService = {
			ensureWorkspaceContainsFiles: jest.fn(async (_workspace, expected, materialize) => {
				const missingFiles = expected.files.map(
					(file: KnowledgeSandboxExpectedManifest['files'][number]) => ({
						id: file.id,
						fileName: '',
						mimeType: '',
						fileSizeBytes: file.fileSizeBytes,
						relativePath: file.relativePath,
					}),
				);
				await materialize(missingFiles);
				return { files: undefined, freshness: { status: 'stale', reason: 'manifest-missing' } };
			}),
			withCachedWorkspace: jest.fn(async (_cacheKey, operation) => {
				const { mkdtemp, mkdir, rm, writeFile } = await import('node:fs/promises');
				const { tmpdir } = await import('node:os');
				const nodePath = await import('node:path');
				const knowledgeRoot = await mkdtemp(nodePath.join(tmpdir(), 'sandbox-knowledge-'));
				const internalRoot = nodePath.join(knowledgeRoot, '.internal');
				const workspace: KnowledgeSandboxWorkspace = {
					sandbox: {
						id: 'test-sandbox',
						name: 'Test Sandbox',
						provider: 'n8n-sandbox',
						status: 'running',
						executeCommand: async (command, args = [], options) =>
							await executeLocalSandboxCommand(command, args, {
								cwd: options?.cwd ?? knowledgeRoot,
								timeout: options?.timeout,
								onStdout: options?.onStdout,
								onStderr: options?.onStderr,
							}),
					},
					filesystem: {
						writeFile: async (
							filePath: string,
							content: string | Buffer,
							options?: { recursive?: boolean; overwrite?: boolean },
						) => {
							await mkdir(nodePath.dirname(filePath), { recursive: true });
							await writeFile(filePath, content, { flag: options?.overwrite ? 'w' : 'wx' });
						},
					} as SandboxFilesystem,
					provider: 'n8n-sandbox',
					workspaceRoot: knowledgeRoot,
					knowledgeRoot,
					internalRoot,
					manifestPath: nodePath.join(internalRoot, 'manifest.json'),
				};
				try {
					return await operation(workspace);
				} finally {
					await rm(knowledgeRoot, { recursive: true, force: true }).catch(() => {});
				}
			}),
		} as unknown as AgentKnowledgeSandboxWorkspaceService;
		knowledgeService = {
			buildExpectedSandboxManifest: jest.fn((manifestAgentId, manifestProjectId, storedFiles) => ({
				version: 1,
				agentId: manifestAgentId,
				projectId: manifestProjectId,
				cacheSignatureSha1: '',
				files: storedFiles.map((file) => ({
					id: file.id,
					relativePath: `${file.id}${file.fileName.includes('.') ? file.fileName.slice(file.fileName.lastIndexOf('.')) : '.txt'}`,
					fileSizeBytes: file.fileSizeBytes,
					binaryDataIdSha1: `sha1-${file.id}`,
				})),
			})),
			listWorkspaceFiles: jest.fn(),
			materializeWorkspaceIntoSandbox: jest.fn(),
			materializeWorkspaceFilesIntoSandbox: jest.fn(
				async (materializeAgentId, materializeProjectId, target, filesToMaterialize) =>
					await knowledgeService.materializeWorkspaceIntoSandbox(
						materializeAgentId,
						materializeProjectId,
						target,
						{ fileReferences: filesToMaterialize.map((file) => file.id) },
					),
			),
			resolveStoredFilesForMaterialization: jest.fn(
				async (storedAgentId, storedProjectId, fileReferences) => {
					const resolution = await knowledgeService.resolveWorkspaceFilesForRuntime(
						storedAgentId,
						storedProjectId,
						fileReferences,
					);
					return resolution.files.map((file) => ({
						id: file.id,
						agentId: storedAgentId,
						fileName: file.fileName,
						mimeType: file.mimeType,
						fileSizeBytes: file.fileSizeBytes,
						binaryDataId: `binary-${file.id}`,
					})) as never;
				},
			),
			resolveWorkspaceForSandboxOperation: jest.fn(
				async (sandboxAgentId, sandboxProjectId, fileReferences) => {
					const resolution = await knowledgeService.resolveWorkspaceFilesForRuntime(
						sandboxAgentId,
						sandboxProjectId,
						fileReferences,
					);
					const storedFiles = await knowledgeService.resolveStoredFilesForMaterialization(
						sandboxAgentId,
						sandboxProjectId,
						fileReferences,
					);
					return { files: resolution.files, storedFiles };
				},
			),
			openWorkspaceFileStream: jest.fn(async (streamAgentId, streamProjectId, fileReference) => {
				const { mkdtemp, readFile, rm } = await import('node:fs/promises');
				const { tmpdir } = await import('node:os');
				const nodePath = await import('node:path');
				const { Readable } = await import('node:stream');
				const dir = await mkdtemp(nodePath.join(tmpdir(), 'csv-stream-'));
				const target = {
					knowledgeRoot: dir,
					internalRoot: nodePath.join(dir, '.internal'),
					manifestPath: nodePath.join(dir, '.internal', 'manifest.json'),
					filesystem: {} as SandboxFilesystem,
					sandbox: {} as KnowledgeSandboxWorkspace['sandbox'],
				};
				try {
					const files = await knowledgeService.materializeWorkspaceIntoSandbox(
						streamAgentId,
						streamProjectId,
						target,
						{
							fileReferences: [fileReference],
						},
					);
					const file = files.find(
						(candidate) =>
							candidate.id === fileReference ||
							candidate.relativePath === fileReference ||
							candidate.fileName === fileReference,
					);
					if (!file) throw new Error(`File "${fileReference}" not found`);
					return {
						file,
						contentStream: Readable.from([await readFile(nodePath.join(dir, file.relativePath))]),
					};
				} finally {
					await rm(dir, { recursive: true, force: true });
				}
			}),
			resolveWorkspaceFilesForRuntime: jest.fn(
				async (resolveAgentId, resolveProjectId, fileReferences) => {
					const { mkdtemp, rm } = await import('node:fs/promises');
					const { tmpdir } = await import('node:os');
					const nodePath = await import('node:path');
					const dir = await mkdtemp(nodePath.join(tmpdir(), 'resolve-'));
					const target = {
						knowledgeRoot: dir,
						internalRoot: nodePath.join(dir, '.internal'),
						manifestPath: nodePath.join(dir, '.internal', 'manifest.json'),
						filesystem: {} as SandboxFilesystem,
						sandbox: {} as KnowledgeSandboxWorkspace['sandbox'],
					};
					try {
						const files = await knowledgeService.materializeWorkspaceIntoSandbox(
							resolveAgentId,
							resolveProjectId,
							target,
							{
								fileReferences,
							},
						);
						return { files };
					} finally {
						await rm(dir, { recursive: true, force: true });
					}
				},
			),
		};
		csvService = new AgentKnowledgeCsvService(mockKnowledgeService());
	});

	it('describes a top-level object input schema for providers', () => {
		const tool = createTool();

		expect(tool.inputSchema).toMatchObject({
			type: 'object',
			properties: expect.objectContaining({
				operation: expect.objectContaining({ type: 'string' }),
				where: expect.any(Object),
				select: expect.any(Object),
			}),
		});
		expect((tool.inputSchema as JSONSchema7).properties).not.toHaveProperty('request');
		expect(tool.inputSchema).not.toHaveProperty('oneOf');
		const properties = (tool.inputSchema as JSONSchema7).properties as Record<
			string,
			{ default?: unknown; description?: string }
		>;
		expect(properties.output_mode.default).toBe('files_with_matches');
		expect(properties.head_limit.default).toBe(250);
		expect(properties.match_mode.default).toBe('any');
		expect(String(properties.queries.description)).toContain('multiple literal search terms');
		expect((tool.inputSchema as JSONSchema7).properties).not.toHaveProperty('mode');
		expect((tool.inputSchema as JSONSchema7).properties).not.toHaveProperty('maxResults');
		expect(String(properties.file.description)).toContain(
			'cite the returned fileName and lineRange instead',
		);
	});

	it('keeps the provider JSON schema property names in sync with the Zod parsing schema', () => {
		// The flat JSON schema (steered at the LLM) and the strict Zod discriminated
		// union (used for validation) are maintained by hand. Guard against drift by
		// asserting they expose the exact same set of field names.
		const zodKeys = new Set(
			searchKnowledgeParsingSchema.options.flatMap((option) => Object.keys(option.shape)),
		);
		const jsonKeys = new Set(Object.keys(searchKnowledgeInputSchema.properties ?? {}));

		expect(jsonKeys).toEqual(zodKeys);
	});

	it('lists uploaded knowledge files', async () => {
		knowledgeService.listWorkspaceFiles.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 12,
				relativePath: 'file-1-notes.txt',
			},
		]);
		const tool = createTool();

		await expect(tool.handler?.({ operation: 'list' }, {} as never)).resolves.toMatchObject({
			operation: 'list',
			files: [
				{
					id: 'file-1',
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		expect(knowledgeService.listWorkspaceFiles).toHaveBeenCalledWith(agentId, projectId);
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
		expect(sandboxWorkspaceService.withCachedWorkspace).not.toHaveBeenCalled();
	});

	it('returns a tool error when workspace materialization fails', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockRejectedValue(
			new Error('storage unavailable'),
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle' }, {} as never),
		).resolves.toMatchObject({
			operation: 'search',
			files: [],
			error: 'storage unavailable',
		});
	});

	it('searches materialized text files', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1-notes.txt'), 'hello\nneedle\n');
				return [
					{
						id: 'file-1',
						fileName: 'notes.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 13,
						relativePath: 'file-1-notes.txt',
					},
				];
			},
		);
		const tool = createTool();

		const result = await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(result).toMatchObject({
			operation: 'search',
			result: {
				command: 'search',
				exitCode: 0,
			},
			search: {
				mode: 'files_with_matches',
				files: [expect.objectContaining({ relativePath: 'file-1-notes.txt' })],
				matches: [],
			},
		});
		const stdout = (result as { result: { stdout: string } }).result.stdout;
		expect(stdout).toContain('notes.txt');
		expect(stdout).not.toContain('needle');
	});

	it('reuses the stable workspace cache key across searches', async () => {
		const files = [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		];
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files,
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const nodePath = await import('node:path');
				await writeFile(nodePath.join(workspaceRoot, 'file-1-notes.txt'), 'hello\nneedle\n');
				return files;
			},
		);
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);
		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		const withCachedWorkspaceMock = sandboxWorkspaceService.withCachedWorkspace as jest.Mock;
		expect(withCachedWorkspaceMock).toHaveBeenCalledTimes(2);
		expect(withCachedWorkspaceMock.mock.calls[0]?.[0]).toBe(`${projectId}:${agentId}:workspace`);
		expect(withCachedWorkspaceMock.mock.calls[1]?.[0]).toBe(`${projectId}:${agentId}:workspace`);
	});

	it('resolves the full corpus once for unscoped search', async () => {
		knowledgeService.resolveWorkspaceForSandboxOperation.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
			storedFiles: [
				{
					id: 'file-1',
					agentId,
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					binaryDataId: 'binary-file-1',
					createdAt: new Date('2026-05-24T12:00:00.000Z'),
				},
			] as never,
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		]);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'search',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(knowledgeService.resolveWorkspaceForSandboxOperation).toHaveBeenCalledWith(
			agentId,
			projectId,
			undefined,
		);
		expect(knowledgeService.resolveWorkspaceFilesForRuntime).not.toHaveBeenCalled();
		expect(knowledgeService.resolveStoredFilesForMaterialization).not.toHaveBeenCalled();
	});

	it('reuses the same workspace cache key for search and read operations', async () => {
		const fullFiles = [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
			{
				id: 'file-2',
				fileName: 'other.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 11,
				relativePath: 'file-2-other.txt',
			},
		];
		knowledgeService.resolveWorkspaceFilesForRuntime.mockImplementation(
			async (_agentId, _projectId, fileReferences) => {
				if (fileReferences) {
					return { files: fullFiles.filter((file) => file.fileName === fileReferences[0]) };
				}
				return { files: fullFiles };
			},
		);
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue(fullFiles);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'search',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'read',
			exitCode: 0,
			stdout: 'hello',
			stderr: '',
			truncated: false,
		});
		await tool.handler?.(
			{ operation: 'read', file: 'notes.txt', lineRange: { start: 1, end: 1 } },
			{} as never,
		);

		const withCachedWorkspaceMock = sandboxWorkspaceService.withCachedWorkspace as jest.Mock;
		expect(withCachedWorkspaceMock).toHaveBeenCalledTimes(2);
		expect(withCachedWorkspaceMock.mock.calls[0]?.[0]).toBe(
			withCachedWorkspaceMock.mock.calls[1]?.[0],
		);
		expect(knowledgeService.resolveWorkspaceForSandboxOperation).toHaveBeenCalledWith(
			agentId,
			projectId,
			['notes.txt'],
		);
	});

	it('reuses the same workspace cache key for read operations on different files', async () => {
		const fullFiles = [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
			{
				id: 'file-2',
				fileName: 'other.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 11,
				relativePath: 'file-2-other.txt',
			},
		];
		knowledgeService.resolveWorkspaceFilesForRuntime.mockImplementation(
			async (_agentId, _projectId, fileReferences) => {
				if (fileReferences) {
					return { files: fullFiles.filter((file) => file.fileName === fileReferences[0]) };
				}
				return { files: fullFiles };
			},
		);
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue(fullFiles);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'read',
			exitCode: 0,
			stdout: 'hello',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.(
			{ operation: 'read', file: 'notes.txt', lineRange: { start: 1, end: 1 } },
			{} as never,
		);
		await tool.handler?.(
			{ operation: 'read', file: 'other.txt', lineRange: { start: 1, end: 1 } },
			{} as never,
		);

		const withCachedWorkspaceMock = sandboxWorkspaceService.withCachedWorkspace as jest.Mock;
		expect(withCachedWorkspaceMock).toHaveBeenCalledTimes(2);
		expect(withCachedWorkspaceMock.mock.calls[0]?.[0]).toBe(
			withCachedWorkspaceMock.mock.calls[1]?.[0],
		);
	});

	it('materializes only requested files while scoping sandbox commands to requested files', async () => {
		const fullFiles = [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
			{
				id: 'file-2',
				fileName: 'other.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 11,
				relativePath: 'file-2-other.txt',
			},
		];
		knowledgeService.resolveWorkspaceFilesForRuntime.mockImplementation(
			async (_agentId, _projectId, fileReferences) => {
				if (fileReferences) {
					return { files: fullFiles.filter((file) => file.fileName === fileReferences[0]) };
				}
				return { files: fullFiles };
			},
		);
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue(fullFiles);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'read',
			exitCode: 0,
			stdout: 'hello',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.(
			{ operation: 'read', file: 'notes.txt', lineRange: { start: 1, end: 1 } },
			{} as never,
		);

		expect(knowledgeService.buildExpectedSandboxManifest).toHaveBeenCalledWith(agentId, projectId, [
			expect.objectContaining({
				id: 'file-1',
				fileName: 'notes.txt',
			}),
		]);
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			[expect.objectContaining({ id: 'file-1' })],
		);
		expect(sandboxCommandService.run).toHaveBeenCalledWith(
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			expect.objectContaining({ command: 'read', file: 'file-1-notes.txt' }),
		);
	});

	it('accepts a singular file reference for search', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockImplementation(
			async (_agentId, _projectId, fileReferences) => {
				const files = [
					{
						id: 'file-1',
						fileName: 'notes.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 7,
						relativePath: 'file-1-notes.txt',
					},
					{
						id: 'file-2',
						fileName: 'other-notes.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 7,
						relativePath: 'file-2-notes.txt',
					},
				];
				const scopedFiles = fileReferences
					? files.filter((file) => file.fileName === fileReferences[0])
					: files;
				return { files: scopedFiles };
			},
		);
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1-notes.txt'), 'needle\n');
				await writeFile(path.join(workspaceRoot, 'file-2-notes.txt'), 'needle\n');
				return [
					{
						id: 'file-1',
						fileName: 'notes.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 7,
						relativePath: 'file-1-notes.txt',
					},
					{
						id: 'file-2',
						fileName: 'other-notes.txt',
						mimeType: 'text/plain',
						fileSizeBytes: 7,
						relativePath: 'file-2-notes.txt',
					},
				];
			},
		);
		const tool = createTool();

		const result = await tool.handler?.(
			{ operation: 'search', query: 'needle', file: 'notes.txt' },
			{} as never,
		);

		expect(result).toMatchObject({
			operation: 'search',
			search: {
				files: [expect.objectContaining({ fileName: 'notes.txt' })],
			},
		});
		expect((result as { search: { files: unknown[] } }).search.files).toHaveLength(1);
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			[expect.objectContaining({ id: 'file-1' })],
		);
	});

	it('rejects search file references when the file alias would exceed the cap', async () => {
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'search',
					query: 'needle',
					file: 'extra.md',
					files: Array.from({ length: 10 }, (_, index) => `file-${index + 1}.md`),
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'search',
			files: [],
			error: expect.stringContaining('Search can target at most 10 files.'),
		});
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
	});

	it('limits content results with head_limit', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				const repeatedNeedles = Array.from(
					{ length: 12 },
					(_, index) => `needle ${index + 1}`,
				).join('\n');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), repeatedNeedles);
				await writeFile(path.join(workspaceRoot, 'file-2.md'), repeatedNeedles);
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 120,
						relativePath: 'file-1.md',
					},
					{
						id: 'file-2',
						fileName: 'book-two.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 120,
						relativePath: 'file-2.md',
					},
				];
			},
		);
		const tool = createTool();

		const result = await tool.handler?.(
			{
				operation: 'search',
				query: 'needle',
				output_mode: 'content',
				files: ['file-1'],
				head_limit: 10,
			},
			{} as never,
		);
		const stdout = (result as { result: { stdout: string } }).result.stdout;

		expect(result).toMatchObject({
			operation: 'search',
			result: {
				truncated: true,
			},
			search: {
				mode: 'content',
				matches: expect.any(Array),
				appliedLimit: 10,
				nextOffset: 10,
				hint: expect.stringContaining('Continue with offset=10 and head_limit=10'),
			},
		});
		expect(stdout).toMatch(/book-one\.md:10:needle 10/);
		expect(stdout).not.toMatch(/book-one\.md:11:needle 11/);
		expect(stdout).toContain('Continue with offset=10 and head_limit=10');
	});
	it('returns content matches only when requested', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), 'first\nneedle\n');
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 20,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle', output_mode: 'content' }, {} as never),
		).resolves.toMatchObject({
			operation: 'search',
			search: {
				mode: 'content',
				totalMatchingFiles: 1,
				totalMatchingLines: 1,
				matches: [
					expect.objectContaining({
						fileId: 'file-1',
						lineNumber: 2,
						text: 'needle',
						readRange: { start: 1, end: 8 },
					}),
				],
			},
		});
	});

	it('defaults broad searches to matching files without line dumps', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.md'),
					Array.from({ length: 30 }, (_, index) => `needle ${index + 1}`).join('\n'),
				);
				await writeFile(
					path.join(workspaceRoot, 'file-2.md'),
					Array.from({ length: 5 }, (_, index) => `needle ${index + 1}`).join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 300,
						relativePath: 'file-1.md',
					},
					{
						id: 'file-2',
						fileName: 'book-two.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 50,
						relativePath: 'file-2.md',
					},
				];
			},
		);
		const tool = createTool();

		const result = await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(result).toMatchObject({
			operation: 'search',
			result: {
				truncated: false,
				stdout: expect.stringContaining('book-one.md'),
			},
			search: {
				mode: 'files_with_matches',
				totalMatchingFiles: 2,
				totalMatchingLines: 35,
				files: expect.arrayContaining([
					expect.objectContaining({
						id: 'file-1',
						matchCount: 30,
					}),
				]),
				matches: [],
				hint: expect.stringContaining('Use read'),
			},
		});
		expect((result as { result: { stdout: string } }).result.stdout).not.toContain('needle');
		expect((result as { result: { stdout: string } }).result.stdout).not.toContain('file-1.md');
	});
	it('returns per-file counts', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), 'needle\nneedle\n');
				await writeFile(path.join(workspaceRoot, 'file-2.md'), 'needle\n');
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 20,
						relativePath: 'file-1.md',
					},
					{
						id: 'file-2',
						fileName: 'book-two.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 10,
						relativePath: 'file-2.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle', output_mode: 'count' }, {} as never),
		).resolves.toMatchObject({
			search: {
				mode: 'count',
				totalMatchingFiles: 2,
				totalMatchingLines: 3,
				files: [
					expect.objectContaining({ id: 'file-1', matchCount: 2 }),
					expect.objectContaining({ id: 'file-2', matchCount: 1 }),
				],
			},
		});
	});
	it('uses extended regex for non-fixed search patterns', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), 'freedom\nnecessity\n');
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 20,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'search',
					query: 'freedom|necessity',
					output_mode: 'content',
					fixedStrings: false,
				},
				{} as never,
			),
		).resolves.toMatchObject({
			search: {
				totalMatchingLines: 2,
				matches: [
					expect.objectContaining({ text: 'freedom' }),
					expect.objectContaining({ text: 'necessity' }),
				],
			},
		});
	});

	it('trims very long content match lines while preserving read ranges', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), `needle ${'x'.repeat(700)}\n`);
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 720,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle', output_mode: 'content' }, {} as never),
		).resolves.toMatchObject({
			search: {
				matches: [
					expect.objectContaining({
						lineNumber: 1,
						readRange: { start: 1, end: 7 },
						text: expect.stringContaining('[line truncated; use read for full text]'),
						truncated: true,
					}),
				],
			},
			result: {
				stdout: expect.stringContaining('[line truncated; use read for full text]'),
			},
		});
	});

	it('supports multi-query any search without hand-written regex', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), 'necessity\nfreedom\n');
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 20,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'search',
					queries: ['necessity', 'freedom'],
					output_mode: 'content',
					match_mode: 'any',
				},
				{} as never,
			),
		).resolves.toMatchObject({
			search: {
				query: 'necessity',
				queries: ['necessity', 'freedom'],
				matchMode: 'any',
				totalMatchingFiles: 1,
				totalMatchingLines: 2,
				matches: [
					expect.objectContaining({ text: 'necessity' }),
					expect.objectContaining({ text: 'freedom' }),
				],
			},
		});
	});

	it('filters multi-query matches using full line text before display truncation', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.md'),
					`needle ${'x'.repeat(700)} tailterm\n`,
				);
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 720,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'search',
					queries: ['needle', 'tailterm'],
					output_mode: 'content',
					match_mode: 'all_on_same_line',
				},
				{} as never,
			),
		).resolves.toMatchObject({
			search: {
				totalMatchingLines: 1,
				matches: [
					expect.objectContaining({
						lineNumber: 1,
						text: expect.stringContaining('[line truncated; use read for full text]'),
						truncated: true,
					}),
				],
			},
		});
	});

	it('supports multi-query all_within_lines search without hand-written regex', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.md'),
					['necessity governs history', 'bridge line', 'free will is constrained'].join('\n'),
				);
				await writeFile(
					path.join(workspaceRoot, 'file-2.md'),
					[
						'necessity appears here',
						'many lines later',
						'still later',
						'more distance',
						'free will appears',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'book-one.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 80,
						relativePath: 'file-1.md',
					},
					{
						id: 'file-2',
						fileName: 'book-two.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 80,
						relativePath: 'file-2.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'search',
					queries: ['necessity', 'free will'],
					output_mode: 'content',
					match_mode: 'all_within_lines',
				},
				{} as never,
			),
		).resolves.toMatchObject({
			search: {
				matchMode: 'all_within_lines',
				totalMatchingFiles: 1,
				totalMatchingLines: 2,
				matches: [
					expect.objectContaining({ fileId: 'file-1', lineNumber: 1 }),
					expect.objectContaining({ fileId: 'file-1', lineNumber: 3 }),
				],
			},
		});
	});
	it('rejects public command operations without materializing files', async () => {
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'command',
					request: { command: 'read', file: 'file-1' },
				},
				{} as never,
			),
		).resolves.toMatchObject({
			files: [],
			error: expect.stringContaining('Invalid discriminator value'),
		});
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
	});

	it('reads extracted PDF text when materialized as text', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.pdf.txt'), 'extracted PDF text\n');
				return [
					{
						id: 'file-1',
						fileName: 'document.pdf',
						mimeType: 'text/plain',
						fileSizeBytes: 200,
						relativePath: 'file-1.pdf.txt',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'read', file: 'file-1' }, {} as never),
		).resolves.toMatchObject({
			operation: 'read',
			files: [
				expect.objectContaining({
					fileName: 'document.pdf',
					relativePath: 'file-1.pdf.txt',
				}),
			],
			result: {
				command: 'read',
				stdout: 'extracted PDF text\n',
				citation: {
					fileName: 'document.pdf',
					instruction: expect.stringContaining('Do not cite file ids'),
				},
			},
		});
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			[expect.objectContaining({ id: 'file-1' })],
		);
	});

	it('reads materialized files by display file name', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.md'), 'book text\n');
				return [
					{
						id: 'file-1',
						fileName: 'Moby Dick.md',
						mimeType: 'text/markdown',
						fileSizeBytes: 10,
						relativePath: 'file-1.md',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'read', file: 'Moby Dick.md' }, {} as never),
		).resolves.toMatchObject({
			operation: 'read',
			result: {
				command: 'read',
				stdout: 'book text\n',
				citation: {
					fileName: 'Moby Dick.md',
				},
			},
		});
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			[expect.objectContaining({ id: 'file-1' })],
		);
	});

	it('queries CSV rows with selected columns in one operation', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					[
						'country,year,population,co2,co2_per_capita',
						'Germany,2022,84086227,667.843,7.942',
						'France,2022,66277412,295.304,4.456',
						'Germany,2021,83196078,677.998,8.149',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'owid-co2-data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 200,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					where: [
						{ column: 'country', op: 'in', value: ['Germany', 'France'] },
						{ column: 'year', op: 'eq', value: '2022' },
					],
					select: ['country', 'year', 'population', 'co2', 'co2_per_capita'],
					limit: 10,
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			csv: {
				fileName: 'owid-co2-data.csv',
				relativePath: 'file-1.csv',
				columns: ['country', 'year', 'population', 'co2', 'co2_per_capita'],
				rowNumbers: [2, 3],
				rows: [
					['Germany', '2022', '84086227', '667.843', '7.942'],
					['France', '2022', '66277412', '295.304', '4.456'],
				],
				rowCount: 2,
				truncated: false,
			},
		});
	});
	it('queries CSV columns with quoted commas in their header names', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					['"country,name",year', '"Germany,Federal Republic",2022'].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'quoted.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 53,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					select: ['country,name', 'year'],
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			csv: {
				columns: ['country,name', 'year'],
				rows: [['Germany,Federal Republic', '2022']],
			},
		});
	});
	it('profiles CSV schemas with sample rows, inferred types, and disambiguating columns', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					[
						'Source,Year,Mean,Reviewed,Date,Notes',
						'GCAG,1880,-0.12,true,1880-01-01,',
						'GCAG,1881,-0.09,false,1881-01-01,estimated',
						'GISTEMP,1880,-0.2,true,1880-01-01,',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 180,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'csv_profile', file: 'file-1', sampleSize: 2 }, {} as never),
		).resolves.toMatchObject({
			operation: 'csv_profile',
			csvProfile: {
				fileName: 'temperature.csv',
				columns: ['Source', 'Year', 'Mean', 'Reviewed', 'Date', 'Notes'],
				rowCount: 3,
				sampleRows: [
					{
						Source: 'GCAG',
						Year: '1880',
						Mean: '-0.12',
					},
					{
						Source: 'GCAG',
						Year: '1881',
						Mean: '-0.09',
					},
				],
				columnProfiles: expect.arrayContaining([
					expect.objectContaining({
						name: 'Year',
						inferredType: 'integer',
						emptyCount: 0,
						distinctCount: 2,
					}),
					expect.objectContaining({
						name: 'Mean',
						inferredType: 'number',
					}),
					expect.objectContaining({
						name: 'Reviewed',
						inferredType: 'boolean',
					}),
					expect.objectContaining({
						name: 'Date',
						inferredType: 'date',
					}),
					expect.objectContaining({
						name: 'Notes',
						inferredType: 'string',
						emptyCount: 2,
					}),
				]),
				likelyDisambiguatingColumns: expect.arrayContaining(['Year', 'Source']),
			},
		});
	});

	it('returns CSV row metadata and ambiguity guidance for repeated filters', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					[
						'Source,Year,Mean',
						'GCAG,1880,-0.12',
						'GCAG,1881,-0.09',
						'GCAG,1882,-0.1',
						'GISTEMP,1880,-0.2',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 120,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					where: [{ column: 'Source', op: 'eq', value: 'GCAG' }],
					select: ['Mean'],
					limit: 1,
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			csv: {
				columns: ['Mean'],
				rows: [['-0.12']],
				rowNumbers: [2],
				records: [
					{
						rowNumber: 2,
						fileLineNumber: 2,
						values: { Mean: '-0.12' },
					},
				],
				rowCount: 3,
				truncated: true,
				ambiguity: {
					matchedRows: 3,
					suggestedColumns: expect.arrayContaining(['Year']),
					sampleDistinctValues: {
						Year: ['1880', '1881', '1882'],
					},
				},
			},
		});
	});

	it('fetches exact CSV rows by row number with file-line metadata', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					['Source,Year,Mean', 'GCAG,1880,-0.12', 'GCAG,1881,-0.09'].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 80,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					rowNumber: 3,
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			csv: {
				columns: ['Source', 'Year', 'Mean'],
				rowNumbers: [3],
				rows: [['GCAG', '1881', '-0.09']],
				records: [
					{
						rowNumber: 3,
						fileLineNumber: 3,
						values: {
							Source: 'GCAG',
							Year: '1881',
							Mean: '-0.09',
						},
					},
				],
				rowCount: 1,
				truncated: false,
			},
		});
	});

	it('returns distinct CSV values for filtered rows', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					[
						'Source,Year,Mean',
						'GCAG,1880,-0.12',
						'GCAG,1881,-0.09',
						'GCAG,1881,-0.08',
						'GISTEMP,1880,-0.2',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 120,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_distinct',
					file: 'file-1',
					column: 'Year',
					where: [{ column: 'Source', op: 'eq', value: 'GCAG' }],
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_distinct',
			csvDistinct: {
				column: 'Year',
				values: ['1880', '1881'],
				distinctCount: 2,
				truncated: false,
			},
		});
	});

	it('computes CSV aggregates from all streamed matches', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(
					path.join(workspaceRoot, 'file-1.csv'),
					[
						'Source,Year,Mean',
						'GCAG,1880,-0.12',
						'GCAG,1881,-0.09',
						'GISTEMP,1880,-0.2',
						'GISTEMP,1881,n/a',
						'GISTEMP,1882,   ',
					].join('\n'),
				);
				return [
					{
						id: 'file-1',
						fileName: 'temperature.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 120,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_aggregate',
					file: 'file-1',
					metric: 'Mean',
					functions: ['count', 'min', 'max', 'sum', 'avg'],
					groupBy: ['Source'],
					orderBy: { column: 'Source', direction: 'asc' },
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_aggregate',
			csvAggregate: {
				rowCount: 5,
				functions: ['count', 'min', 'max', 'sum', 'avg'],
				metrics: ['Mean'],
				groupBy: ['Source'],
				results: [
					{
						Source: 'GCAG',
						count: 2,
						min_Mean: -0.12,
						max_Mean: -0.09,
						sum_Mean: -0.21,
						avg_Mean: -0.105,
					},
					{
						Source: 'GISTEMP',
						count: 3,
						min_Mean: -0.2,
						max_Mean: -0.2,
						sum_Mean: -0.2,
						avg_Mean: -0.2,
					},
				],
				skippedNonNumeric: {
					Mean: 2,
				},
			},
		});
	});

	it('suggests close CSV column names for bad column requests', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				await writeFile(path.join(workspaceRoot, 'file-1.csv'), 'country,year\nGermany,2022\n');
				return [
					{
						id: 'file-1',
						fileName: 'owid-co2-data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 27,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					select: ['coutry'],
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			error: expect.stringContaining('Did you mean "country"?'),
		});
	});
	it('continues streaming CSV queries past ten thousand rows', async () => {
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const workspaceRoot = target.knowledgeRoot;
				const { writeFile } = await import('node:fs/promises');
				const path = await import('node:path');
				const rows = ['country,year'];
				for (let index = 0; index < 10_000; index++) {
					rows.push(`Other ${index},2022`);
				}
				rows.push('Germany,2022');
				await writeFile(path.join(workspaceRoot, 'file-1.csv'), rows.join('\n'));
				return [
					{
						id: 'file-1',
						fileName: 'large.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 50 * 1024 * 1024,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await expect(
			tool.handler?.(
				{
					operation: 'csv_query',
					file: 'file-1',
					where: [{ column: 'country', op: 'eq', value: 'Germany' }],
					select: ['country', 'year'],
				},
				{} as never,
			),
		).resolves.toMatchObject({
			operation: 'csv_query',
			csv: {
				fileName: 'large.csv',
				rows: [['Germany', '2022']],
				rowNumbers: [10002],
				rowCount: 1,
				truncated: false,
			},
		});
	});

	it('skips sandbox materialization when cached manifest is fresh', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		(sandboxWorkspaceService.ensureWorkspaceContainsFiles as jest.Mock).mockResolvedValue({
			files: undefined,
			freshness: { status: 'fresh' },
		});
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'search',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(sandboxWorkspaceService.ensureWorkspaceContainsFiles).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).not.toHaveBeenCalled();
		expect(sandboxCommandService.run).toHaveBeenCalled();
	});

	it('materializes when workspace service reports stale', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		]);
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(sandboxWorkspaceService.ensureWorkspaceContainsFiles).toHaveBeenCalled();
		expect(knowledgeService.buildExpectedSandboxManifest).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.any(Array),
		);
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			expect.any(Array),
		);
	});

	it('routes search through sandbox workspace and materialization', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		]);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'search',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(sandboxWorkspaceService.withCachedWorkspace).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalled();
		expect(sandboxCommandService.run).toHaveBeenCalled();
	});

	it('returns a tool error for missing search file references before command execution', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		]);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle', files: ['missing.txt'] }, {} as never),
		).resolves.toMatchObject({
			operation: 'search',
			error: 'File "missing.txt" not found',
		});
		expect(sandboxCommandService.run).not.toHaveBeenCalled();
	});

	it('routes read through sandbox command service', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockResolvedValue([
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		]);
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'read',
			exitCode: 0,
			stdout: 'hello world',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'read', file: 'file-1' }, {} as never);

		expect(sandboxWorkspaceService.withCachedWorkspace).toHaveBeenCalled();
		expect(sandboxCommandService.run).toHaveBeenCalledWith(
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			expect.objectContaining({ command: 'read', file: 'file-1-notes.txt' }),
		);
	});

	it('sanitizes internal sandbox paths from tool errors', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'notes.txt',
					mimeType: 'text/plain',
					fileSizeBytes: 13,
					relativePath: 'file-1-notes.txt',
				},
			],
		});
		knowledgeService.materializeWorkspaceFilesIntoSandbox.mockRejectedValue(
			new Error('Failed to write /home/daytona/workspace/.agent-knowledge-internal/secret/part-1'),
		);
		const tool = createTool();

		await expect(
			tool.handler?.({ operation: 'search', query: 'needle' }, {} as never),
		).resolves.toMatchObject({
			operation: 'search',
			error: 'Failed to write [path]',
		});
	});

	it('routes csv operations through backend file streaming without sandbox materialization', async () => {
		const file = {
			id: 'file-1',
			fileName: 'data.csv',
			mimeType: 'text/csv',
			fileSizeBytes: 20,
			relativePath: 'file-1.csv',
		};
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [file],
		});
		const { Readable } = await import('node:stream');
		knowledgeService.openWorkspaceFileStream.mockResolvedValue({
			file,
			contentStream: Readable.from(['country,year\nGermany,2022\n']),
		});
		const tool = createTool();

		await tool.handler?.(
			{
				operation: 'csv_query',
				file: 'file-1',
				select: ['country', 'year'],
			},
			{} as never,
		);

		expect(sandboxWorkspaceService.withCachedWorkspace).not.toHaveBeenCalled();
		expect(knowledgeService.openWorkspaceFileStream).toHaveBeenCalledWith(
			agentId,
			projectId,
			'file-1',
		);
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
	});
});
