import { Inject, Injectable } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import sandboxConfig from '../config/sandbox.config';
import type { SandboxMount } from '../sandbox/sandbox.service';
import { SandboxService } from '../sandbox/sandbox.service';
import { S3StorageService } from '../storage/s3-storage.service';
import type { ExecuteCommandResponse, VolumeMount } from '../types';
import { VolumesService } from '../volumes/volumes.service';

interface FileChecksum {
	relativePath: string;
	hash: string;
}

/** Tracks state for a single volume mount during execution */
interface MountState {
	mount: VolumeMount;
	/** Host-side staging directory where volume files are downloaded */
	stagingDir: string;
	/** Pre-execution checksums (only populated for read-write mounts) */
	preChecksums: FileChecksum[];
}

@Injectable()
export class CommandsService {
	private static readonly WORKSPACE_ROOT = '/workspace';

	constructor(
		private readonly s3: S3StorageService,
		private readonly volumes: VolumesService,
		private readonly sandbox: SandboxService,
		@Inject(sandboxConfig.KEY)
		private readonly config: ConfigType<typeof sandboxConfig>,
	) {}

	async execute(options: {
		command: string;
		volumes?: VolumeMount[];
		timeoutMs?: number;
		env?: Record<string, string>;
	}): Promise<ExecuteCommandResponse> {
		// Each execution gets its own isolated workspace so concurrent
		// executions don't clobber each other's files.
		const executionId = randomUUID();
		const workDir = join(CommandsService.WORKSPACE_ROOT, executionId);

		try {
			// 1. Create isolated workspace directory
			await mkdir(workDir, { recursive: true });

			// 2. Prepare volume mounts — download files, compute checksums
			const mountStates = await this.prepareMounts(options.volumes ?? [], workDir);

			// 3. Build sandbox mount descriptors
			const sandboxMounts: SandboxMount[] = mountStates.map((state) => ({
				hostPath: state.stagingDir,
				containerPath: state.mount.mountPath,
				readOnly: state.mount.readOnly ?? false,
			}));

			// 4. Execute command inside bwrap sandbox
			const timeoutMs = options.timeoutMs ?? this.config.timeoutMs;
			const result = await this.sandbox.execute({
				command: options.command,
				workDir,
				timeoutMs,
				env: options.env,
				mounts: sandboxMounts.length > 0 ? sandboxMounts : undefined,
			});

			// 5. Sync changed files back to S3 for read-write volumes
			await this.syncMounts(mountStates);

			return result;
		} finally {
			// 6. Clean up entire execution workspace (includes staging dirs)
			await rm(workDir, { recursive: true, force: true });
		}
	}

	/**
	 * For each volume mount, create a host-side staging directory, download the
	 * volume's files into it, and (for rw mounts) compute pre-execution checksums.
	 */
	private async prepareMounts(mounts: VolumeMount[], workDir: string): Promise<MountState[]> {
		const states: MountState[] = [];

		for (const mount of mounts) {
			// Verify the volume exists
			const exists = await this.volumes.exists(mount.volumeId);
			if (!exists) {
				throw new Error(`Volume '${mount.volumeId}' not found`);
			}

			// Create a staging directory for this mount's files.
			// Use the volumeId as the directory name (it's already unique).
			const stagingDir = join(workDir, '_mounts', mount.volumeId);
			await mkdir(stagingDir, { recursive: true });

			// Download volume files into the staging directory
			await this.downloadVolumeFiles(mount.volumeId, stagingDir);

			// For read-write mounts, compute pre-execution checksums so we can
			// detect changes after the command runs
			let preChecksums: FileChecksum[] = [];
			if (!mount.readOnly) {
				preChecksums = await this.checksumDirectory(stagingDir);
			}

			states.push({ mount, stagingDir, preChecksums });
		}

		return states;
	}

	/**
	 * After command execution, sync changed files back to S3 for all
	 * read-write volume mounts.
	 */
	private async syncMounts(mountStates: MountState[]): Promise<void> {
		for (const state of mountStates) {
			// Skip read-only volumes — nothing to sync back
			if (state.mount.readOnly) continue;

			await this.syncChangedFiles(state.mount.volumeId, state.stagingDir, state.preChecksums);
		}
	}

	private async downloadVolumeFiles(volumeId: string, targetDir: string): Promise<void> {
		const dataPrefix = this.volumes.getDataPrefix(volumeId);
		const objects = await this.s3.listObjects(dataPrefix);

		for (const obj of objects) {
			const relativePath = obj.key.slice(dataPrefix.length);
			if (!relativePath) continue;

			const localPath = join(targetDir, relativePath);
			const dir = join(localPath, '..');

			await mkdir(dir, { recursive: true });
			const data = await this.s3.getObject(obj.key);
			await writeFile(localPath, data);
		}
	}

	private async checksumDirectory(dir: string): Promise<FileChecksum[]> {
		const checksums: FileChecksum[] = [];
		await this.walkDirectory(dir, async (filePath) => {
			const content = await readFile(filePath);
			const hash = createHash('sha256').update(content).digest('hex');
			checksums.push({
				relativePath: relative(dir, filePath),
				hash,
			});
		});
		return checksums;
	}

	private async syncChangedFiles(
		volumeId: string,
		stagingDir: string,
		preChecksums: FileChecksum[],
	): Promise<void> {
		const dataPrefix = this.volumes.getDataPrefix(volumeId);
		const postChecksums = await this.checksumDirectory(stagingDir);

		const preMap = new Map(preChecksums.map((c) => [c.relativePath, c.hash]));
		const postSet = new Set(postChecksums.map((c) => c.relativePath));

		// Upload new or changed files
		for (const { relativePath, hash } of postChecksums) {
			const preHash = preMap.get(relativePath);
			if (preHash !== hash) {
				const localPath = join(stagingDir, relativePath);
				const content = await readFile(localPath);
				await this.s3.putObject(`${dataPrefix}${relativePath}`, content);
			}
		}

		// Delete files from S3 that were removed during execution
		const deletedKeys = preChecksums
			.filter((c) => !postSet.has(c.relativePath))
			.map((c) => `${dataPrefix}${c.relativePath}`);

		if (deletedKeys.length > 0) {
			await this.s3.deleteObjects(deletedKeys);
		}
	}

	private async walkDirectory(
		dir: string,
		processFile: (filePath: string) => Promise<void>,
	): Promise<void> {
		const entries = await readdir(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isDirectory()) {
				await this.walkDirectory(fullPath, processFile);
			} else if (entry.isFile()) {
				await processFile(fullPath);
			}
		}
	}
}
