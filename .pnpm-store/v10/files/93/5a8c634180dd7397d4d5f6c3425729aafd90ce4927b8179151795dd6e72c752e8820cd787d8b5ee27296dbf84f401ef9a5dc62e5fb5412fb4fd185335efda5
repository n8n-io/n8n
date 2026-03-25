import { OtlpSharedConfiguration } from '@opentelemetry/otlp-exporter-base';
import type { ChannelCredentials, Metadata } from '@grpc/grpc-js';
export interface OtlpGrpcConfiguration extends OtlpSharedConfiguration {
    url: string;
    metadata: () => Metadata;
    credentials: () => ChannelCredentials;
}
/**
 * Unresolved configuration where parts of the config may depend on other config options being resolved first.
 */
export interface UnresolvedOtlpGrpcConfiguration extends OtlpSharedConfiguration {
    url: string;
    metadata: () => Metadata;
    /**
     * Credentials are based on the final resolved URL
     */
    credentials: (url: string) => () => ChannelCredentials;
}
export declare function validateAndNormalizeUrl(url: string): string;
export declare function mergeOtlpGrpcConfigurationWithDefaults(userProvidedConfiguration: Partial<OtlpGrpcConfiguration>, fallbackConfiguration: Partial<UnresolvedOtlpGrpcConfiguration>, defaultConfiguration: UnresolvedOtlpGrpcConfiguration): OtlpGrpcConfiguration;
export declare function getOtlpGrpcDefaultConfiguration(): UnresolvedOtlpGrpcConfiguration;
//# sourceMappingURL=otlp-grpc-configuration.d.ts.map