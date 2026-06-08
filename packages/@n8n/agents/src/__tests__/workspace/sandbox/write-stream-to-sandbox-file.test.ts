import { Readable } from 'node:stream';

import type { SandboxFilesystem, SandboxInstance } from '../../../workspace/sandbox/types';
import { writeStreamToSandboxFile } from '../../../workspace/sandbox/write-stream-to-sandbox-file';

async function asyncNoop() {
	await Promise.resolve();
}

async function asyncFalse() {
	await Promise.resolve();
	return false;
}

async function asyncCommandSuccess() {
	await Promise.resolve();
	return {
		command: 'sh',
		args: [],
		success: true,
		exitCode: 0,
		stdout: '',
		stderr: '',
		executionTimeMs: 1,
	};
}

function makeFilesystem(provider: 'n8n-sandbox' | 'daytona') {
	return {
		id: `${provider}-fs`,
		name: 'TestFilesystem',
		provider,
		status: 'ready' as const,
		mkdir: vi.fn(asyncNoop),
		writeFile: vi.fn(asyncNoop),
		appendFile: vi.fn(asyncNoop),
		deleteFile: vi.fn(asyncNoop),
		exists: vi.fn(asyncFalse),
	} satisfies Partial<SandboxFilesystem> as unknown as SandboxFilesystem;
}

function makeSandbox(provider: 'n8n-sandbox' | 'daytona') {
	return {
		id: `${provider}-sandbox`,
		name: 'TestSandbox',
		provider,
		status: 'running' as const,
		executeCommand: vi.fn(asyncCommandSuccess),
	} satisfies Partial<SandboxInstance> as SandboxInstance;
}

const N8N_SANDBOX_TARGET = '/home/user/workspace/files/file.txt';
const DAYTONA_TARGET = '/home/daytona/workspace/files/file.txt';
const DAYTONA_TEMP_DIR = '/home/daytona/workspace/.tmp/upload-parts';

describe('writeStreamToSandboxFile', () => {
	it('writes n8n sandbox streams in bounded chunks', async () => {
		const filesystem = makeFilesystem('n8n-sandbox');
		await writeStreamToSandboxFile(
			filesystem,
			makeSandbox('n8n-sandbox'),
			N8N_SANDBOX_TARGET,
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
				N8N_SANDBOX_TARGET,
				Readable.from([Buffer.alloc(1500, 1)]),
				{ chunkSizeBytes: 1024 },
			),
		).rejects.toThrow(error);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(N8N_SANDBOX_TARGET, { force: true });
	});

	it('writes Daytona streams through temporary parts and sandbox assembly', async () => {
		const filesystem = makeFilesystem('daytona');
		const sandbox = makeSandbox('daytona');
		await writeStreamToSandboxFile(
			filesystem,
			sandbox,
			DAYTONA_TARGET,
			Readable.from([Buffer.alloc(2500, 2)]),
			{
				chunkSizeBytes: 1024,
				temporaryDirectory: DAYTONA_TEMP_DIR,
			},
		);

		expect(sandbox.executeCommand).toHaveBeenCalledWith('sh', [
			'-lc',
			expect.stringContaining(DAYTONA_TARGET),
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
				DAYTONA_TARGET,
				Readable.from([Buffer.alloc(1500, 3)]),
				{
					chunkSizeBytes: 1024,
					temporaryDirectory: DAYTONA_TEMP_DIR,
				},
			),
		).rejects.toThrow(/^Failed to assemble Daytona sandbox file:/);
		expect(filesystem.deleteFile).not.toHaveBeenCalledWith(DAYTONA_TARGET, expect.anything());
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
				DAYTONA_TARGET,
				Readable.from([]),
				{
					overwrite: false,
					temporaryDirectory: DAYTONA_TEMP_DIR,
				},
			),
		).rejects.toThrow(`Target file already exists: ${DAYTONA_TARGET}`);
		expect(filesystem.writeFile).not.toHaveBeenCalledWith(
			DAYTONA_TARGET,
			expect.anything(),
			expect.anything(),
		);
		expect(filesystem.deleteFile).toHaveBeenCalledWith(
			expect.stringContaining('/upload-parts/stream-upload/'),
			{ recursive: true, force: true },
		);
	});
});
