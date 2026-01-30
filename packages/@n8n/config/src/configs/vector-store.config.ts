import { Config, Env } from '../decorators';

@Config
export class VectorStoreConfig {
	/** Maximum size in bytes for instance-wide vector store. */
	@Env('N8N_VECTOR_STORE_MAX_SIZE')
	maxSize: number = 200 * 1024 * 1024; // 200 MiB

	/** Base path for LanceDB storage (relative to n8n user directory). */
	@Env('N8N_VECTOR_STORE_LANCEDB_PATH')
	lancedbPath: string = 'vector-store';
}
