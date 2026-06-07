import { Readable } from 'node:stream';

import type { AgentKnowledgeCsvService } from '../../agent-knowledge-csv.service';
import type { AgentKnowledgeSandboxCommandService } from '../../agent-knowledge-sandbox-command.service';
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

const agentId = 'agent-1';
const projectId = 'project-1';

const file = {
	id: 'file-1',
	fileName: 'notes.txt',
	mimeType: 'text/plain',
	fileSizeBytes: 13,
	relativePath: 'file-1.txt',
};

function makeWorkspace(): KnowledgeSandboxWorkspace {
	return {
		sandbox: {
			id: 'sandbox-1',
			name: 'Sandbox',
			provider: 'n8n-sandbox',
			status: 'running',
		},
		filesystem: {} as KnowledgeSandboxWorkspace['filesystem'],
		provider: 'n8n-sandbox',
		workspaceRoot: '/home/user/workspace',
		knowledgeRoot: '/home/user/workspace/agent-knowledge',
		internalRoot: '/home/user/workspace/.agent-knowledge-internal',
		manifestPath: '/home/user/workspace/.agent-knowledge-internal/manifest.json',
	};
}

describe('search_knowledge tool', () => {
	let commandService: { run: jest.Mock };
	let csvService: { queryCsv: jest.Mock };
	let sandboxWorkspaceService: {
		ensureWorkspaceContainsFiles: jest.Mock;
		withCachedWorkspace: jest.Mock;
	};
	let knowledgeService: {
		buildExpectedSandboxManifest: jest.Mock;
		listWorkspaceFiles: jest.Mock;
		materializeWorkspaceFilesIntoSandbox: jest.Mock;
		openWorkspaceFileStream: jest.Mock;
		resolveWorkspaceFilesForRuntime: jest.Mock;
		resolveWorkspaceForSandboxOperation: jest.Mock;
	};

	function createTool() {
		return createSearchKnowledgeTool({
			agentId,
			projectId,
			knowledgeService: knowledgeService as unknown as AgentKnowledgeService,
			sandboxCommandService: commandService as unknown as AgentKnowledgeSandboxCommandService,
			csvService: csvService as unknown as AgentKnowledgeCsvService,
			sandboxWorkspaceService:
				sandboxWorkspaceService as unknown as AgentKnowledgeSandboxWorkspaceService,
		});
	}

	beforeEach(() => {
		commandService = {
			run: jest.fn(async (_workspace, request) => ({
				command: request.command,
				exitCode: 0,
				stdout: request.command === 'read' ? 'hello world' : 'file-1.txt:1\n',
				stderr: '',
				truncated: false,
			})),
		};
		csvService = {
			queryCsv: jest.fn(async () => ({
				fileName: 'data.csv',
				relativePath: 'file-1.csv',
				columns: ['country', 'year'],
				rows: [['Germany', '2022']],
				rowNumbers: [2],
				rowCount: 1,
				truncated: false,
			})),
		};
		sandboxWorkspaceService = {
			ensureWorkspaceContainsFiles: jest.fn(async (_workspace, expected, materialize) => {
				const missingFiles = expected.files.map(
					(manifestFile: KnowledgeSandboxExpectedManifest['files'][number]) => ({
						id: manifestFile.id,
						fileName: '',
						mimeType: '',
						fileSizeBytes: manifestFile.fileSizeBytes,
						relativePath: manifestFile.relativePath,
					}),
				);
				await materialize(missingFiles);
				return {
					files: undefined,
					freshness: { status: 'stale' as const, reason: 'missing-required-files' },
				};
			}),
			withCachedWorkspace: jest.fn(
				async (_cacheKey, operation) => await operation(makeWorkspace()),
			),
		};
		knowledgeService = {
			buildExpectedSandboxManifest: jest.fn(
				(_manifestAgentId, _manifestProjectId, storedFiles) => ({
					version: 1,
					agentId,
					projectId,
					files: storedFiles.map((storedFile: { id: string; fileSizeBytes: number }) => ({
						id: storedFile.id,
						relativePath: storedFile.id === 'file-2' ? 'file-2.txt' : 'file-1.txt',
						fileSizeBytes: storedFile.fileSizeBytes,
						binaryDataIdSha1: `sha1-${storedFile.id}`,
					})),
				}),
			),
			listWorkspaceFiles: jest.fn(),
			materializeWorkspaceFilesIntoSandbox: jest.fn(async () => [file]),
			openWorkspaceFileStream: jest.fn(async () => ({
				file: { ...file, fileName: 'data.csv', mimeType: 'text/csv', relativePath: 'file-1.csv' },
				contentStream: Readable.from(['country,year\nGermany,2022\n']),
			})),
			resolveWorkspaceFilesForRuntime: jest.fn(async () => ({ files: [file] })),
			resolveWorkspaceForSandboxOperation: jest.fn(async (_agentId, _projectId, fileReferences) => {
				const scopedFile = fileReferences?.includes('other.txt')
					? { ...file, id: 'file-2', fileName: 'other.txt', relativePath: 'file-2.txt' }
					: file;
				return {
					files: [scopedFile],
					storedFiles: [
						{ ...scopedFile, agentId, binaryDataId: `binary-${scopedFile.id}` },
					] as never,
				};
			}),
		};
	});

	it('keeps the provider JSON schema property names in sync with the Zod parsing schema', () => {
		const zodKeys = new Set(
			searchKnowledgeParsingSchema.options.flatMap((option) => Object.keys(option.shape)),
		);
		const jsonKeys = new Set(Object.keys(searchKnowledgeInputSchema.properties ?? {}));

		expect(jsonKeys).toEqual(zodKeys);
		expect((searchKnowledgeInputSchema as JSONSchema7).properties).not.toHaveProperty('request');
	});

	it('lists uploaded knowledge files without creating a sandbox', async () => {
		knowledgeService.listWorkspaceFiles.mockResolvedValue([file]);

		await expect(createTool().handler?.({ operation: 'list' }, {} as never)).resolves.toMatchObject(
			{
				operation: 'list',
				files: [expect.objectContaining({ id: 'file-1' })],
			},
		);
		expect(sandboxWorkspaceService.withCachedWorkspace).not.toHaveBeenCalled();
	});

	it('uses a stable per-agent cache key and materializes only scoped files', async () => {
		await createTool().handler?.(
			{ operation: 'read', file: 'other.txt', lineRange: { start: 1, end: 1 } },
			{} as never,
		);

		expect(sandboxWorkspaceService.withCachedWorkspace).toHaveBeenCalledWith(
			`${projectId}:${agentId}:workspace`,
			expect.any(Function),
		);
		expect(knowledgeService.resolveWorkspaceForSandboxOperation).toHaveBeenCalledWith(
			agentId,
			projectId,
			['other.txt'],
		);
		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).toHaveBeenCalledWith(
			agentId,
			projectId,
			expect.objectContaining({ knowledgeRoot: expect.any(String) }),
			[expect.objectContaining({ id: 'file-2' })],
		);
		expect(commandService.run).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ command: 'read', file: 'file-2.txt' }),
		);
	});

	it('resolves the full corpus for unscoped search', async () => {
		await createTool().handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(knowledgeService.resolveWorkspaceForSandboxOperation).toHaveBeenCalledWith(
			agentId,
			projectId,
			undefined,
		);
		expect(commandService.run).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ command: 'search', files: undefined }),
		);
	});

	it('skips materialization when the cached manifest is fresh', async () => {
		sandboxWorkspaceService.ensureWorkspaceContainsFiles.mockResolvedValueOnce({
			files: undefined,
			freshness: { status: 'fresh' },
		});

		await createTool().handler?.({ operation: 'search', query: 'needle' }, {} as never);

		expect(knowledgeService.materializeWorkspaceFilesIntoSandbox).not.toHaveBeenCalled();
		expect(commandService.run).toHaveBeenCalled();
	});

	it('fails before command execution when freshness reports an unresolved file', async () => {
		sandboxWorkspaceService.ensureWorkspaceContainsFiles.mockImplementationOnce(
			async (_workspace, _expected, materialize) => {
				await materialize([
					{
						id: 'missing',
						fileName: '',
						mimeType: '',
						fileSizeBytes: 1,
						relativePath: 'missing.txt',
					},
				]);
				return {
					files: undefined,
					freshness: { status: 'stale' as const, reason: 'missing-required-files' },
				};
			},
		);

		await expect(
			createTool().handler?.({ operation: 'search', query: 'needle' }, {} as never),
		).resolves.toMatchObject({
			operation: 'search',
			error: 'Failed to resolve stored knowledge files for sandbox materialization',
		});
		expect(commandService.run).not.toHaveBeenCalled();
	});

	it('sanitizes internal sandbox paths from tool errors', async () => {
		knowledgeService.materializeWorkspaceFilesIntoSandbox.mockRejectedValueOnce(
			new Error('Failed to write /home/daytona/workspace/.agent-knowledge-internal/secret/part-1'),
		);

		await expect(
			createTool().handler?.({ operation: 'search', query: 'needle' }, {} as never),
		).resolves.toMatchObject({ error: 'Failed to write [path]' });
	});

	it('routes CSV operations through file streaming without sandbox materialization', async () => {
		await createTool().handler?.(
			{ operation: 'csv_query', file: 'file-1', select: ['country', 'year'] },
			{} as never,
		);

		expect(knowledgeService.resolveWorkspaceFilesForRuntime).toHaveBeenCalledWith(
			agentId,
			projectId,
			['file-1'],
		);
		expect(csvService.queryCsv).toHaveBeenCalled();
		expect(sandboxWorkspaceService.withCachedWorkspace).not.toHaveBeenCalled();
	});
});
