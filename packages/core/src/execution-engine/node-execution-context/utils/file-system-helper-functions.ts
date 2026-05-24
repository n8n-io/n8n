import { isContainedWithin, safeJoinPath } from '@n8n/backend-common';
import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { NodeOperationError } from 'n8n-workflow';
import type { FileSystemHelperFunctions, INode, ResolvedFilePath } from 'n8n-workflow';
import type { PathLike } from 'node:fs';
import { constants } from 'node:fs';
import {
	access as fsAccess,
	realpath as fsRealpath,
	stat as fsStat,
	open as fsOpen,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { posix, dirname, basename, join } from 'node:path';

import {
	BINARY_DATA_STORAGE_PATH,
	BLOCK_FILE_ACCESS_TO_N8N_FILES,
	CONFIG_FILES,
	CUSTOM_EXTENSION_ENV,
	UM_EMAIL_TEMPLATES_INVITE,
	UM_EMAIL_TEMPLATES_PWRESET,
} from '@/constants';
import { InstanceSettings } from '@/instance-settings';

const getAllowedPaths = () => {
	const { restrictFileAccessTo } = Container.get(SecurityConfig);
	if (restrictFileAccessTo === '') return [];

	const allowedPaths = restrictFileAccessTo
		.split(';')
		.map((path) => path.trim())
		.filter((path) => path)
		.map((path) => (path.startsWith('~') ? path.replace('~', homedir()) : path));

	return allowedPaths;
};

async function resolvePath(path: PathLike): Promise<ResolvedFilePath> {
	const pathStr = path.toString();

	try {
		return (await fsRealpath(pathStr)) as ResolvedFilePath; // apply brand, since we know it's resolved now
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			// File doesn't exist - resolve the parent directory and append filename
			const dir = dirname(pathStr);
			const file = basename(pathStr);
			const resolvedDir = await fsRealpath(dir);
			return join(resolvedDir, file) as ResolvedFilePath;
		}
		throw error;
	}
}

function isFilePatternBlocked(resolvedFilePath: ResolvedFilePath): boolean {
	const { blockFilePatterns } = Container.get(SecurityConfig);

	// Normalize path separators for cross-platform compatibility
	const normalizedPath = posix.normalize(resolvedFilePath.replace(/\\/g, '/'));

	return blockFilePatterns
		.split(';')
		.map((pattern) => pattern.trim())
		.filter((pattern) => pattern)
		.some((pattern) => {
			try {
				return new RegExp(pattern, 'mi').test(normalizedPath);
			} catch {
				return true;
			}
		});
}

function isFilePathBlocked(resolvedFilePath: ResolvedFilePath): boolean {
	const allowedPaths = getAllowedPaths();
	const blockFileAccessToN8nFiles = process.env[BLOCK_FILE_ACCESS_TO_N8N_FILES] !== 'false';

	const restrictedPaths = blockFileAccessToN8nFiles ? getN8nRestrictedPaths() : [];
	if (
		restrictedPaths.some((restrictedPath) => isContainedWithin(restrictedPath, resolvedFilePath))
	) {
		return true;
	}

	if (isFilePatternBlocked(resolvedFilePath)) {
		return true;
	}

	if (allowedPaths.length) {
		return !allowedPaths.some((allowedPath) => isContainedWithin(allowedPath, resolvedFilePath));
	}

	return false;
}

