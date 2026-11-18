import { z } from 'zod';

/** Observability backends that n8n can build a trace link for. `none` turns trace links off. */
export const TRACE_LINK_BACKENDS = [
	'none',
	'jaeger',
	'tempo',
	'datadog',
	'honeycomb',
	'zipkin',
] as const;

export type TraceLinkBackend = (typeof TRACE_LINK_BACKENDS)[number];

export const traceLinkBackendSchema = z.enum(TRACE_LINK_BACKENDS);

export const traceLinkBaseUrlSchema = z
	.string()
	.trim()
	.refine((value) => value === '' || (/^https?:\/\//i.test(value) && URL.canParse(value)), {
		message: 'Base URL must start with http:// or https://',
	});

/** A link from an execution to its trace in the observability backend. */
export type ExecutionTraceLink = {
	traceId: string;
	url: string;
};
