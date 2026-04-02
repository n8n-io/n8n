import type {
	CopyOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	WriteOptions,
} from '@mastra/core/workspace';
import { MastraFilesystem } from '@mastra/core/workspace';
import { dirname } from 'node:path/posix';

import { N8nSandboxServiceError } from './n8n-sandbox-client';
import type { N8nSandboxServiceSandbox } from './n8n-sandbox-sandbox';

function getParentDirectory(path: string): string | null {
	const parent = dirname(path);
	return parent === '.' || parent === '/' ? null : parent;
}

/** Mastra filesystem adapter backed by the n8n sandbox service file API. */
export class N8nSandboxFilesystem extends MastraFilesystem {
	readonly id: string;

	readonly name = 'N8nSandboxFilesystem';

	readonly provider = 'n8n-sandbox';

	status: ProviderStatus = 'pending';

	constructor(private readonly sandbox: N8nSandboxServiceSandbox) {
		super({ name: 'N8nSandboxFilesystem' });
		this.id = `n8n-sandbox-fs-${sandbox.id}`;
	}

	private async getClientAndSandboxId() {
		await this.sandbox.ensureRunning();
		return {
			client: this.sandbox.getClient(),
			sandboxId: this.sandbox.id,
		};
	}

	async readFile(path: string, options?: ReadOptions): Promise<string | Buffer> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		const content = await client.readFile(sandboxId, path);
		if (options?.encoding) {
			return content.toString(options.encoding);
		}
		return content;
	}

	async writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		if (options?.recursive) {
			const parent = getParentDirectory(path);
			if (parent) {
				await client.mkdir(sandboxId, parent, true);
			}
		}
		await client.writeFile(sandboxId, path, content, options?.overwrite ?? true);
	}

	async appendFile(path: string, content: FileContent): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		await client.appendFile(sandboxId, path, content);
	}

	async deleteFile(path: string, options?: RemoveOptions): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		await client.deleteFile(sandboxId, path, {
			recursive: options?.recursive,
			force: options?.force,
		});
	}

	async copyFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		await client.copyFile(sandboxId, {
			src,
			dest,
			recursive: options?.recursive,
			overwrite: options?.overwrite,
		});
	}

	async moveFile(src: string, dest: string, options?: CopyOptions): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		await client.moveFile(sandboxId, {
			src,
			dest,
			overwrite: options?.overwrite,
		});
	}

	async mkdir(path: string, options?: { recursive?: boolean }): Promise<void> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		await client.mkdir(sandboxId, path, options?.recursive ?? false);
	}

	async rmdir(path: string, options?: RemoveOptions): Promise<void> {
		await this.deleteFile(path, options);
	}

	async readdir(path: string, _options?: ListOptions): Promise<FileEntry[]> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		const files = await client.listFiles(sandboxId, { path });
		return files.map((entry) => ({
			name: entry.name,
			type: entry.isDir ? 'directory' : 'file',
			size: entry.size,
		}));
	}

	async exists(path: string): Promise<boolean> {
		await this.ensureReady();
		try {
			const { client, sandboxId } = await this.getClientAndSandboxId();
			await client.stat(sandboxId, path);
			return true;
		} catch (error) {
			if (error instanceof N8nSandboxServiceError && error.status === 404) {
				return false;
			}
			throw error;
		}
	}

	async stat(path: string): Promise<FileStat> {
		await this.ensureReady();
		const { client, sandboxId } = await this.getClientAndSandboxId();
		const stat = await client.stat(sandboxId, path);
		return {
			name: stat.name,
			path: stat.path,
			type: stat.type,
			size: stat.size,
			createdAt: new Date(stat.createdAt),
			modifiedAt: new Date(stat.modifiedAt),
		};
	}
}
