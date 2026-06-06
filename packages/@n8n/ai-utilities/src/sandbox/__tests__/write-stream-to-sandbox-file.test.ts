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
	} satisfies Partial<SandboxFilesystem> as SandboxFilesystem;
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
		})),
	} satisfies Partial<SandboxInstance> as SandboxInstance;
}

describe('writeStreamToSandboxFile', () => {
	it('writes n8n sandbox stream in bounded chunks', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const content = Buffer.alloc(2500, 1);
		const stream = Readable.from([content]);

		const result = await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/user/workspace/agent-knowledge/file.txt',
			stream,
			{ chunkSizeBytes: 1024 },
		);

		expect(result).toEqual({ bytesWritten: 2500, chunksWritten: 3 });
		expect(filesystem.writeFile).toHaveBeenCalledTimes(1);
		expect(filesystem.appendFile).toHaveBeenCalledTimes(2);
		const writtenChunks = [
			vi.mocked(filesystem.writeFile).mock.calls[0][1],
			vi.mocked(filesystem.appendFile).mock.calls[0][1],
			vi.mocked(filesystem.appendFile).mock.calls[1][1],
		];
		for (const chunk of writtenChunks) {
			expect(Buffer.isBuffer(chunk) ? chunk.length : Buffer.from(chunk).length).toBeLessThanOrEqual(
				1024,
			);
		}
	});

	it('does not concatenate a whole oversized source chunk before splitting', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const oversizedChunk = Buffer.alloc(2500, 1);
		const concatSpy = vi.spyOn(Buffer, 'concat');

		try {
			await writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/user/workspace/agent-knowledge/file.txt',
				Readable.from([Buffer.from('hi'), oversizedChunk]),
				{ chunkSizeBytes: 1024 },
			);

			for (const [buffers] of concatSpy.mock.calls) {
				for (const buffer of buffers) {
					expect(buffer.length).toBeLessThanOrEqual(1024);
				}
			}
		} finally {
			concatSpy.mockRestore();
		}
	});

	it('writes empty n8n sandbox stream as an empty file', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const stream = Readable.from([]);

		const result = await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/user/workspace/agent-knowledge/empty.txt',
			stream,
		);

		expect(result).toEqual({ bytesWritten: 0, chunksWritten: 0 });
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/user/workspace/agent-knowledge/empty.txt',
			Buffer.alloc(0),
			{ recursive: true, overwrite: true },
		);
		expect(filesystem.appendFile).not.toHaveBeenCalled();
	});

	it('cleans target file when n8n sandbox write fails', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const error = new Error('append failed');
		vi.mocked(filesystem.appendFile).mockRejectedValueOnce(error);
		const stream = Readable.from([Buffer.alloc(1500, 1)]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/user/workspace/agent-knowledge/file.txt',
				stream,
				{ chunkSizeBytes: 1024 },
			),
		).rejects.toThrow(error);

		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/user/workspace/agent-knowledge/file.txt',
			{ force: true },
		);
	});

	it('writes Daytona stream as temporary chunk files and concatenates paths in sandbox', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const content = Buffer.alloc(2500, 2);
		const stream = Readable.from([content]);

		const result = await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/daytona/workspace/agent-knowledge/file.txt',
			stream,
			{
				chunkSizeBytes: 1024,
				temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
			},
		);

		expect(result).toEqual({ bytesWritten: 2500, chunksWritten: 3 });
		expect(filesystem.appendFile).not.toHaveBeenCalled();
		expect(sandbox.executeCommand).toHaveBeenCalledTimes(1);
		const executeArgs = vi.mocked(sandbox.executeCommand).mock.calls[0];
		expect(executeArgs[0]).toBe('sh');
		expect(executeArgs[1]).toEqual(['-lc', expect.any(String)]);
		const script = executeArgs[1]?.[1] ?? '';
		expect(script).toContain('/home/daytona/workspace/agent-knowledge/file.txt');
		expect(script).toContain('.part');
		expect(script).not.toContain(content.toString('hex'));
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});

	it('requires temporaryDirectory for Daytona', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const stream = Readable.from([Buffer.from('hello')]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/daytona/workspace/agent-knowledge/file.txt',
				stream,
			),
		).rejects.toThrow('temporaryDirectory is required for Daytona sandbox stream writes');
	});

	it('cleans Daytona temp directory and target when concat fails', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		vi.mocked(sandbox.executeCommand).mockResolvedValueOnce({
			command: 'sh',
			args: [],
			success: false,
			exitCode: 1,
			stdout: '',
			stderr: 'concat failed',
		});
		const stream = Readable.from([Buffer.alloc(1500, 3)]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/daytona/workspace/agent-knowledge/file.txt',
				stream,
				{
					chunkSizeBytes: 1024,
					temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
				},
			),
		).rejects.toThrow(/^Failed to assemble Daytona sandbox file:/);

		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file.txt',
			{ force: true },
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});

	it('rejects non-positive chunk size', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const stream = Readable.from([Buffer.from('hello')]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/user/workspace/agent-knowledge/file.txt',
				stream,
				{ chunkSizeBytes: 0 },
			),
		).rejects.toThrow('Sandbox write chunk size must be greater than 0');
	});
});
