import { Config, Env } from '../decorators';

@Config
export class MemoryGuardConfig {
	/**
	 * Experimental. Whether n8n protects the instance from running out of memory, in
	 * regular mode only. When memory runs high, new production executions wait, and n8n
	 * stops the running execution that holds the most data, with its sub-workflows.
	 * After three such stops of the same workflow, n8n unpublishes it and emails its owner.
	 */
	@Env('N8N_MEMORY_GUARD_ENABLED')
	enabled: boolean = false;
}
