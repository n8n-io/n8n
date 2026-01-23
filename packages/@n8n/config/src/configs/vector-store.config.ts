import { Config, Env } from '../decorators';

@Config
export class VectorStoreConfig {
	/** Maximum size in bytes for instance-wide vector store. */
	@Env('N8N_VECTOR_STORE_MAX_SIZE')
	maxSize: number = 200 * 1024 * 1024; // 200 MiB
}
