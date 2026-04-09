/// <reference types="node" />
/// <reference types="node" />
import { OtlpHttpConfiguration } from './otlp-http-configuration';
import type * as http from 'http';
import type * as https from 'https';
export type HttpAgentFactory = (protocol: string) => http.Agent | https.Agent | Promise<http.Agent> | Promise<https.Agent>;
export interface OtlpNodeHttpConfiguration extends OtlpHttpConfiguration {
    /**
     * Factory function for creating agents.
     *
     * @remarks
     * Prefer using {@link httpAgentFactoryFromOptions} over manually writing a factory function wherever possible.
     * If using a factory function (`HttpAgentFactory`), **do not import `http.Agent` or `https.Agent`
     * statically at the top of the file**.
     * Instead, use dynamic `import()` or `require()` to load the module. This ensures that the `http` or `https`
     * module is not loaded before `@opentelemetry/instrumentation-http` can instrument it.
     */
    agentFactory: HttpAgentFactory;
    /**
     * User agent header string to be appended to the exporter's value as a prefix.
     * Availablie since v1.49.0 of the spec.
     * Ref: https://opentelemetry.io/docs/specs/otel/protocol/exporter/#user-agent
     */
    userAgent?: string;
}
export declare function httpAgentFactoryFromOptions(options: http.AgentOptions | https.AgentOptions): HttpAgentFactory;
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
export declare function mergeOtlpNodeHttpConfigurationWithDefaults(userProvidedConfiguration: Partial<OtlpNodeHttpConfiguration>, fallbackConfiguration: Partial<OtlpNodeHttpConfiguration>, defaultConfiguration: OtlpNodeHttpConfiguration): OtlpNodeHttpConfiguration;
export declare function getNodeHttpConfigurationDefaults(requiredHeaders: Record<string, string>, signalResourcePath: string): OtlpNodeHttpConfiguration;
//# sourceMappingURL=otlp-node-http-configuration.d.ts.map