export const getFileSystemHelperFunctions = (node: INode): FileSystemHelperFunctions => ({
	async createReadStream(resolvedFilePath) {
		// Get the device and inode number of the path we're checking.
		const pathIdentity = await fsStat(resolvedFilePath);
		// Check that the path is allowed.
		if (isFilePathBlocked(resolvedFilePath)) {
			const allowedPaths = getAllowedPaths();
			const message = allowedPaths.length ? ` Allowed paths: ${allowedPaths.join(', ')}` : '';
			throw new NodeOperationError(node, `Access to the file is not allowed.${message}`, {
				level: 'warning',
			});
		}

		try {
			await fsAccess(resolvedFilePath);
		} catch (error) {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
			throw error.code === 'ENOENT'
				? // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
					new NodeOperationError(node, error, {
						message: `The file "${String(resolvedFilePath)}" could not be accessed.`,
						level: 'warning',
					})
				: error;
		}

		// Open a file handle.
		let fileHandle;
		try {
			fileHandle = await fsOpen(resolvedFilePath, constants.O_RDONLY | constants.O_NOFOLLOW);
		} catch (error) {
			if ('code' in error && (error as unknown as { code: string }).code === 'ELOOP') {
				throw new NodeOperationError(node, error instanceof Error ? error : '', {
					message: 'Symlinks are not allowed.',
					level: 'warning',
				});
			} else {
				throw error;
			}
		}

		try {
			// Verify that the handle we've opened is the same as the path we checked earlier.
			// This ensures nothing has changed between checking and reading.
			const fileHandleIdentity = await fileHandle.stat();
			if (
				fileHandleIdentity.dev !== pathIdentity.dev ||
				fileHandleIdentity.ino !== pathIdentity.ino
			) {
				throw new NodeOperationError(node, 'The file has changed and cannot be accessed.', {
					level: 'warning',
				});
			}

			// The file handle we opened matches the path we checked, and the path is allowed,
			// so we can go ahead and read the file.
			return fileHandle.createReadStream();
		} catch (error) {
			// Ensure the file handle is closed if verification fails or an error occurs.
			await fileHandle.close();
			throw error;
		}
	},

	getStoragePath() {
		return safeJoinPath(Container.get(InstanceSettings).n8nFolder, `storage/${node.type}`);
	},

	async writeContentToFile(resolvedFilePath, content, flag) {
		// Get the device and inode number of the path we're checking, if it exists.
		// This establishes the file's identity before we open it.
		let pathIdentity;
		let fileExists = true;
		try {
			pathIdentity = await fsStat(resolvedFilePath);
		} catch (error) {
			// NOTE: for some reason instanceof Error does not work here in tests,
			// so we just look for the code to catch ENOENT.
			if ('code' in error && (error as unknown as { code: string }).code === 'ENOENT') {
				// It's possible the file does not exist yet. In this case we'll create it later.
				fileExists = false;
			} else {
				throw error;
			}
		}

		// Check that the path is allowed.
		if (isFilePathBlocked(resolvedFilePath)) {
			throw new NodeOperationError(
				node,
				`The file "${String(resolvedFilePath)}" is not writable.`,
				{
					level: 'warning',
				},
			);
		}

		const shouldTruncate = flag === undefined || (flag & constants.O_TRUNC) === constants.O_TRUNC;
		// We intentionally remove O_TRUNC to avoid destructive operations before verification.
		// If we should truncate the file instead we will do it after verification.
		const userFlags = flag ?? 0;
		const openFlags =
			constants.O_WRONLY |
			constants.O_CREAT |
			constants.O_NOFOLLOW |
			(userFlags & ~constants.O_TRUNC); // Strip O_TRUNC if present

		let fileHandle;
		try {
			fileHandle = await fsOpen(resolvedFilePath, openFlags);
		} catch (error) {
			if ('code' in error && (error as unknown as { code: string }).code === 'ELOOP') {
				throw new NodeOperationError(node, error instanceof Error ? error : '', {
					message: 'Symlinks are not allowed.',
					level: 'warning',
				});
			} else {
				throw error;
			}
		}

		try {
			// Verify that the handle we've opened is the same as the path we checked earlier.
			// This ensures nothing has changed between checking and opening (TOCTOU protection).
			const fileHandleIdentity = await fileHandle.stat();

			if (fileExists && pathIdentity) {
				if (
					fileHandleIdentity.dev !== pathIdentity.dev ||
					fileHandleIdentity.ino !== pathIdentity.ino
				) {
					throw new NodeOperationError(node, 'The file has changed and cannot be written.', {
						level: 'warning',
					});
				}
			} else {
				// If the file did not exist before, ensure that we opened the path we expected.
				pathIdentity = await fsStat(resolvedFilePath);
				if (
					fileHandleIdentity.dev !== pathIdentity.dev ||
					fileHandleIdentity.ino !== pathIdentity.ino
				) {
					throw new NodeOperationError(
						node,
						'The file was created but its identity does not match and cannot be written.',
						{
							level: 'warning',
						},
					);
				}
			}

			// Verify that the opened file is a regular file, not a directory or special file
			if (!fileHandleIdentity.isFile()) {
				throw new NodeOperationError(node, 'The path is not a regular file.', {
					level: 'warning',
				});
			}

			// The file handle we opened matches the path we checked (or the file was newly created),
			// and the path is allowed, so we can now safely truncate and write.
			if (shouldTruncate) {
				await fileHandle.truncate(0);
			} // Otherwise we'll append.

			// Handle different content types
			if (typeof content === 'string' || Buffer.isBuffer(content)) {
				// FileHandle.writeFile supports string and Buffer
				await fileHandle.writeFile(content, { encoding: 'binary' });
			} else {
				// Content is a Readable stream
				const writeStream = fileHandle.createWriteStream({ encoding: 'binary' });
				await new Promise<void>((resolve, reject) => {
					content.pipe(writeStream);
					writeStream.on('finish', resolve);
					writeStream.on('error', reject);
				});
			}
		} finally {
			await fileHandle.close();
		}
	},
	resolvePath,
	isFilePathBlocked,
});

/**
 * @returns The restricted paths for the n8n instance.
 */
function getN8nRestrictedPaths() {
	const { n8nFolder, staticCacheDir } = Container.get(InstanceSettings);
	const restrictedPaths = [n8nFolder, staticCacheDir];

	if (process.env[CONFIG_FILES]) {
		restrictedPaths.push(...process.env[CONFIG_FILES].split(','));
	}

	if (process.env[CUSTOM_EXTENSION_ENV]) {
		const customExtensionFolders = process.env[CUSTOM_EXTENSION_ENV].split(';');
		restrictedPaths.push(...customExtensionFolders);
	}

	if (process.env[BINARY_DATA_STORAGE_PATH]) {
		restrictedPaths.push(process.env[BINARY_DATA_STORAGE_PATH]);
	}

	if (process.env[UM_EMAIL_TEMPLATES_INVITE]) {
		restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_INVITE]);
	}

	if (process.env[UM_EMAIL_TEMPLATES_PWRESET]) {
		restrictedPaths.push(process.env[UM_EMAIL_TEMPLATES_PWRESET]);
	}

	return restrictedPaths;
}
