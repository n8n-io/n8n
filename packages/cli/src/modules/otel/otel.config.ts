import { exporterEndpointSchema, otlpProtocolSchema } from '@n8n/api-types';
import { Config, Env } from '@n8n/config';
import { z } from 'zod';

import type { OtlpProtocol } from './otel.constants';
import {
	CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR,
	DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES,
	OTEL_ENV_VARS,
} from './otel.constants';

@Config
export class OtelConfig {
	@Env(OTEL_ENV_VARS.enabled)
	enabled: boolean = false;

	@Env(OTEL_ENV_VARS.exporterProtocol, otlpProtocolSchema)
	exporterProtocol: OtlpProtocol = 'http/protobuf';

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

	@Env(OTEL_ENV_VARS.emitWorkflowStartSpan)
	emitWorkflowStartSpan: boolean = false;

	@Env(OTEL_ENV_VARS.emitNodeStartSpan)
	emitNodeStartSpan: boolean = false;

	@Env(OTEL_ENV_VARS.injectOutbound)
	injectOutbound: boolean = true;

	/** When true, only traces production executions of published (active) workflows, not manual/test runs. */
	@Env(OTEL_ENV_VARS.productionExecutionsOnly)
	productionExecutionsOnly: boolean = true;
}

const customAttributePrefixesSchema = z
	.string()
	.transform((value, ctx): unknown => {
		try {
			return JSON.parse(value);
		} catch {
			ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'must be valid JSON' });
			return z.NEVER;
		}
	})
	.pipe(
		z
			.object({
				project: z.string().default(DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES.project),
				workflow: z.string().default(DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES.workflow),
				node: z.string().default(DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES.node),
			})
			.strict(),
	);

export type CustomAttributePrefixes = z.infer<typeof customAttributePrefixesSchema>;

@Config
export class OtelCustomAttributesConfig {
	/**
	 * A JSON object that replaces the prefix n8n adds to custom telemetry tag keys on spans, for each of `project`, `workflow` and `node`. Set a level to an empty string to send its keys without a prefix, for example `{"project":"","node":""}` sends `team` instead of `n8n.project.custom.team`. A level you leave out keeps its default prefix, and n8n ignores the whole value if it isn't valid. Set the same value on all main, worker and webhook instances.
	 */
	@Env(CUSTOM_ATTRIBUTE_PREFIXES_ENV_VAR, customAttributePrefixesSchema)
	prefixes: CustomAttributePrefixes = { ...DEFAULT_CUSTOM_ATTRIBUTE_PREFIXES };
}
