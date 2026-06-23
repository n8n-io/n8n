import { Config, Env } from '@n8n/config';

import { OTEL_ENV_VARS } from './otel.constants';

@Config
export class OtelConfig {
	@Env(OTEL_ENV_VARS.enabled)
	enabled: boolean = false;

	@Env(OTEL_ENV_VARS.exporterEndpoint)
	exporterEndpoint: string = 'http://localhost:4318';

	@Env(OTEL_ENV_VARS.exporterTracingPath)
	exporterTracingPath: string = '/v1/traces';

	@Env(OTEL_ENV_VARS.exporterHeaders)
	exporterHeaders: string = '';

	@Env(OTEL_ENV_VARS.exporterServiceName)
	exporterServiceName: string = 'n8n';

	@Env(OTEL_ENV_VARS.tracesSampleRate)
	tracesSampleRate: number = 1.0;

	@Env(OTEL_ENV_VARS.startupConnectivityTimeoutMs)
	startupConnectivityTimeoutMs: number = 2_000;

	@Env(OTEL_ENV_VARS.includeNodeSpans)
	includeNodeSpans: boolean = true;

	@Env(OTEL_ENV_VARS.injectOutbound)
	injectOutbound: boolean = true;

	/** When true, only traces production executions of published (active) workflows, not manual/test runs. */
	@Env(OTEL_ENV_VARS.productionExecutionsOnly)
	productionExecutionsOnly: boolean = true;
}
