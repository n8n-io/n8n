import { Config, Env, ExecutionsConfig } from '@n8n/config';
import { createHash } from 'node:crypto';
import { z } from 'zod';

import { InstanceSettings } from '@/instance-settings';
import { StorageConfig } from '@/storage.config';

export const BINARY_DATA_MODES = ['default', 'filesystem', 's3', 'database'] as const;

const binaryDataModesSchema = z.enum(BINARY_DATA_MODES);

const availableModesSchema = z
	.string()
	.transform((value) => value.split(','))
	.pipe(binaryDataModesSchema.array());

const dbMaxFileSizeSchema = z.coerce
	.number()
	.max(1024, 'Binary data max file size in `database` mode cannot exceed 1024 MiB'); // because of Postgres BYTEA hard limit

@Config
export class BinaryDataConfig {
	/** Available modes of binary data storage, as comma separated strings. */
	availableModes: z.infer<typeof availableModesSchema> = ['filesystem', 's3', 'database'];

	/** Storage mode for binary data. Defaults to 'filesystem' in regular mode, 'database' in scaling mode. */
	@Env('N8N_DEFAULT_BINARY_DATA_MODE', binaryDataModesSchema)
	mode!: z.infer<typeof binaryDataModesSchema>;

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

	constructor(
		{ encryptionKey }: InstanceSettings,
		executionsConfig: ExecutionsConfig,
		storageConfig: StorageConfig,
	) {
		/**
		 * Set the binary data storage path:
		 *
		 * - N8N_BINARY_DATA_STORAGE_PATH, else
		 * - N8N_STORAGE_PATH, else
		 * - ~/.n8n/storage
		 *
		 * `~/.n8n/binaryData` is no longer the default if the env var is unset.
		 */
		this.localStoragePath ??= storageConfig.storagePath;
		this.signingSecret = createHash('sha256')
			.update(`url-signing:${encryptionKey}`)
			.digest('base64');

		this.mode ??= executionsConfig.mode === 'queue' ? 'database' : 'filesystem';
	}

	/**
	 * Two-phase init: reads or creates the signing.binary_data deployment-key row.
	 * Must be called after DB migrations complete, before any signed-URL generation.
	 * Precedence: N8N_BINARY_DATA_SIGNING_SECRET env → DB active row → derive-from-key (and persist)
	 */
	async initialize(repo: {
		findActiveByType(type: string): Promise<{ value: string } | null>;
		insertOrIgnore(entity: {
			type: string;
			value: string;
			status: string;
			algorithm: null;
		}): Promise<void>;
	}): Promise<void> {
		if (process.env.N8N_BINARY_DATA_SIGNING_SECRET) {
			return;
		}
		const existing = await repo.findActiveByType('signing.binary_data');
		if (existing) {
			this.signingSecret = existing.value;
			return;
		}
		await repo.insertOrIgnore({
			type: 'signing.binary_data',
			value: this.signingSecret,
			status: 'active',
			algorithm: null,
		});
		const winner = await repo.findActiveByType('signing.binary_data');
		if (winner) this.signingSecret = winner.value;
	}
}
