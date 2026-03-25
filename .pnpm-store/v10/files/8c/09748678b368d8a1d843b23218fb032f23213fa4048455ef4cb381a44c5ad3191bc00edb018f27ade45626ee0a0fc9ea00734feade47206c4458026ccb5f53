import { InstrumentationConfig } from '@opentelemetry/instrumentation';
import type { Span } from '@opentelemetry/api';
export interface MySQL2ResponseHookInformation {
    queryResults: any;
}
export interface MySQL2InstrumentationExecutionResponseHook {
    (span: Span, responseHookInfo: MySQL2ResponseHookInformation): void;
}
export interface MySQL2InstrumentationQueryMaskingHook {
    (query: string): string;
}
export interface MySQL2InstrumentationConfig extends InstrumentationConfig {
    /**
     * If true, the query will be masked before setting it as a span attribute, using the {@link maskStatementHook}.
     *
     * @default false
     * @see maskStatementHook
     */
    maskStatement?: boolean;
    /**
     * Hook that allows masking the query string before setting it as span attribute.
     *
     * @default (query: string) => query.replace(/\b\d+\b/g, '?').replace(/(["'])(?:(?=(\\?))\2.)*?\1/g, '?')
     */
    maskStatementHook?: MySQL2InstrumentationQueryMaskingHook;
    /**
     * Hook that allows adding custom span attributes based on the data
     * returned MySQL2 queries.
     *
     * @default undefined
     */
    responseHook?: MySQL2InstrumentationExecutionResponseHook;
    /**
     * If true, queries are modified to also include a comment with
     * the tracing context, following the {@link https://github.com/open-telemetry/opentelemetry-sqlcommenter sqlcommenter} format
     */
    addSqlCommenterCommentToQueries?: boolean;
}
//# sourceMappingURL=types.d.ts.map