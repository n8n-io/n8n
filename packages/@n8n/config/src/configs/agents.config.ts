import { Time } from '@n8n/constants';

import { CommaSeparatedStringArray } from '../custom-types';
import { Config, Env } from '../decorators';

/**
 * Known agent sub-feature modules. Add a token here to make it valid in
 * `N8N_AGENTS_MODULES`. The backend fails fast on unknown tokens so typos
 * surface at startup instead of silently disabling a feature.
 */
export const AGENTS_MODULE_NAMES = [] as const;

export type AgentsModuleName = (typeof AGENTS_MODULE_NAMES)[number];

class AgentsModuleArray extends CommaSeparatedStringArray<AgentsModuleName> {
	constructor(str: string) {
		super(str);

		for (const name of this) {
			const moduleName: string = name;
			if (!AGENTS_MODULE_NAMES.includes(name)) {
				const validTokens = AGENTS_MODULE_NAMES.join(', ');
				throw new Error(
					`Unknown agents module: "${moduleName}". ${
						validTokens
							? `Valid tokens: ${validTokens}.`
							: 'No agents modules are currently supported.'
					}`,
				);
			}
		}
	}
}

@Config
export class AgentsConfig {
	/** TTL in seconds for agent checkpoint records. Stale checkpoints older than this are pruned. */
	@Env('N8N_AGENTS_CHECKPOINT_TTL')
	checkpointTtlSeconds: number = 96 * Time.hours.toSeconds;

	/**
	 * Whether agent runs emit OpenTelemetry spans. Rides along with the OTel
	 * module (endpoint, headers, sampling and transport are inherited from
	 * `N8N_OTEL_*`), so it has no effect when no OTel provider is registered.
	 * Lets operators run workflow OTel without agent spans.
	 */
	@Env('N8N_AGENTS_TRACING_ENABLED')
	tracingEnabled: boolean = true;

	/**
	 * Comma-separated list of agent sub-feature modules to enable. Each entry
	 * gates a specific frontend/runtime capability inside the agents module.
	 * Add supported module tokens to `AGENTS_MODULE_NAMES`.
	 */
	@Env('N8N_AGENTS_MODULES')
	modules: AgentsModuleArray = [];

	/** Enable Daytona sandbox for agent knowledge base operations. */
	@Env('N8N_AGENTS_AI_SANDBOX_ENABLED')
	sandboxEnabled: boolean = false;

	/** Sandbox provider for agent knowledge base. Only `daytona` is supported. */
	@Env('N8N_AGENTS_AI_SANDBOX_PROVIDER')
	sandboxProvider: string = '';

	/** Docker image for the Daytona sandbox (default: daytonaio/sandbox:0.5.0). */
	@Env('N8N_AGENTS_AI_SANDBOX_IMAGE')
	sandboxImage: string = 'daytonaio/sandbox:0.5.0';

	/** Daytona snapshot name for agent knowledge sandboxes. Falls back to image when unavailable. */
	@Env('N8N_AGENTS_AI_SANDBOX_SNAPSHOT')
	sandboxSnapshot: string = '';

	/** Default command timeout in the sandbox (milliseconds). */
	@Env('N8N_AGENTS_AI_SANDBOX_TIMEOUT')
	sandboxTimeout: number = 5 * Time.minutes.toMilliseconds;

	/** When true, Daytona deletes the knowledge sandbox when it stops. */
	@Env('N8N_AGENTS_AI_SANDBOX_EPHEMERAL')
	sandboxEphemeral: boolean = false;

	/** Daytona API URL (e.g. "https://app.daytona.io/api"). */
	@Env('DAYTONA_API_URL')
	daytonaApiUrl: string = '';

	/** Daytona API key for authentication. */
	@Env('DAYTONA_API_KEY')
	daytonaApiKey: string = '';
}
