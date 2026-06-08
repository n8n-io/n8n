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
): Promise<number> {
	let chunksWritten = 0;
	let pending = Buffer.alloc(0);

	const writeChunk = async (chunk: Buffer) => {
		await writeOutputChunk(chunk);
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
			await writeChunk(Buffer.from(incoming.subarray(offset, offset + chunkSizeBytes)));
			offset += chunkSizeBytes;
		}

		if (offset < incoming.length) {
			pending = Buffer.from(incoming.subarray(offset));
		}
	}

	if (pending.length > 0) {
		await writeChunk(pending);
	}

	return chunksWritten;
}

export async function writeStreamToSandboxFile(
	filesystem: SandboxFilesystem,
	sandbox: SandboxInstance,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions = {},
): Promise<void> {
	if (filesystem.provider !== sandbox.provider) {
		throw new Error(
			`Sandbox filesystem provider ${filesystem.provider} does not match sandbox provider ${sandbox.provider}`,
		);
	}

	const chunkSizeBytes = options.chunkSizeBytes ?? DEFAULT_SANDBOX_WRITE_CHUNK_BYTES;
	if (chunkSizeBytes <= 0) {
		throw new Error('Sandbox write chunk size must be greater than 0');
	}

	const parent = getParentDirectory(targetPath);
	if (parent) {
		await filesystem.mkdir(parent, { recursive: true });
	}

	switch (filesystem.provider) {
		case 'daytona':
			return await writeDaytonaStream(filesystem, sandbox, targetPath, stream, {
				...options,
				chunkSizeBytes,
			});
		case 'n8n-sandbox':
			return await writeN8nSandboxStream(filesystem, targetPath, stream, {
				...options,
				chunkSizeBytes,
			});
		default:
			throw new Error(`Unsupported sandbox provider: ${String(filesystem.provider)}`);
	}
}

async function writeN8nSandboxStream(
	filesystem: SandboxFilesystem,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions & { chunkSizeBytes: number },
): Promise<void> {
	let chunksWritten = 0;
	let targetWritten = false;

	const writeOutputChunk = async (chunk: Buffer) => {
		if (chunksWritten === 0) {
			await filesystem.writeFile(targetPath, chunk, {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
			targetWritten = true;
		} else {
			await filesystem.appendFile(targetPath, chunk);
		}
		chunksWritten += 1;
	};

	try {
		const writtenChunks = await writeStreamInChunks(
			stream,
			options.chunkSizeBytes,
			writeOutputChunk,
		);
		if (writtenChunks === 0) {
			await filesystem.writeFile(targetPath, Buffer.alloc(0), {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
			targetWritten = true;
		}
	} catch (error) {
		if (targetWritten) {
			await bestEffortDelete(filesystem, targetPath, { force: true });
		}
		throw error;
	}
}

async function writeDaytonaStream(
	filesystem: SandboxFilesystem,
	sandbox: SandboxInstance,
	targetPath: string,
	stream: Readable,
	options: WriteStreamToSandboxFileOptions & { chunkSizeBytes: number },
): Promise<void> {
	if (!options.temporaryDirectory) {
		throw new Error('temporaryDirectory is required for Daytona sandbox stream writes');
	}

	const uploadDirectory = path.join(options.temporaryDirectory, 'stream-upload', randomUUID());
	const assembledPath = path.join(uploadDirectory, 'assembled');
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

		const writtenChunks = await writeStreamInChunks(
			stream,
			options.chunkSizeBytes,
			writeOutputChunk,
		);

		if (writtenChunks === 0) {
			if (options.overwrite === false && (await filesystem.exists(targetPath))) {
				throw new Error(`Target file already exists: ${targetPath}`);
			}
			await filesystem.writeFile(targetPath, Buffer.alloc(0), {
				recursive: true,
				overwrite: options.overwrite ?? true,
			});
			return;
		}

		if (!sandbox.executeCommand) {
			throw new Error('Daytona sandbox stream writes require command execution');
		}

		const parent = getParentDirectory(targetPath);
		const commands = parent ? [`mkdir -p ${shellQuote(parent)}`] : [];
		commands.push(`cat ${partPaths.map(shellQuote).join(' ')} > ${shellQuote(assembledPath)}`);
		if (options.overwrite === false) {
			const quotedTargetPath = shellQuote(targetPath);
			const targetExistsMessage = shellQuote(`Target file already exists: ${targetPath}`);
			commands.push(
				`if [ -e ${quotedTargetPath} ]; then ` +
					`printf '%s\\n' ${targetExistsMessage} >&2; exit 1; fi`,
			);
		}
		commands.push(`mv -f ${shellQuote(assembledPath)} ${shellQuote(targetPath)}`);
		const script = `set -e; ${commands.join('; ')}`;
		const commandResult = await sandbox.executeCommand('sh', ['-lc', script]);
		if (commandResult.exitCode !== 0) {
			throw new Error(
				`Failed to assemble Daytona sandbox file: ${commandResult.stderr || commandResult.stdout || 'unknown error'}`,
			);
		}
	} finally {
		await bestEffortDelete(filesystem, uploadDirectory, { recursive: true, force: true });
	}
}
