import type {
	CommandResult,
	ExecuteCommandOptions,
	SandboxFilesystem,
} from '@n8n/ai-utilities/sandbox';

import { resolveKnowledgeCsvRunnerArgs } from '../../__tests__/knowledge-csv-runner-test-utils';
import { AgentKnowledgeSandboxCsvService } from '../../agent-knowledge-sandbox-csv.service';
import type { AgentKnowledgeSandboxCommandService } from '../../agent-knowledge-sandbox-command.service';
import { AgentKnowledgeCommandService } from '../../agent-knowledge-command.service';
import type {
	AgentKnowledgeSandboxWorkspaceService,
	KnowledgeSandboxWorkspace,
} from '../../agent-knowledge-sandbox-workspace.service';
import type { AgentKnowledgeService } from '../../agent-knowledge.service';
import { createSearchKnowledgeTool } from '../knowledge/tool';
import { searchKnowledgeInputSchema, searchKnowledgeParsingSchema } from '../knowledge/schemas';
import type { JSONSchema7 } from 'json-schema';

jest.unmock('node:fs');
jest.unmock('node:fs/promises');

const agentId = 'agent-1';
const projectId = 'project-1';

describe('search_knowledge tool', () => {
	let hostCommandService: AgentKnowledgeCommandService;
	let sandboxCommandService: AgentKnowledgeSandboxCommandService;
	let sandboxCsvService: AgentKnowledgeSandboxCsvService;
	let sandboxWorkspaceService: AgentKnowledgeSandboxWorkspaceService;
	let knowledgeService: jest.Mocked<
		Pick<
			AgentKnowledgeService,
			| 'buildExpectedSandboxManifest'
			| 'listWorkspaceFiles'
			| 'materializeWorkspace'
			| 'materializeWorkspaceIntoSandbox'
			| 'resolveWorkspaceFilesForRuntime'
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
			sandboxCsvService,
			sandboxWorkspaceService,
		});
	}

	beforeEach(() => {
		hostCommandService = new AgentKnowledgeCommandService();
		sandboxCsvService = new AgentKnowledgeSandboxCsvService();
		sandboxCommandService = {
			run: jest.fn(async (workspace, request) => {
				return await hostCommandService.run(workspace.knowledgeRoot, request);
			}),
		} as unknown as AgentKnowledgeSandboxCommandService;
		sandboxWorkspaceService = {
			ensureWorkspaceMaterialized: jest.fn(async (_workspace, _expected, materialize) => {
				await materialize();
				return { files: undefined, freshness: { status: 'stale', reason: 'manifest-missing' } };
			}),
			withCachedWorkspace: jest.fn(async (_cacheKey, operation) => {
				const { mkdtemp, mkdir, rm, writeFile } = await import('node:fs/promises');
				const { spawn } = await import('node:child_process');
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
						executeCommand: async (
							command: string,
							args: string[],
							options: ExecuteCommandOptions,
						) => {
							return await new Promise<CommandResult>((resolve) => {
								const child = spawn(command, resolveKnowledgeCsvRunnerArgs(args), {
									cwd: options.cwd,
									env: { ...process.env, ...options.env },
								});
								let stdout = '';
								let stderr = '';
								child.stdout.on('data', (chunk: Buffer) => {
									const text = chunk.toString();
									stdout += text;
									options.onStdout?.(text);
								});
								child.stderr.on('data', (chunk: Buffer) => {
									const text = chunk.toString();
									stderr += text;
									options.onStderr?.(text);
								});
								const timer =
									options.timeout !== undefined
										? setTimeout(() => {
												child.kill();
											}, options.timeout)
										: undefined;
								child.on('close', (exitCode) => {
									if (timer) clearTimeout(timer);
									resolve({
										success: exitCode === 0,
										exitCode: exitCode ?? 1,
										stdout,
										stderr,
										executionTimeMs: 0,
									});
								});
							});
						},
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
			buildExpectedSandboxManifest: jest.fn(
				(manifestAgentId, manifestProjectId, cacheSignature, files) => ({
					version: 1,
					agentId: manifestAgentId,
					projectId: manifestProjectId,
					cacheSignatureSha1: `sha1-${cacheSignature}`,
					files: files.map((file) => ({
						id: file.id,
						relativePath: file.relativePath,
						fileSizeBytes: file.fileSizeBytes,
					})),
				}),
			),
			listWorkspaceFiles: jest.fn(),
			materializeWorkspace: jest.fn(),
			materializeWorkspaceIntoSandbox: jest.fn(
				async (materializeAgentId, materializeProjectId, target, options) => {
					return await knowledgeService.materializeWorkspace(
						materializeAgentId,
						materializeProjectId,
						target.knowledgeRoot,
						options,
					);
				},
			),
			resolveWorkspaceFilesForRuntime: jest.fn(
				async (resolveAgentId, resolveProjectId, fileReferences) => {
					const { mkdtemp, rm } = await import('node:fs/promises');
					const { tmpdir } = await import('node:os');
					const nodePath = await import('node:path');
					const dir = await mkdtemp(nodePath.join(tmpdir(), 'resolve-'));
					try {
						const files = await knowledgeService.materializeWorkspace(
							resolveAgentId,
							resolveProjectId,
							dir,
							{
								fileReferences,
							},
						);
						return {
							files,
							cacheSignature: files
								.map((file) => `${file.relativePath}:${file.fileSizeBytes}:test-binary`)
								.sort()
								.join('|'),
						};
					} finally {
						await rm(dir, { recursive: true, force: true });
					}
				},
			),
		};
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
		expect(knowledgeService.materializeWorkspace).not.toHaveBeenCalled();
		expect(sandboxWorkspaceService.withCachedWorkspace).not.toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
	});

	it('returns a tool error when workspace materialization fails', async () => {
		knowledgeService.materializeWorkspace.mockRejectedValue(new Error('storage unavailable'));
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
				command: 'git_grep',
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

	it('re-materializes when runtime cache signature changes for the same public files', async () => {
		const files = [
			{
				id: 'file-1',
				fileName: 'notes.txt',
				mimeType: 'text/plain',
				fileSizeBytes: 13,
				relativePath: 'file-1-notes.txt',
			},
		];
		knowledgeService.resolveWorkspaceFilesForRuntime
			.mockResolvedValueOnce({ files, cacheSignature: 'signature-a' })
			.mockResolvedValueOnce({ files, cacheSignature: 'signature-b' });
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
				const { writeFile } = await import('node:fs/promises');
				const nodePath = await import('node:path');
				await writeFile(nodePath.join(workspaceRoot, 'file-1-notes.txt'), 'hello\nneedle\n');
				return files;
			},
		);
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);
		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(knowledgeService.resolveWorkspaceFilesForRuntime).toHaveBeenCalledTimes(2);
		expect(knowledgeService.materializeWorkspaceIntoSandbox).toHaveBeenCalledTimes(2);
	});

	it('accepts a singular file reference for search', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		expect(knowledgeService.materializeWorkspace).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.any(String),
			{ fileReferences: ['notes.txt'] },
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
		expect(knowledgeService.materializeWorkspace).not.toHaveBeenCalled();
	});

	it('limits content results with head_limit', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
				files: ['file-1', 'file-2'],
				head_limit: 20,
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
				appliedLimit: 20,
				nextOffset: 20,
				hint: expect.stringContaining('Continue with offset=20 and head_limit=20'),
			},
		});
		expect(stdout).toContain('book-one.md:12:needle 12');
		expect(stdout).toContain('book-two.md:8:needle 8');
		expect(stdout).not.toContain('book-two.md:9:needle 9');
		expect(stdout).toContain('Continue with offset=20 and head_limit=20');
	});
	it('returns content matches only when requested', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
					request: { command: 'cat', file: 'file-1' },
				},
				{} as never,
			),
		).resolves.toMatchObject({
			files: [],
			error: expect.stringContaining('Invalid discriminator value'),
		});
		expect(knowledgeService.materializeWorkspace).not.toHaveBeenCalled();
	});

	it('reads extracted PDF text when materialized as text', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
				command: 'cat',
				stdout: 'extracted PDF text\n',
				citation: {
					fileName: 'document.pdf',
					instruction: expect.stringContaining('Do not cite file ids'),
				},
			},
		});
		expect(knowledgeService.materializeWorkspace).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.any(String),
			{ fileReferences: ['file-1'] },
		);
	});

	it('reads materialized files by display file name', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
				command: 'cat',
				stdout: 'book text\n',
				citation: {
					fileName: 'Moby Dick.md',
				},
			},
		});
		expect(knowledgeService.materializeWorkspace).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.any(String),
			{ fileReferences: ['Moby Dick.md'] },
		);
	});

	it('queries CSV rows with selected columns in one operation', async () => {
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
		knowledgeService.materializeWorkspace.mockImplementation(
			async (_agentId, _projectId, workspaceRoot) => {
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
			cacheSignature: 'signature-a',
		});
		(sandboxWorkspaceService.ensureWorkspaceMaterialized as jest.Mock).mockResolvedValue({
			files: undefined,
			freshness: { status: 'fresh' },
		});
		(sandboxCommandService.run as jest.Mock).mockResolvedValue({
			command: 'git_grep',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(sandboxWorkspaceService.ensureWorkspaceMaterialized).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceIntoSandbox).not.toHaveBeenCalled();
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
			cacheSignature: 'signature-a',
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

		expect(sandboxWorkspaceService.ensureWorkspaceMaterialized).toHaveBeenCalled();
		expect(knowledgeService.buildExpectedSandboxManifest).toHaveBeenCalledWith(
			agentId,
			projectId,
			'signature-a',
			expect.any(Array),
		);
		expect(knowledgeService.materializeWorkspaceIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			{ fileReferences: undefined },
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
			cacheSignature: 'signature-a',
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
			command: 'git_grep',
			exitCode: 0,
			stdout: 'file-1-notes.txt:1\n',
			stderr: '',
			truncated: false,
		});
		const tool = createTool();

		await tool.handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(sandboxWorkspaceService.withCachedWorkspace).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceIntoSandbox).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspace).not.toHaveBeenCalled();
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
			cacheSignature: 'signature-a',
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
			cacheSignature: 'signature-a',
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
			command: 'cat',
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
			expect.objectContaining({ command: 'cat', file: 'file-1-notes.txt' }),
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
			cacheSignature: 'signature-a',
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockRejectedValue(
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

	it('routes csv operations through sandbox workspace and materialization', async () => {
		knowledgeService.resolveWorkspaceFilesForRuntime.mockResolvedValue({
			files: [
				{
					id: 'file-1',
					fileName: 'data.csv',
					mimeType: 'text/csv',
					fileSizeBytes: 20,
					relativePath: 'file-1.csv',
				},
			],
			cacheSignature: 'signature-a',
		});
		knowledgeService.materializeWorkspaceIntoSandbox.mockImplementation(
			async (_agentId, _projectId, target) => {
				const { writeFile } = await import('node:fs/promises');
				const nodePath = await import('node:path');
				await writeFile(
					nodePath.join(target.knowledgeRoot, 'file-1.csv'),
					'country,year\nGermany,2022\n',
				);
				return [
					{
						id: 'file-1',
						fileName: 'data.csv',
						mimeType: 'text/csv',
						fileSizeBytes: 20,
						relativePath: 'file-1.csv',
					},
				];
			},
		);
		const tool = createTool();

		await tool.handler?.(
			{
				operation: 'csv_query',
				file: 'file-1',
				select: ['country', 'year'],
			},
			{} as never,
		);

		expect(sandboxWorkspaceService.withCachedWorkspace).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspaceIntoSandbox).toHaveBeenCalled();
		expect(knowledgeService.materializeWorkspace).not.toHaveBeenCalled();
	});
});
