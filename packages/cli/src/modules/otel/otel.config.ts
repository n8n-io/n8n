import {
	exporterEndpointSchema,
	otlpProtocolSchema,
	traceLinkBackendSchema,
	traceLinkBaseUrlSchema,
} from '@n8n/api-types';
import { Config, Env } from '@n8n/config';
import { z } from 'zod';

import type { OtlpProtocol, TraceLinkBackend } from './otel.constants';
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

	/**
	 * Whether to add a link to the execution in n8n to each workflow span, as the `n8n.execution.url` attribute. n8n builds the link from `N8N_EDITOR_BASE_URL`, or from its host and port when that variable isn't set. If n8n runs behind a proxy, set `N8N_EDITOR_BASE_URL` on all main and worker instances so the link uses the public URL.
	 */
	@Env(OTEL_ENV_VARS.includeExecutionUrl)
	includeExecutionUrl: boolean = false;

	/**
	 * The observability backend that n8n links executions to. Users then see an "Open trace" button on each execution that has a sampled trace. One of `none`, `jaeger`, `tempo`, `datadog`, `honeycomb`, `zipkin`. Set to `none` to hide the button.
	 */
	@Env(OTEL_ENV_VARS.traceLinkBackend, traceLinkBackendSchema)
	traceLinkBackend: TraceLinkBackend = 'none';

	/**
	 * The URL of your observability backend UI, for example `https://jaeger.example.com` or `https://grafana.example.com`. For Datadog, use your site URL, for example `https://app.datadoghq.eu`. For Honeycomb, use your environment URL, for example `https://ui.honeycomb.io/my-team/environments/production`.
	 */
	@Env(OTEL_ENV_VARS.traceLinkBaseUrl, traceLinkBaseUrlSchema)
	traceLinkBaseUrl: string = '';

	/**
	 * The UID of your Tempo data source in Grafana. n8n uses it only when the trace link backend is `tempo`.
	 */
	@Env(OTEL_ENV_VARS.traceLinkDatasourceUid)
	traceLinkDatasourceUid: string = '';
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
