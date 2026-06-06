import { randomUUID } from 'node:crypto';
import path from 'node:path/posix';
import type { Readable } from 'node:stream';

import type { SandboxFilesystem, SandboxInstance } from './types';

const DEFAULT_SANDBOX_WRITE_CHUNK_BYTES = 1024 * 1024;

export interface WriteStreamToSandboxFileOptions {
	chunkSizeBytes?: number;
	temporaryDirectory?: string;
	overwrite?: boolean;
}

export interface WriteStreamToSandboxFileResult {
	bytesWritten: number;
	chunksWritten: number;
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

function getParentDirectory(filePath: string): string {
	const parent = path.dirname(filePath);
	return parent === '.' ? '' : parent;
}

async function bestEffortDelete(
	filesystem: SandboxFilesystem,
	targetPath: string,
	options?: { recursive?: boolean; force?: boolean },
): Promise<void> {
	try {
		await filesystem.deleteFile(targetPath, options);
	} catch {
		// Best-effort cleanup only.
	}
}

async function writeStreamInChunks(
	stream: Readable,
	chunkSizeBytes: number,
	writeOutputChunk: (chunk: Buffer) => Promise<void>,
): Promise<WriteStreamToSandboxFileResult> {
	let bytesWritten = 0;
	let chunksWritten = 0;
	let pending = Buffer.alloc(0);

	const writeChunk = async (chunk: Buffer) => {
		await writeOutputChunk(chunk);
		bytesWritten += chunk.length;
		chunksWritten += 1;
	};

	for await (const chunk of stream) {
		const incoming = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		let offset = 0;

		if (pending.length > 0) {
			const bytesNeeded = chunkSizeBytes - pending.length;
			const bytesToTake = Math.min(bytesNeeded, incoming.length);
			const combined = Buffer.concat([pending, incoming.subarray(0, bytesToTake)]);
			pending = Buffer.alloc(0);
			offset = bytesToTake;

			if (combined.length === chunkSizeBytes) {
				await writeChunk(combined);
			} else {
				pending = combined;
			}
		}

		while (offset + chunkSizeBytes <= incoming.length) {
			await writeChunk(incoming.subarray(offset, offset + chunkSizeBytes));
			offset += chunkSizeBytes;
		}

		if (offset < incoming.length) {
			pending = Buffer.from(incoming.subarray(offset));
		}
	}

	if (pending.length > 0) {
		await writeChunk(pending);
	}

	return { bytesWritten, chunksWritten };
}

export async function writeStreamToSandboxFile(
	filesystem: SandboxFilesystem,
	sandbox: SandboxInstance,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions = {},
): Promise<WriteStreamToSandboxFileResult> {
	const chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_SANDBOX_WRITE_CHUNK_BYTES;
	if (chunkSizeBytes <= 0) {
		throw new Error('Sandbox write chunk size must be greater than 0');
	}

	const parent = getParentDirectory(targetPath);
	if (parent) {
		await filesystem.mkdir(parent, { recursive: true });
	}

	const provider = filesystem.provider;
	if (provider === 'daytona') {
		return await writeDaytonaStream(filesystem, sandbox, targetPath, stream, {
			...options,
			chunkSizeBytes,
		});
	}

	return await writeN8nSandboxStream(filesystem, targetPath, stream, {
		...options,
		chunkSizeBytes,
	});
}

async function writeN8nSandboxStream(
	filesystem: SandboxFilesystem,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions & { chunkSizeBytes: number },
): Promise<WriteStreamToSandboxFileResult> {
	let chunksWritten = 0;

	const writeOutputChunk = async (chunk: Buffer) => {
		if (chunksWritten === 0) {
			await filesystem.writeFile(targetPath, chunk, {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
		} else {
			await filesystem.appendFile(targetPath, chunk);
		}
		chunksWritten += 1;
	};

	try {
		const result = await writeStreamInChunks(stream, options.chunkSizeBytes, writeOutputChunk);
		if (result.chunksWritten === 0) {
			await filesystem.writeFile(targetPath, Buffer.alloc(0), {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
		}

		return result;
	} catch (error) {
		await bestEffortDelete(filesystem, targetPath, { force: true });
		throw error;
	}
}

async function writeDaytonaStream(
	filesystem: SandboxFilesystem,
	sandbox: SandboxInstance,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions & { chunkSizeBytes: number },
): Promise<WriteStreamToSandboxFileResult> {
	if (!options.temporaryDirectory) {
		throw new Error('temporaryDirectory is required for Daytona sandbox stream writes');
	}

	const uploadDirectory = path.join(options.temporaryDirectory, 'stream-upload', randomUUID());
	const partPaths: string[] = [];
	let chunksWritten = 0;

	const writeOutputChunk = async (chunk: Buffer) => {
		const partPath = path.join(uploadDirectory, `${chunksWritten}.part`);
		await filesystem.writeFile(partPath, chunk, { recursive: true, overwrite: true });
		partPaths.push(partPath);
		chunksWritten += 1;
	};

	try {
		await filesystem.mkdir(uploadDirectory, { recursive: true });

		const streamResult = await writeStreamInChunks(
			stream,
			options.chunkSizeBytes,
			writeOutputChunk,
		);

		if (streamResult.chunksWritten === 0) {
			await filesystem.writeFile(targetPath, Buffer.alloc(0), {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
			return { bytesWritten: 0, chunksWritten: 0 };
		}

		if (!sandbox.executeCommand) {
			throw new Error('Daytona sandbox stream writes require command execution');
		}

		const parent = getParentDirectory(targetPath);
		const script = parent
			? `mkdir -p ${shellQuote(parent)} && cat ${partPaths.map(shellQuote).join(' ')} > ${shellQuote(targetPath)}`
			: `cat ${partPaths.map(shellQuote).join(' ')} > ${shellQuote(targetPath)}`;
		const commandResult = await sandbox.executeCommand('sh', ['-lc', script]);
		if (commandResult.exitCode !== 0) {
			throw new Error(
				`Failed to assemble Daytona sandbox file: ${commandResult.stderr || commandResult.stdout || 'unknown error'}`,
			);
		}

		return streamResult;
	} catch (error) {
		await bestEffortDelete(filesystem, targetPath, { force: true });
		throw error;
	} finally {
		await bestEffortDelete(filesystem, uploadDirectory, { recursive: true, force: true });
	}
}
