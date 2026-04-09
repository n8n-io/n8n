import { ENVIRONMENT } from '@opentelemetry/core';
import { Sampler } from './Sampler';
/**
 * Load default configuration. For fields with primitive values, any user-provided
 * value will override the corresponding default value. For fields with
 * non-primitive values (like `spanLimits`), the user-provided value will be
 * used to extend the default value.
 */
export declare function loadDefaultConfig(): {
    sampler: Sampler;
    forceFlushTimeoutMillis: number;
    generalLimits: {
        attributeValueLengthLimit: number;
        attributeCountLimit: number;
    };
    spanLimits: {
        attributeValueLengthLimit: number;
        attributeCountLimit: number;
        linkCountLimit: number;
        eventCountLimit: number;
        attributePerEventCountLimit: number;
        attributePerLinkCountLimit: number;
    };
};
/**
 * Based on environment, builds a sampler, complies with specification.
 * @param environment optional, by default uses getEnv(), but allows passing a value to reuse parsed environment
 */
export declare function buildSamplerFromEnv(environment?: Required<ENVIRONMENT>): Sampler;
//# sourceMappingURL=config.d.ts.map