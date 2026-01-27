import { Config, Env } from '@n8n/config';
import { existsSync, renameSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';

import { InstanceSettings } from '@/instance-settings';
import { StoragePathError } from '@/storage-path-conflict.error';

export const EXECUTION_DATA_STORAGE_MODES = ['database', 'filesystem'] as const;

const modeSchema = z.enum(EXECUTION_DATA_STORAGE_MODES);

@Config
export class StorageConfig {
	/** Mode for storing execution data, either 'database' (default) or 'filesystem'. */
	@Env('N8N_EXECUTION_DATA_STORAGE_MODE', modeSchema)
	mode: z.infer<typeof modeSchema> = 'database';

	get modeTag(): 'db' | 'fs' {
		return this.mode === 'database' ? 'db' : 'fs';
	}

	/** Base path for filesystem storage. Defaults to `~/.n8n/storage`. */
	@Env('N8N_STORAGE_PATH')
	storagePath: string;

	private readonly instanceSettings: InstanceSettings;

	constructor(instanceSettings: InstanceSettings) {
		this.instanceSettings = instanceSettings;
		this.storagePath = path.join(instanceSettings.n8nFolder, 'storage');
	}

	sanitize() {
		const storagePath = process.env.N8N_STORAGE_PATH;
		const binaryDataStoragePath = process.env.N8N_BINARY_DATA_STORAGE_PATH;

		if (storagePath && binaryDataStoragePath && storagePath !== binaryDataStoragePath) {
			throw StoragePathError.conflict();
		}

		this.migrateStorageDir();
	}

	/**
	 * Migrate `~/.n8n/binaryData` to `~/.n8n/storage`. The new name reflects the
	 * fact that this dir contains binary data for workflows, execution data for
	 * workflows, and chat hub attachments.
	 *
	 * Migration skips if...
	 * - already migrated,
	 * - `N8N_STORAGE_PATH` is set (user wants custom new path),
	 * - `N8N_BINARY_DATA_STORAGE_PATH` is set (user wants custom old path), or
	 * - `~/.n8n/binaryData` does not exist (nothing to migrate)
	 *
	 * Migration throws if...
	 * - `~/.n8n/storage` happens to be in use already (user must rename).
	 */
	private migrateStorageDir() {
		if (this.instanceSettings.fsStorageMigrated) return;
		if (process.env.N8N_STORAGE_PATH) return;
		if (process.env.N8N_BINARY_DATA_STORAGE_PATH) return;

		const { n8nFolder } = this.instanceSettings;
		const oldPath = path.join(n8nFolder, 'binaryData');

		if (!existsSync(oldPath)) return;

		const newPath = path.join(n8nFolder, 'storage');

		if (existsSync(newPath)) {
			throw StoragePathError.taken(oldPath, newPath);
		}

		try {
			renameSync(oldPath, newPath);
			this.instanceSettings.markFsStorageMigrated();
		} catch (error) {
			if (this.isIgnorableRenameError(error)) return;
			throw error;
		}
	}

	private isIgnorableRenameError(error: unknown): error is NodeJS.ErrnoException {
		return (
			error !== null &&
			typeof error === 'object' &&
			'code' in error &&
			(error.code === 'ENOENT' || error.code === 'EEXIST') // for shared volume mount, or multi-main in single host (local dev)
		);
	}
}
