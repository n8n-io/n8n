import { Config, Env } from '@n8n/config';

@Config
export class SimulationServiceConfig {
	/**
	 * Base URL of an OpenAI-compatible upstream LLM endpoint used by the simulation service's
	 * provider translation layer during workflow simulation.
	 */
	@Env('N8N_SIMULATION_SERVICE_LLM_BASE_URL')
	llmBaseUrl: string = '';

	/**
	 * Model identifier forwarded to the upstream LLM endpoint during simulation.
	 */
	@Env('N8N_SIMULATION_SERVICE_LLM_MODEL')
	llmModel: string = '';

	/**
	 * API key sent to the upstream LLM endpoint during simulation.
	 */
	@Env('N8N_SIMULATION_SERVICE_LLM_API_KEY')
	llmApiKey: string = '';

	/**
	 * Maximum concurrent tenant slots preallocated in the in-process simulation engine.
	 */
	@Env('N8N_SIMULATION_SERVICE_MAX_TENANTS')
	maxTenants: number = 8;

	/**
	 * Maximum store records preallocated in the in-process simulation engine slab.
	 */
	@Env('N8N_SIMULATION_SERVICE_MAX_RECORDS')
	maxRecords: number = 2048;

	/**
	 * Maximum 256-byte store blocks preallocated in the in-process simulation engine slab.
	 */
	@Env('N8N_SIMULATION_SERVICE_MAX_BLOCKS')
	maxBlocks: number = 4096;

	/**
	 * Maximum monitor event ring buffer entries preallocated in the in-process simulation engine.
	 */
	@Env('N8N_SIMULATION_SERVICE_MONITOR_RING_CAP')
	monitorRingCap: number = 256;

	/**
	 * Default timeout in milliseconds for a single simulated workflow run.
	 */
	@Env('N8N_SIMULATION_SERVICE_DEFAULT_TIMEOUT_MS')
	defaultTimeoutMs: number = 60_000;
}
