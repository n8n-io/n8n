import type { Workspace, WorkspaceFilesystem, WorkspaceSandbox } from '@n8n/agents';
import type { Logger } from '@n8n/backend-common';
import { mock } from 'vitest-mock-extended';

import {
	AgentFileLimitError,
	type AgentChatAttachmentService,
} from '../agent-chat-attachment.service';
import { AgentSandboxFilesService, normalizeOutputPath } from '../agent-sandbox-files.service';
import type { AgentChatAttachment } from '../entities/agent-chat-attachment.entity';

const HASH = 'a'.repeat(64);
const scope = { agentId: 'agent-1', projectId: 'project-1', threadId: 'thread-1' };

describe('AgentSandboxFilesService', () => {
	const attachmentService = mock<AgentChatAttachmentService>({ maxGeneratedFileBytes: 10 });
	const filesystem = mock<WorkspaceFilesystem>();
	const executeCommand = vi.fn<NonNullable<WorkspaceSandbox['executeCommand']>>();
	const sandbox = mock<WorkspaceSandbox>({ executeCommand });
	const workspace = mock<Workspace>({ filesystem, sandbox });
	const service = new AgentSandboxFilesService(mock<Logger>(), attachmentService);

	beforeEach(() => {
		vi.clearAllMocks();
		attachmentService.findReadableByHashes.mockResolvedValue(new Map());
		attachmentService.storeInbound.mockImplementation(
			async (params) => ({ ...params }) as unknown as AgentChatAttachment,
		);
	});

	describe('list', () => {
		it('lists the files of outputs/ with the hashes from the sandbox', async () => {
			executeCommand.mockResolvedValue({
				success: true,
				exitCode: 0,
				stdout: `${HASH}  outputs/report.csv\n${'b'.repeat(64)}  outputs/charts/q1 v2.png\n\\${HASH}  outputs/odd\\nname\n`,
				stderr: '',
				executionTimeMs: 1,
			});

			await expect(service.list(workspace)).resolves.toEqual([
				{ path: 'report.csv', hash: HASH },
				{ path: 'charts/q1 v2.png', hash: 'b'.repeat(64) },
			]);
			expect(executeCommand).toHaveBeenCalledWith(
				'sh',
				['-c', expect.stringContaining('sha256sum')],
				{ abortSignal: undefined },
			);
		});

		it('hashes the files in n8n when the sandbox has no sha256sum, and skips files over the cap', async () => {
			executeCommand.mockResolvedValue({
				success: true,
				exitCode: 0,
				stdout: '__n8n_no_sha256sum__\noutputs/a.txt\noutputs/big.bin\n',
				stderr: '',
				executionTimeMs: 1,
			});
			filesystem.stat.mockImplementation(async (path) => ({
				name: path,
				path,
				type: 'file',
				size: path.endsWith('big.bin') ? 11 : 1,
				createdAt: new Date(),
				modifiedAt: new Date(),
			}));
			filesystem.readFile.mockResolvedValue(Buffer.from('x'));

			await expect(service.list(workspace)).resolves.toEqual([
				{ path: 'a.txt', hash: '2d711642b726b04401627ca9fbac32f5c8530fb1903cc4db02258717921a4881' },
			]);
			expect(filesystem.readFile).toHaveBeenCalledTimes(1);
		});

		it('throws when the command fails', async () => {
			executeCommand.mockResolvedValue({
				success: false,
				exitCode: 127,
				stdout: '',
				stderr: 'sha256sum: not found',
				executionTimeMs: 1,
			});

			await expect(service.list(workspace)).rejects.toThrow('Failed to list');
		});
	});

	describe('syncOutputs', () => {
		const listed = (lines: string[]) =>
			executeCommand.mockResolvedValue({
				success: true,
				exitCode: 0,
				stdout: lines.join('\n'),
				stderr: '',
				executionTimeMs: 1,
			});

		beforeEach(() => {
			filesystem.stat.mockResolvedValue({
				name: 'x',
				path: 'x',
				type: 'file',
				size: 1,
				createdAt: new Date(),
				modifiedAt: new Date(),
			});
			filesystem.readFile.mockResolvedValue(Buffer.from('x'));
		});

		it('stores only the files whose bytes the thread does not have', async () => {
			const known = 'b'.repeat(64);
			listed([
				`${HASH}  outputs/new.txt`,
				`${HASH}  outputs/copy.txt`,
				`${known}  outputs/old.txt`,
			]);
			attachmentService.findReadableByHashes.mockResolvedValueOnce(
				new Map([[known, mock<AgentChatAttachment>()]]),
			);

			await service.syncOutputs(workspace, scope);

			expect(attachmentService.findReadableByHashes).toHaveBeenNthCalledWith(
				1,
				[HASH, HASH, known],
				scope,
			);
			expect(filesystem.readFile).toHaveBeenCalledTimes(1);
			expect(filesystem.readFile).toHaveBeenCalledWith('outputs/new.txt', expect.anything());
		});

		it('goes on after a file fails and never throws', async () => {
			listed([`${HASH}  outputs/a.txt`, `${'c'.repeat(64)}  outputs/b.txt`]);
			filesystem.readFile.mockRejectedValueOnce(new Error('gone'));

			await service.syncOutputs(workspace, scope);

			expect(filesystem.readFile).toHaveBeenCalledTimes(2);
			expect(attachmentService.storeInbound).toHaveBeenCalledTimes(1);
		});

		it('does not throw when the listing fails', async () => {
			executeCommand.mockRejectedValue(new Error('sandbox down'));

			await expect(service.syncOutputs(workspace, scope)).resolves.toBeUndefined();
		});
	});

	describe('store', () => {
		const fileOf = (content: string) => {
			filesystem.stat.mockResolvedValue({
				name: 'x',
				path: 'x',
				type: 'file',
				size: content.length,
				createdAt: new Date(),
				modifiedAt: new Date(),
			});
			filesystem.readFile.mockResolvedValue(Buffer.from(content));
		};

		it('stores a file of outputs/ with its relative path as the name', async () => {
			fileOf('a,b\n');

			const stored = await service.store(workspace, 'reports/q1.csv', scope);

			expect(filesystem.readFile).toHaveBeenCalledWith('outputs/reports/q1.csv', {
				abortSignal: undefined,
			});
			expect(stored).toMatchObject({
				...scope,
				source: 'sandbox',
				fileName: 'reports/q1.csv',
				mimeType: 'text/csv',
				contentHash: expect.stringMatching(/^[0-9a-f]{64}$/),
			});
		});

		it('returns a readable file with the same bytes instead of a new one', async () => {
			fileOf('same');
			const existing = mock<AgentChatAttachment>({ id: 'old' });
			attachmentService.findReadableByHashes.mockImplementation(
				async ([hash]) => new Map([[hash, existing]]),
			);

			await expect(service.store(workspace, 'a.txt', scope)).resolves.toBe(existing);
			expect(attachmentService.storeInbound).not.toHaveBeenCalled();
		});

		it('does not read a file over the size cap', async () => {
			fileOf('x'.repeat(11));

			await expect(service.store(workspace, 'big.bin', scope)).rejects.toThrow(AgentFileLimitError);
			expect(filesystem.readFile).not.toHaveBeenCalled();
		});

		it('rejects a path outside outputs/', async () => {
			await expect(service.store(workspace, '../secret', scope)).rejects.toThrow(
				'is not a file in outputs/',
			);
			expect(filesystem.stat).not.toHaveBeenCalled();
		});

		it('names a file with a long path after its file ID', async () => {
			fileOf('{}');

			const stored = await service.store(workspace, `${'d/'.repeat(130)}x.json`, scope);

			expect(stored.fileName).toBe(`${stored.id}.json`);
		});
	});
});

describe('normalizeOutputPath', () => {
	it.each([
		['a/./b.txt', 'a/b.txt'],
		['a/../b.txt', 'b.txt'],
		['../b.txt', undefined],
		['/etc/passwd', undefined],
		['.', undefined],
		['a/../../b', undefined],
	])('normalizes %s', (path, expected) => {
		expect(normalizeOutputPath(path)).toBe(expected);
	});
});
