import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { MockedFunction } from 'vitest';

import { executeTool } from '../../../__tests__/tool-test-utils';
import type { SandboxWorkspace } from '../../../workspace/sandbox-fs';
import { writeFileViaSandbox } from '../../../workspace/sandbox-fs';
import { createWriteSandboxFileTool } from '../write-sandbox-file.tool';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('../../../workspace/sandbox-fs', () => ({
	writeFileViaSandbox: vi.fn(),
}));

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(),
}));

const mockWriteFile = writeFileViaSandbox as MockedFunction<typeof writeFileViaSandbox>;
const mockGetRoot = getWorkspaceRoot as MockedFunction<typeof getWorkspaceRoot>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockWorkspace(): SandboxWorkspace {
	return {
		sandbox: {
			executeCommand: vi.fn(),
		},
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createWriteSandboxFileTool', () => {
	let workspace: SandboxWorkspace;

	beforeEach(() => {
		vi.clearAllMocks();
		workspace = createMockWorkspace();
		mockGetRoot.mockResolvedValue('/home/user/workspace');
	});

	it('has the expected tool id and description', () => {
		const tool = createWriteSandboxFileTool(workspace);

		expect(tool.name).toBe('write-file');
		expect(tool.description).toContain('Write content to a file');
	});

	describe('relative path resolution', () => {
		it('resolves a relative path against the workspace root', async () => {
			mockWriteFile.mockResolvedValue(undefined);
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: 'src/workflow.ts', content: 'export default {}' },
				{} as never,
			);

			expect(result).toEqual({
				success: true,
				path: '/home/user/workspace/src/workflow.ts',
			});
			expect(mockWriteFile).toHaveBeenCalledWith(
				workspace,
				'/home/user/workspace/src/workflow.ts',
				'export default {}',
			);
		});
	});

	describe('absolute path resolution', () => {
		it('uses an absolute path within the workspace root directly', async () => {
			mockWriteFile.mockResolvedValue(undefined);
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{
					filePath: '/home/user/workspace/src/index.ts',
					content: 'console.log("hello")',
				},
				{} as never,
			);

			expect(result).toEqual({
				success: true,
				path: '/home/user/workspace/src/index.ts',
			});
			expect(mockWriteFile).toHaveBeenCalledWith(
				workspace,
				'/home/user/workspace/src/index.ts',
				'console.log("hello")',
			);
		});
	});

	describe('path traversal prevention', () => {
		it('rejects paths that traverse outside the workspace root', async () => {
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: '../../etc/passwd', content: 'malicious' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: '../../etc/passwd',
				error: 'Path must be within workspace root (/home/user/workspace)',
			});
			expect(mockWriteFile).not.toHaveBeenCalled();
		});

		it('rejects absolute paths outside the workspace root', async () => {
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: '/etc/passwd', content: 'malicious' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: '/etc/passwd',
				error: 'Path must be within workspace root (/home/user/workspace)',
			});
			expect(mockWriteFile).not.toHaveBeenCalled();
		});

		it('rejects prefix collision attacks (path that starts with root but is a sibling)', async () => {
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: '/home/user/workspace-evil/file.ts', content: 'malicious' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: '/home/user/workspace-evil/file.ts',
				error: 'Path must be within workspace root (/home/user/workspace)',
			});
			expect(mockWriteFile).not.toHaveBeenCalled();
		});

		it('rejects paths with embedded traversal in the middle', async () => {
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{
					filePath: '/home/user/workspace/src/../../etc/passwd',
					content: 'malicious',
				},
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: '/home/user/workspace/src/../../etc/passwd',
				error: 'Path must be within workspace root (/home/user/workspace)',
			});
			expect(mockWriteFile).not.toHaveBeenCalled();
		});
	});

	describe('successful write', () => {
		it('writes the file and returns success with the normalized path', async () => {
			mockWriteFile.mockResolvedValue(undefined);
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: 'chunks/helper.ts', content: 'export const x = 1;' },
				{} as never,
			);

			expect(result).toEqual({
				success: true,
				path: '/home/user/workspace/chunks/helper.ts',
			});
			expect(mockGetRoot).toHaveBeenCalledWith(workspace);
			expect(mockWriteFile).toHaveBeenCalledWith(
				workspace,
				'/home/user/workspace/chunks/helper.ts',
				'export const x = 1;',
			);
		});

		it('allows writing to the workspace root itself', async () => {
			mockWriteFile.mockResolvedValue(undefined);
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: '/home/user/workspace', content: '' },
				{} as never,
			);

			// The path equals the root exactly — this is allowed by the check
			expect(result).toEqual({
				success: true,
				path: '/home/user/workspace',
			});
		});
	});

	describe('error handling', () => {
		it('catches writeFileViaSandbox errors and returns them', async () => {
			mockWriteFile.mockRejectedValue(new Error('Disk full'));
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: 'src/workflow.ts', content: 'content' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: 'src/workflow.ts',
				error: 'Disk full',
			});
		});

		it('handles non-Error exceptions gracefully', async () => {
			mockWriteFile.mockRejectedValue('unexpected string error');
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: 'src/workflow.ts', content: 'content' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: 'src/workflow.ts',
				error: 'Failed to write file',
			});
		});

		it('catches getWorkspaceRoot errors and returns them', async () => {
			mockGetRoot.mockRejectedValue(new Error('Sandbox unavailable'));
			const tool = createWriteSandboxFileTool(workspace);

			const result = await executeTool(
				tool,
				{ filePath: 'src/workflow.ts', content: 'content' },
				{} as never,
			);

			expect(result).toEqual({
				success: false,
				path: 'src/workflow.ts',
				error: 'Sandbox unavailable',
			});
		});
	});
});
