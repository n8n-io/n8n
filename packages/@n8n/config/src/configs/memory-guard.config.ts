import { Config, Env } from '../decorators';

@Config
export class MemoryGuardConfig {
	/**
	 * Experimental. Whether n8n protects the instance from running out of memory, in
	 * regular mode only. When memory runs high, n8n holds new production executions and
	 * stops the running execution that holds the most data, together with its
	 * sub-workflows.
	 */
	@Env('N8N_MEMORY_GUARD_ENABLED')
	enabled: boolean = false;
}
