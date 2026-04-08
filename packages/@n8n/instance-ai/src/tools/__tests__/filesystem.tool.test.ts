import type { InstanceAiPermissions } from '@n8n/api-types';

import type { InstanceAiContext } from '../../types';
import { createFilesystemTool } from '../filesystem.tool';

function createMockContext(
	overrides: Partial<Omit<InstanceAiContext, 'permissions'>> & {
		permissions?: Partial<InstanceAiPermissions>;
	} = {},
): InstanceAiContext {
	return {
		userId: 'user-1',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		filesystemService: {
			listFiles: jest.fn(),
			readFile: jest.fn(),
			searchFiles: jest.fn(),
			getFileTree: jest.fn(),
		},
		permissions: { readFilesystem: 'always_allow' },
		...overrides,
	} as unknown as InstanceAiContext;
}

describe('filesystem tool', () => {
	describe('list action', () => {
		it('should call filesystemService.listFiles and return result', async () => {
			const files = [
				{ path: '/home/user/file1.ts', type: 'file' as const },
				{ path: '/home/user/file2.ts', type: 'file' as const },
			];
			const context = createMockContext();
			(context.filesystemService!.listFiles as jest.Mock).mockResolvedValue(files);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!({ action: 'list', dirPath: '/home/user' }, {} as never);

			expect(context.filesystemService!.listFiles).toHaveBeenCalledWith('/home/user', {
				pattern: undefined,
				maxResults: 201,
				type: 'all',
				recursive: true,
			});
			expect(result).toEqual({ files, truncated: false, totalCount: 2 });
		});

		it('should detect truncation when results exceed limit', async () => {
			const files = Array.from({ length: 4 }, (_, i) => ({
				path: `/home/user/file${i}.ts`,
				type: 'file' as const,
			}));
			const context = createMockContext();
			(context.filesystemService!.listFiles as jest.Mock).mockResolvedValue(files);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'list', dirPath: '/home/user', maxResults: 3 },
				{} as never,
			);

			expect(result).toEqual({
				files: files.slice(0, 3),
				truncated: true,
				totalCount: 3,
			});
		});
	});

	describe('read action', () => {
		it('should call filesystemService.readFile and wrap content', async () => {
			const fileContent = {
				path: '/home/user/file.ts',
				content: 'const x = 1;',
				truncated: false,
				totalLines: 1,
			};
			const context = createMockContext();
			(context.filesystemService!.readFile as jest.Mock).mockResolvedValue(fileContent);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'read', filePath: '/home/user/file.ts' },
				{} as never,
			);

			expect(context.filesystemService!.readFile).toHaveBeenCalledWith('/home/user/file.ts', {
				startLine: undefined,
				maxLines: undefined,
			});
			expect(result).toMatchObject({
				path: '/home/user/file.ts',
				truncated: false,
				totalLines: 1,
			});
			// Content should be wrapped with untrusted data markers
			expect((result as { content: string }).content).toContain('const x = 1;');
		});

		it('should return blocked result when permission is blocked', async () => {
			const context = createMockContext({
				permissions: { readFilesystem: 'blocked' },
			});

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'read', filePath: '/home/user/file.ts' },
				{} as never,
			);

			expect(result).toEqual({
				path: '',
				content: '',
				truncated: false,
				totalLines: 0,
				denied: true,
				reason: 'Action blocked by admin',
			});
		});
	});

	describe('search action', () => {
		it('should call filesystemService.searchFiles and return results', async () => {
			const searchResult = {
				query: 'TODO',
				matches: [{ path: '/home/user/file.ts', lineNumber: 5, line: '// TODO: fix this' }],
				truncated: false,
				totalMatches: 1,
			};
			const context = createMockContext();
			(context.filesystemService!.searchFiles as jest.Mock).mockResolvedValue(searchResult);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'search', dirPath: '/home/user', query: 'TODO' },
				{} as never,
			);

			expect(context.filesystemService!.searchFiles).toHaveBeenCalledWith('/home/user', {
				query: 'TODO',
				filePattern: undefined,
				ignoreCase: undefined,
				maxResults: undefined,
			});
			expect(result).toMatchObject({ truncated: false, totalMatches: 1 });
			const typedResult = result as { matches: Array<{ line: string }> };
			expect(typedResult.matches).toHaveLength(1);
			expect(typedResult.matches[0].line).toContain('// TODO: fix this');
		});
	});

	describe('tree action', () => {
		it('should call filesystemService.getFileTree and detect truncation', async () => {
			const treeOutput = 'src/\n  index.ts\n  ... (truncated at depth 2)';
			const context = createMockContext();
			(context.filesystemService!.getFileTree as jest.Mock).mockResolvedValue(treeOutput);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'tree', dirPath: '/home/user/project' },
				{} as never,
			);

			expect(context.filesystemService!.getFileTree).toHaveBeenCalledWith('/home/user/project', {
				maxDepth: 2,
			});
			expect(result).toEqual({ tree: treeOutput, truncated: true });
		});

		it('should not report truncation when tree is complete', async () => {
			const treeOutput = 'src/\n  index.ts';
			const context = createMockContext();
			(context.filesystemService!.getFileTree as jest.Mock).mockResolvedValue(treeOutput);

			const tool = createFilesystemTool(context);
			const result = await tool.execute!(
				{ action: 'tree', dirPath: '/home/user/project' },
				{} as never,
			);

			expect(result).toEqual({ tree: treeOutput, truncated: false });
		});
	});

	describe('permission gate', () => {
		it('should suspend for approval when no permission set', async () => {
			const context = createMockContext({ permissions: {} });
			const suspend = jest.fn();

			const tool = createFilesystemTool(context);
			await tool.execute!({ action: 'list', dirPath: '/home/user' }, {
				agent: { suspend, resumeData: undefined },
			} as never);

			expect(suspend).toHaveBeenCalled();
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			expect(suspend.mock.calls[0][0]).toMatchObject({
				message: 'List files in "/home/user"?',
				severity: 'info',
			});
		});

		it('should return denied result when user rejects', async () => {
			const context = createMockContext({ permissions: {} });

			const tool = createFilesystemTool(context);
			const result = await tool.execute!({ action: 'list', dirPath: '/home/user' }, {
				agent: { resumeData: { approved: false } },
			} as never);

			expect(result).toEqual({
				files: [],
				truncated: false,
				totalCount: 0,
				denied: true,
				reason: 'User denied the action',
			});
		});
	});
});
