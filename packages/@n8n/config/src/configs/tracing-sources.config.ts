import { Config, Env } from '../decorators';

@Config
export class TracingSourcesConfig {
	/**
	 * Whether n8n sends spans from the Daytona sandbox client to your OpenTelemetry
	 * endpoint. These spans cover the sandbox calls that AI agents make. OpenTelemetry
	 * tracing must also be on.
	 */
	@Env('N8N_DAYTONA_TRACING_ENABLED')
	daytonaTracingEnabled: boolean = false;

	/**
	 * Whether n8n sends spans from the Microsoft Agent 365 node to your OpenTelemetry
	 * endpoint. These spans can contain user messages and agent replies. OpenTelemetry
	 * tracing must also be on.
	 */
	@Env('N8N_MICROSOFT_AGENT_365_TRACING_ENABLED')
	microsoftAgent365TracingEnabled: boolean = false;
}
