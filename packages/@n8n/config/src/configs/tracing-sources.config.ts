import z from 'zod';

import { Config, Env } from '../decorators';

const onWhenUnsetOrTrueSchema = z.string().transform((value) => value === '' || value === 'true');

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

	/**
	 * Whether the Microsoft Agent 365 node sends its spans to Microsoft's Agent 365
	 * observability service. These spans can contain user messages and agent replies.
	 * Both `ENABLE_OBSERVABILITY` and `ENABLE_A365_OBSERVABILITY_EXPORTER` must be unset
	 * or `true`. Set either one to any other value to stop sending them.
	 */
	@Env('ENABLE_OBSERVABILITY', onWhenUnsetOrTrueSchema)
	microsoftAgent365ObservabilityEnabled: boolean = true;

	/**
	 * Whether the Microsoft Agent 365 node sends its spans to Microsoft's Agent 365
	 * observability service. These spans can contain user messages and agent replies.
	 * Both `ENABLE_OBSERVABILITY` and `ENABLE_A365_OBSERVABILITY_EXPORTER` must be unset
	 * or `true`. Set either one to any other value to stop sending them.
	 */
	@Env('ENABLE_A365_OBSERVABILITY_EXPORTER', onWhenUnsetOrTrueSchema)
	microsoftAgent365ExporterEnabled: boolean = true;

	get microsoftAgent365ExportEnabled(): boolean {
		return this.microsoftAgent365ObservabilityEnabled && this.microsoftAgent365ExporterEnabled;
	}
}
