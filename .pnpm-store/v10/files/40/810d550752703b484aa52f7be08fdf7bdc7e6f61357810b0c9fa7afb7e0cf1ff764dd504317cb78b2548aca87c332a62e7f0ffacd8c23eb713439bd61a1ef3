/// <reference types="node" />
/// <reference types="node" />
import { Span } from '@opentelemetry/api';
import { InstrumentationConfig, SemconvStability } from '@opentelemetry/instrumentation';
/**
 * Function that can be used to serialize db.statement tag
 * @param cmdName - The name of the command (eg. set, get, mset)
 * @param cmdArgs - Array of arguments passed to the command
 *
 * @returns serialized string that will be used as the db.statement attribute.
 */
export type DbStatementSerializer = (cmdName: string, cmdArgs: Array<string | Buffer>) => string;
/**
 * Function that can be used to add custom attributes to span on response from redis server
 * @param span - The span created for the redis command, on which attributes can be set
 * @param cmdName - The name of the command (eg. set, get, mset)
 * @param cmdArgs - Array of arguments passed to the command
 * @param response - The response object which is returned to the user who called this command.
 *  Can be used to set custom attributes on the span.
 *  The type of the response varies depending on the specific command.
 */
export interface RedisResponseCustomAttributeFunction {
    (span: Span, cmdName: string, cmdArgs: Array<string | Buffer>, response: unknown): void;
}
export interface RedisInstrumentationConfig extends InstrumentationConfig {
    /** Custom serializer function for the db.statement tag */
    dbStatementSerializer?: DbStatementSerializer;
    /** Function for adding custom attributes on db response */
    responseHook?: RedisResponseCustomAttributeFunction;
    /** Require parent to create redis span, default when unset is false */
    requireParentSpan?: boolean;
    /**
     * Controls which semantic-convention attributes are emitted on spans.
     * Default: 'OLD'.
     * When this option is set, it takes precedence over any value provided via
     * the OTEL_SEMCONV_STABILITY_OPT_IN environment variable.
     */
    semconvStability?: SemconvStability;
}
//# sourceMappingURL=types.d.ts.map