import { Config, Env } from '../decorators';

@Config
export class MemoryGuardConfig {
	/**
	 * Experimental. Whether n8n estimates how much execution data each running
	 * execution holds in memory, in regular mode only. This setting has no visible
	 * effect yet.
	 */
	@Env('N8N_MEMORY_GUARD_ENABLED')
	enabled: boolean = false;
}
