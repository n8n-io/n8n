import { ClusterCategory } from '../power-platform-api-discovery';
import { RuntimeConfigurationOptions } from './RuntimeConfigurationOptions';
/**
 * Base configuration class for Agent365 SDK.
 * Other packages extend this to add their own settings.
 *
 * Override functions are called on each property access, enabling dynamic
 * resolution from async context (e.g., OpenTelemetry baggage) per-request.
 */
export declare class RuntimeConfiguration {
    protected readonly overrides: RuntimeConfigurationOptions;
    /**
     * Parse an environment variable as a boolean.
     * Recognizes 'true', '1', 'yes', 'on' (case-insensitive) as true; all other values as false.
     */
    static parseEnvBoolean(envValue: string | undefined): boolean;
    /**
     * Parse an environment variable as an integer, returning fallback if invalid or not set.
     */
    static parseEnvInt(envValue: string | undefined, fallback: number): number;
    constructor(overrides?: RuntimeConfigurationOptions);
    get clusterCategory(): ClusterCategory;
    /**
     * Whether the cluster is a development environment (local or dev).
     * Based on clusterCategory.
     */
    get isDevelopmentEnvironment(): boolean;
    /**
     * Whether NODE_ENV indicates development mode.
     * Returns true when NODE_ENV is 'development' (case-insensitive).
     * This is the standard Node.js way of indicating development mode.
     */
    get isNodeEnvDevelopment(): boolean;
}
//# sourceMappingURL=RuntimeConfiguration.d.ts.map