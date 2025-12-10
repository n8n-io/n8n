import { isContainedWithin, safeJoinPath } from '@n8n/backend-common';
import { SecurityConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { NodeOperationError } from 'n8n-workflow';
import type { FileSystemHelperFunctions, INode, ResolvedFilePath } from 'n8n-workflow';
import type { PathLike } from 'node:fs';
import { constants, createReadStream } from 'node:fs';
import {
	access as fsAccess,
	writeFile as fsWriteFile,
	realpath as fsRealpath,
} from 'node:fs/promises';
import { homedir } from 'node:os';
import { resolve } from 'node:path';

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
	try {
		return (await fsRealpath(path)) as ResolvedFilePath; // apply brand, since we know it's resolved now
	} catch (error: unknown) {
		if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
			return resolve(path.toString()) as ResolvedFilePath; // apply brand, since we know it's resolved now
		}
		throw error;
	}
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

	if (allowedPaths.length) {
		return !allowedPaths.some((allowedPath) => isContainedWithin(allowedPath, resolvedFilePath));
	}

	return false;
}

export const getFileSystemHelperFunctions = (node: INode): FileSystemHelperFunctions => ({
	async createReadStream(resolvedFilePath) {
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

		// Use O_NOFOLLOW to prevent createReadStream from following symlinks. We require that the path
		// already be resolved beforehand.
		const stream = createReadStream(resolvedFilePath, {
			flags: (constants.O_RDONLY | constants.O_NOFOLLOW) as unknown as string,
		});

		return await new Promise<ReturnType<typeof createReadStream>>((resolve, reject) => {
			stream.once('error', (error) => {
				if ((error as NodeJS.ErrnoException).code === 'ELOOP') {
					reject(
						new NodeOperationError(node, error, {
							level: 'warning',
							description: 'Symlinks are not allowed.',
						}),
					);
				} else {
					reject(error);
				}
			});
			stream.once('open', () => resolve(stream));
		});
	},

	getStoragePath() {
		return safeJoinPath(Container.get(InstanceSettings).n8nFolder, `storage/${node.type}`);
	},

	async writeContentToFile(resolvedFilePath, content, flag) {
		if (isFilePathBlocked(resolvedFilePath)) {
			throw new NodeOperationError(
				node,
				`The file "${String(resolvedFilePath)}" is not writable.`,
				{
					level: 'warning',
				},
			);
		}
		return await fsWriteFile(resolvedFilePath, content, {
			encoding: 'binary',
			flag: (flag ?? 0) | constants.O_NOFOLLOW,
		});
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
