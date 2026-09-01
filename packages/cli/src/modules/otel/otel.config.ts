import { exporterEndpointSchema, otlpProtocolSchema } from '@n8n/api-types';
import { Config, Env } from '@n8n/config';

import type { OtlpProtocol } from './otel.constants';
import { OTEL_ENV_VARS } from './otel.constants';

@Config
export class OtelConfig {
	@Env(OTEL_ENV_VARS.enabled)
	enabled: boolean = false;

	/** Wire protocol used to export spans. A gRPC endpoint takes no URL path. */
	@Env(OTEL_ENV_VARS.exporterProtocol, otlpProtocolSchema)
	exporterProtocol: OtlpProtocol = 'http/protobuf';

	/** Reuses the API DTO schema, so env- and UI-supplied endpoints accept the same values. */
	@Env(OTEL_ENV_VARS.exporterEndpoint, exporterEndpointSchema)
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
