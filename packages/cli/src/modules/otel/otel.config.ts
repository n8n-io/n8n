import { Config, Env } from '@n8n/config';
import { z } from 'zod';

import type { OtlpProtocol } from './otel.constants';
import { OTEL_ENV_VARS, OTLP_PROTOCOLS } from './otel.constants';

const otlpProtocolSchema = z.enum(OTLP_PROTOCOLS);

@Config
export class OtelConfig {
	@Env(OTEL_ENV_VARS.enabled)
	enabled: boolean = false;

	/**
	 * Wire protocol used to export spans. The endpoint scheme (`http://` vs
	 * `https://`) controls TLS for both protocols; gRPC endpoints take no path.
	 */
	@Env(OTEL_ENV_VARS.exporterProtocol, otlpProtocolSchema)
	exporterProtocol: OtlpProtocol = 'http/protobuf';

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
