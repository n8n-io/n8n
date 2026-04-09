/// <reference types="node" />
/// <reference types="node" />
import type * as http from 'http';
import type * as https from 'https';
import type { OTLPExporterConfigBase } from './legacy-base-configuration';
import type { HttpAgentFactory } from './otlp-node-http-configuration';
/**
 * Collector Exporter node base config
 */
export interface OTLPExporterNodeConfigBase extends OTLPExporterConfigBase {
    keepAlive?: boolean;
    compression?: CompressionAlgorithm;
    /**
     * Custom HTTP agent options or a factory function for creating agents.
     *
     * @remarks
     * Prefer using `http.AgentOptions` or `https.AgentOptions` over a factory function wherever possible.
     * If using a factory function (`HttpAgentFactory`), **do not import `http.Agent` or `https.Agent`
     * statically at the top of the file**.
     * Instead, use dynamic `import()` or `require()` to load the module. This ensures that the `http` or `https`
     * module is not loaded before `@opentelemetry/instrumentation-http` can instrument it.
     *
     * @example <caption> Using agent options directly: </caption>
     * httpAgentOptions: {
     *   keepAlive: true,
     *   maxSockets: 10
     * }
     *
     * @example <caption> Using a factory with dynamic import: </caption>
     * httpAgentOptions: async (protocol) => {
     *   const module = protocol === 'http:' ? await import('http') : await import('https');
     *   return new module.Agent({ keepAlive: true });
     * }
     */
    httpAgentOptions?: http.AgentOptions | https.AgentOptions | HttpAgentFactory;
    /**
     * User agent header string to be prepended to the exporter's default value.
     * Availablie since v1.49.0 of the spec.
     * Ref: https://opentelemetry.io/docs/specs/otel/protocol/exporter/#user-agent
     */
    userAgent?: string;
}
export declare enum CompressionAlgorithm {
    NONE = "none",
    GZIP = "gzip"
}
//# sourceMappingURL=legacy-node-configuration.d.ts.map