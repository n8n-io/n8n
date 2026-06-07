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
		const executeCommand = sandbox.executeCommand!;
		expect(executeCommand).toHaveBeenCalledTimes(1);
		const executeArgs = vi.mocked(executeCommand).mock.calls[0];
		expect(executeArgs?.[0]).toBe('sh');
		expect(executeArgs?.[1]).toEqual(['-lc', expect.any(String)]);
		const script = executeArgs?.[1]?.[1] ?? '';
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

	it('cleans Daytona temp directory without deleting target when assembly fails', async () => {
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

		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file.txt',
			expect.anything(),
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

	it('creates nested target directories before writing', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const stream = Readable.from([Buffer.from('nested')]);

		await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/user/workspace/nested/dir/file.txt',
			stream,
		);

		expect(filesystem.mkdir).toHaveBeenCalledWith('/home/user/workspace/nested/dir', {
			recursive: true,
		});
	});

	it('converts string stream chunks and counts bytes correctly', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const stream = Readable.from(['abc', 'def', 'ghi']);

		const result = await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/user/workspace/agent-knowledge/file.txt',
			stream,
			{ chunkSizeBytes: 4 },
		);

		expect(result).toEqual({ bytesWritten: 9, chunksWritten: 3 });
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/user/workspace/agent-knowledge/file.txt',
			Buffer.from('abcd'),
			{ recursive: true, overwrite: true },
		);
		const appendedChunks = vi
			.mocked(filesystem.appendFile)
			.mock.calls.map((call) => (Buffer.isBuffer(call[1]) ? call[1].toString() : String(call[1])));
		expect(appendedChunks).toEqual(['efgh', 'i']);
	});

	it('does not clean target file when the first n8n sandbox write fails', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const error = new Error('write failed');
		vi.mocked(filesystem.writeFile).mockRejectedValueOnce(error);
		const stream = Readable.from([Buffer.from('hello')]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/user/workspace/agent-knowledge/file.txt',
				stream,
				{ chunkSizeBytes: 1024 },
			),
		).rejects.toThrow(error);

		expect(filesystem.deleteFile).not.toHaveBeenCalled();
		expect(filesystem.appendFile).not.toHaveBeenCalled();
	});

	it('does not delete existing target when n8n sandbox overwrite is false', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		const sandbox = makeSandbox('n8n-sandbox');
		const error = new Error('file already exists');
		vi.mocked(filesystem.writeFile).mockRejectedValueOnce(error);
		const stream = Readable.from([Buffer.from('hello')]);

		await expect(
			writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/user/workspace/agent-knowledge/file.txt',
				stream,
				{ chunkSizeBytes: 1024, overwrite: false },
			),
		).rejects.toThrow(error);

		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/user/workspace/agent-knowledge/file.txt',
			Buffer.from('hello'),
			{ recursive: true, overwrite: false },
		);
		expect(filesystem.deleteFile).not.toHaveBeenCalled();
		expect(filesystem.appendFile).not.toHaveBeenCalled();
	});

	it('writes Daytona stream parts within chunkSizeBytes', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const content = Buffer.alloc(2500, 'a');
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
		for (const [, payload] of vi.mocked(filesystem.writeFile).mock.calls) {
			const buffer = Buffer.isBuffer(payload) ? payload : Buffer.from(payload);
			expect(buffer.length).toBeLessThanOrEqual(1024);
		}
		const executeCommand = sandbox.executeCommand!;
		expect(executeCommand).toHaveBeenCalledTimes(1);
		const script = vi.mocked(executeCommand).mock.calls[0]?.[1]?.[1] ?? '';
		expect(script).toContain('.part');
		expect(script).not.toContain(content.toString());
	});

	it('does not concatenate a whole oversized Daytona source chunk before splitting', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const oversizedChunk = Buffer.alloc(2500, 'b');
		const concatSpy = vi.spyOn(Buffer, 'concat');

		try {
			await writeStreamToSandboxFile(
				filesystem,
				sandbox,
				'/home/daytona/workspace/agent-knowledge/file.txt',
				Readable.from([Buffer.from('hi'), oversizedChunk]),
				{
					chunkSizeBytes: 1024,
					temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
				},
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

	it('writes empty Daytona stream as an empty file without concat', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const stream = Readable.from([]);

		const result = await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			'/home/daytona/workspace/agent-knowledge/empty.txt',
			stream,
			{
				temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
			},
		);

		expect(result).toEqual({ bytesWritten: 0, chunksWritten: 0 });
		expect(filesystem.writeFile).toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/empty.txt',
			Buffer.alloc(0),
			{ recursive: true, overwrite: true },
		);
		expect(sandbox.executeCommand).not.toHaveBeenCalled();
	});

	it('cleans Daytona temp parts without deleting target when a temp part upload fails', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		const error = new Error('part upload failed');
		let partWrites = 0;
		vi.mocked(filesystem.writeFile).mockImplementation(async (filePath, _content) => {
			if (String(filePath).includes('.part')) {
				partWrites += 1;
				if (partWrites === 2) {
					throw error;
				}
			}
		});
		const stream = Readable.from([Buffer.alloc(2500, 'c')]);

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
		).rejects.toThrow(error);

		expect(sandbox.executeCommand).not.toHaveBeenCalled();
		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(
			'/home/daytona/workspace/agent-knowledge/file.txt',
			expect.anything(),
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});

	it('does not overwrite or delete existing Daytona target when overwrite is false', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		vi.mocked(sandbox.executeCommand!).mockResolvedValueOnce({
			command: 'sh',
			args: [],
			success: false,
			exitCode: 1,
			stdout: '',
			stderr: 'Target file already exists',
			executionTimeMs: 1,
		});
		const stream = Readable.from([Buffer.from('hello')]);
		const targetPath = '/home/daytona/workspace/agent-knowledge/file.txt';

		await expect(
			writeStreamToSandboxFile(filesystem, sandbox, targetPath, stream, {
				chunkSizeBytes: 1024,
				temporaryDirectory: '/home/daytona/workspace/.agent-knowledge-internal/upload-parts',
				overwrite: false,
			}),
		).rejects.toThrow(/^Failed to assemble Daytona sandbox file:/);

		const script = vi.mocked(sandbox.executeCommand!).mock.calls[0]?.[1]?.[1] ?? '';
		expect(script).toContain(`[ -e '${targetPath}' ]`);
		expect(script).toContain('/assembled');
		expect(script).not.toContain(`> '${targetPath}'`);
		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(targetPath, expect.anything());
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});
});
