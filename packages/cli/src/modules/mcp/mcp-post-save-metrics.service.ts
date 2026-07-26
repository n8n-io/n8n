import { PrometheusMetricsConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { Counter } from 'prom-client';

/**
 * Counters for failures that happen *after* a workflow create/update has been
 * persisted to the database. The MCP workflow-builder tools recover from these
 * (the row is already on disk), so the failure is observability-only — the
 * client still sees success. This service exists so operators can spot
 * regressions in hooks, telemetry, or auto-assignment without parsing logs.
 *
 * Registered lazily on first use so unit tests that don't touch the counter
 * (and disabled-metric configurations) never construct a `Counter` instance.
 */
@Service()
export class McpPostSaveMetricsService {
	private readonly config: PrometheusMetricsConfig;
	private postSaveFailuresTotal?: Counter<'tool' | 'error_type'>;

	constructor(config: PrometheusMetricsConfig) {
		this.config = config;
	}

	/**
	 * Increment `mcp_post_save_failures_total{tool, error_type}`. `error_type`
	 * is the class name of the thrown error, falling back to a stable string
	 * for non-Error throws so the label cardinality stays bounded.
	 */
	incrementPostSaveFailure(tool: 'create' | 'update', error: unknown): void {
		this.postSaveFailuresTotal ??= new Counter({
			name: `${this.config.prefix}mcp_post_save_failures_total`,
			help: 'MCP workflow-builder tool failures that occurred after a successful database write (hooks, telemetry, auto-assign). The client still receives success — these are observability-only.',
			labelNames: ['tool', 'error_type'],
		});

		const errorType =
			error instanceof Error
				? error.constructor.name
				: typeof error === 'string'
					? error
					: 'Unknown';
		this.postSaveFailuresTotal.inc({ tool, error_type: errorType }, 1);
	}
}
