import { OtlpSharedConfiguration } from './shared-configuration';
export type HeadersFactory = () => Promise<Record<string, string>>;
export interface OtlpHttpConfiguration extends OtlpSharedConfiguration {
    url: string;
    headers: HeadersFactory;
}
/**
 * @param userProvidedConfiguration  Configuration options provided by the user in code.
 * @param fallbackConfiguration Fallback to use when the {@link userProvidedConfiguration} does not specify an option.
 * @param defaultConfiguration The defaults as defined by the exporter specification
 */
export declare function mergeOtlpHttpConfigurationWithDefaults(userProvidedConfiguration: Partial<OtlpHttpConfiguration>, fallbackConfiguration: Partial<OtlpHttpConfiguration>, defaultConfiguration: OtlpHttpConfiguration): OtlpHttpConfiguration;
export declare function getHttpConfigurationDefaults(requiredHeaders: Record<string, string>, signalResourcePath: string): OtlpHttpConfiguration;
//# sourceMappingURL=otlp-http-configuration.d.ts.map