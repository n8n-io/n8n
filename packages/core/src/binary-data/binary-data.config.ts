import { Config, Env } from '@n8n/config';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { z } from 'zod';

import { InstanceSettings } from '@/instance-settings';

export const BINARY_DATA_MODES = ['default', 'filesystem', 's3', 'database'] as const;

const binaryDataModesSchema = z.enum(BINARY_DATA_MODES);

const availableModesSchema = z
	.string()
	.transform((value) => value.split(','))
	.pipe(binaryDataModesSchema.array());

const dbMaxFileSizeSchema = z
	.number()
	.max(1024, 'Binary data max file size in `database` mode cannot exceed 1024 MiB'); // because of Postgres BYTEA hard limit

@Config
export class BinaryDataConfig {
	/** Available modes of binary data storage, as comma separated strings. */
	@Env('N8N_AVAILABLE_BINARY_DATA_MODES', availableModesSchema)
	availableModes: z.infer<typeof availableModesSchema> = ['filesystem'];

	/** Storage mode for binary data. */
	@Env('N8N_DEFAULT_BINARY_DATA_MODE', binaryDataModesSchema)
	mode: z.infer<typeof binaryDataModesSchema> = 'default';

	/** Path for binary data storage in "filesystem" mode. */
	@Env('N8N_BINARY_DATA_STORAGE_PATH')
	localStoragePath: string;

	/**
	 * Secret for creating publicly-accesible signed URLs for binary data.
	 * When not passed in, this will be derived from the instances's encryption-key
	 **/
	@Env('N8N_BINARY_DATA_SIGNING_SECRET')
	signingSecret: string;

	/** Maximum file size (in MiB) for binary data in `database` mode. **/
	@Env('N8N_BINARY_DATA_DATABASE_MAX_FILE_SIZE', dbMaxFileSizeSchema)
	dbMaxFileSize: number = 512;

	constructor({ encryptionKey, n8nFolder }: InstanceSettings) {
		this.localStoragePath = path.join(n8nFolder, 'binaryData');
		this.signingSecret = createHash('sha256')
			.update(`url-signing:${encryptionKey}`)
			.digest('base64');
	}
}
