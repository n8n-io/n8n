import { SandboxServiceError } from '@n8n/sandbox-client';
import { dirname } from 'node:path/posix';

import { raceWithAbort } from '../../sdk/abort';
import type {
	AbortableOptions,
	AppendOptions,
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	MkdirOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WriteOptions,
} from '../types';
import { BaseFilesystem } from './base-filesystem';
import type { N8nSandboxServiceSandbox } from '../sandbox/n8n-sandbox-sandbox';

function getParentDirectory(path: string): string | null {
	const parent = dirname(path);
	return parent === '.' || parent === '/' ? null : parent;
}

/** Native agents filesystem adapter backed by the n8n sandbox service file API. */
export class N8nSandboxFilesystem extends BaseFilesystem {
	readonly id: string;

	readonly name = 'N8nSandboxFilesystem';

	readonly provider = 'n8n-sandbox';

	status: ProviderStatus = 'pending';

	constructor(private readonly sandbox: N8nSandboxServiceSandbox) {
		super();
		this.id = `n8n-sandbox-fs-${sandbox.id}`;
	}

	private async getClientAndSandboxId(abortSignal?: AbortSignal) {
		await this.sandbox.ensureRunning({ abortSignal });
		return {
			client: this.sandbox.getClient(),
			sandboxId: this.sandbox.id,
		};
	}

	private async withSandbox<T>(
		abortSignal: AbortSignal | undefined,
		op: (
			client: ReturnType<N8nSandboxServiceSandbox['getClient']>,
			sandboxId: string,
		) => Promise<T>,
	): Promise<T> {
		await this.ensureReady();
		return await raceWithAbort(async () => {
			const { client, sandboxId } = await this.getClientAndSandboxId(abortSignal);
			return await op(client, sandboxId);
		}, abortSignal);
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		return await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			const content = await client.readFile(sandboxId, path);
			if (options?.encoding) {
				return content.toString(options.encoding);
			}
			return content;
		});
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			if (options?.recursive) {
				const parent = getParentDirectory(path);
				if (parent) {
					await client.mkdir(sandboxId, parent, true);
				}
			}
			await client.writeFile(sandboxId, path, content, options?.overwrite ?? true);
		});
	}

	async appendFile(path: string, content: FileContent, options?: AppendOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			await client.appendFile(sandboxId, path, content);
		});
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			await client.deleteFile(sandboxId, path, {
				recursive: options?.recursive,
				force: options?.force,
			});
		});
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			await client.copyFile(sandboxId, {
				src,
				dest,
				recursive: options?.recursive,
				overwrite: options?.overwrite,
			});
		});
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			await client.moveFile(sandboxId, {
				src,
				dest,
				overwrite: options?.overwrite,
			});
		});
	}

	async mkdir(path: string, options?: MkdirOptions): Promise<void> {
		await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			await client.mkdir(sandboxId, path, options?.recursive ?? false);
		});
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, options);
	}

	async readdir(path: string, options?: ListOptions): Promise<FileEntry[]> {
		return await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			const files = await client.listFiles(sandboxId, { path });
			return files.map((entry) => ({
				name: entry.name,
				type: entry.isDir ? 'directory' : 'file',
				size: entry.size,
			}));
		});
	}

	async exists(path: string, options?: AbortableOptions): Promise<boolean> {
		try {
			await this.stat(path, options);
			return true;
		} catch (error) {
			if (error instanceof SandboxServiceError && error.status === 404) {
				return false;
			}
			throw error;
		}
	}

	async stat(path: string, options?: AbortableOptions): Promise<FileStat> {
		return await this.withSandbox(options?.abortSignal, async (client, sandboxId) => {
			const stat = await client.stat(sandboxId, path);
			return {
				name: stat.name,
				path: stat.path,
				type: stat.type,
				size: stat.size,
				createdAt: new Date(stat.createdAt),
				modifiedAt: new Date(stat.modifiedAt),
			};
		});
	}
}
