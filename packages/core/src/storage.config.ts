import { Config, Env } from '@n8n/config';
import path from 'node:path';
import { z } from 'zod';

import { ConflictingStoragePathsError } from '@/conflicting-storage-paths.error';
import { InstanceSettings } from '@/instance-settings';

export const EXECUTION_DATA_STORAGE_MODES = ['database', 'filesystem'] as const;

const modeSchema = z.enum(EXECUTION_DATA_STORAGE_MODES);

@Config
export class StorageConfig {
	/** Mode for storing execution data, either 'database' (default) or 'filesystem'. */
	@Env('N8N_EXECUTION_DATA_STORAGE_MODE', modeSchema)
	mode: z.infer<typeof modeSchema> = 'database';

	/** Base path for filesystem storage. Defaults to `~/.n8n/storage`. */
	@Env('N8N_STORAGE_PATH')
	storagePath: string;

	constructor({ n8nFolder }: InstanceSettings) {
		this.storagePath = path.join(n8nFolder, 'storage');
	}

	sanitize() {
		const storagePath = process.env.N8N_STORAGE_PATH;
		const binaryDataStoragePath = process.env.N8N_BINARY_DATA_STORAGE_PATH;

		if (storagePath === undefined || binaryDataStoragePath === undefined) return;

		if (storagePath !== binaryDataStoragePath) throw new ConflictingStoragePathsError();
	}
}
