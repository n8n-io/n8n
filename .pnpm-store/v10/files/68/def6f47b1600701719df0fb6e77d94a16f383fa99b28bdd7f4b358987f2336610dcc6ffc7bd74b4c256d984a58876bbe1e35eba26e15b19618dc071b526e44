/// <reference types="node" />
/// <reference types="node" />
import { OtlpSharedConfiguration } from './shared-configuration';
import type * as http from 'http';
import type * as https from 'https';
export type HttpAgentFactory = (protocol: string) => http.Agent | https.Agent | Promise<http.Agent> | Promise<https.Agent>;
export interface OtlpHttpConfiguration extends OtlpSharedConfiguration {
    url: string;
    headers: () => Record<string, string>;
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
}
export declare function httpAgentFactoryFromOptions(options: http.AgentOptions | https.AgentOptions): HttpAgentFactory;
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
export declare function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration: Partial<OtlpHttpConfiguration>, fallbackConfiguration: Partial<OtlpHttpConfiguration>, defaultConfiguration: OtlpHttpConfiguration): OtlpHttpConfiguration;
export declare function getHttpConfigurationDefaults(requiredHeaders: Record<string, string>, signalResourcePath: string): OtlpHttpConfiguration;
//# sourceMappingURL=otlp-http-configuration.d.ts.map