import { Readable } from 'node:stream';

import type { SandboxFilesystem, SandboxInstance } from '../types';
import { writeStreamToSandboxFile } from '../write-stream-to-sandbox-file';

function makeFilesystem(provider: 'n8n-sandbox' | 'daytona') {
	return {
		id: `${provider}-fs`,
		name: 'TestFilesystem',
		provider,
		status: 'ready' as const,
		mkdir: vi.fn(async () => {}),
		writeFile: vi.fn(async () => {}),
		appendFile: vi.fn(async () => {}),
		deleteFile: vi.fn(async () => {}),
		exists: vi.fn(async () => false),
	} satisfies Partial<SandboxFilesystem> as unknown as SandboxFilesystem;
}

function makeSandbox(provider: 'n8n-sandbox' | 'daytona') {
	return {
		id: `${provider}-sandbox`,
		name: 'TestSandbox',
		provider,
		status: 'running' as const,
		executeCommand: vi.fn(async () => ({
			command: 'sh',
			args: [],
			success: true,
			exitCode: 0,
			stdout: '',
			stderr: '',
			executionTimeMs: 1,
		})),
	} satisfies Partial<SandboxInstance> as SandboxInstance;
}

describe('writeStreamToSandboxFile', () => {
	it('writes n8n sandbox streams in bounded chunks', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		await writeStreamToSandboxFile(
			filesystem,
			makeSandbox('n8n-sandbox'),
			'/home/user/workspace/agent-knowledge/file.txt',
			Readable.from([Buffer.alloc(2500, 1)]),
			{ chunkSizeBytes: 1024 },
		);

		expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		expect(filesystem.appendFile).toHaveBeenCalledTimes(2);
		for (const [, chunk] of [
			...vi.mocked(filesystem.writeFile).mock.calls,
			...vi.mocked(filesystem.appendFile).mock.calls,
		]) {
			expect(Buffer.isBuffer(chunk) ? chunk.length : Buffer.from(chunk).length).toBeLessThanOrEqual(
				1024,
			);
		}
	});

	it('cleans the n8n sandbox target after a partial write fails', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const error = new Error('append failed');
		vi.mocked(filesystem.appendFile).mockRejectedValueOnce(error);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				makeSandbox('n8n-sandbox'),
				'/home/user/workspace/agent-knowledge/file.txt',
				Readable.from([Buffer.alloc(1500, 1)]),
				{ chunkSizeBytes: 1024 },
			),
		).rejects.toThrow(error);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/user/workspace/agent-knowledge/file.txt',
			{ force: true },
		);
	});

	it('writes Daytona streams through temporary parts and sandbox assembly', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/daytona/workspace/agent-knowledge/file.txt',
			Readable.from([Buffer.alloc(2500, 2)]),
			{
				chunkSizeBytes: 1024,
				temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
			},
		);

		expect(sandbox.executeCommand).toHaveBeenCalledWith('sh', [
			'-lc',
			expect.stringContaining('/home/daytona/workspace/agent-knowledge/file.txt'),
		]);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});

	it('cleans Daytona temporary parts without deleting the target on assembly failure', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		vi.mocked(sandbox.executeCommand!).mockResolvedValueOnce({
			command: 'sh',
			args: [],
			success: false,
			exitCode: 1,
			stdout: '',
			stderr: 'concat failed',
			executionTimeMs: 1,
		});

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/daytona/workspace/agent-knowledge/file.txt',
				Readable.from([Buffer.alloc(1500, 3)]),
				{
					chunkSizeBytes: 1024,
					temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
				},
			),
		).rejects.toThrow(/^Failed to assemble Daytona sandbox file:/);
		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file.txt',
			expect.anything(),
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});

	it('does not overwrite an existing Daytona target with an empty stream when overwrite is false', async () => {
		const filesystem = makeFilesystem('daytona');
		vi.mocked(filesystem.exists).mockResolvedValueOnce(true);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				makeSandbox('daytona'),
				'/home/daytona/workspace/agent-knowledge/file.txt',
				Readable.from([]),
				{
					overwrite: false,
					temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
				},
			),
		).rejects.toThrow(
			'Target file already exists: /home/daytona/workspace/agent-knowledge/file.txt',
		);
		expect(filesystem.writeFile).not.toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file.txt',
			expect.anything(),
			expect.anything(),
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});
});
