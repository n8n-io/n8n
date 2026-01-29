import { Config, Env } from '../decorators';

@Config
export class LanceDBConfig {
	/** Base path for LanceDB storage (relative to n8n user directory). */
	@Env('N8N_LANCEDB_PATH')
	path: string = 'vector-store';

	/** Enable debug logging for LanceDB operations. */
	@Env('N8N_LANCEDB_DEBUG')
	debug: boolean = false;

	/** Maximum number of concurrent LanceDB connections. */
	@Env('N8N_LANCEDB_POOL_SIZE')
	poolSize: number = 10;
}
