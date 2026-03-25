// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ClusterCategory } from '../power-platform-api-discovery';
/**
 * Base configuration class for Agent365 SDK.
 * Other packages extend this to add their own settings.
 *
 * Override functions are called on each property access, enabling dynamic
 * resolution from async context (e.g., OpenTelemetry baggage) per-request.
 */
export class RuntimeConfiguration {
    /**
     * Parse an environment variable as a boolean.
     * Recognizes 'true', '1', 'yes', 'on' (case-insensitive) as true; all other values as false.
     */
    static parseEnvBoolean(envValue) {
        if (!envValue)
            return false;
        return ['true', '1', 'yes', 'on'].includes(envValue.toLowerCase());
    }
    /**
     * Parse an environment variable as an integer, returning fallback if invalid or not set.
     */
    static parseEnvInt(envValue, fallback) {
        if (!envValue)
            return fallback;
        const parsed = parseInt(envValue, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }
    constructor(overrides) {
        this.overrides = overrides ?? {};
    }
    get clusterCategory() {
        if (this.overrides.clusterCategory) {
            return this.overrides.clusterCategory();
        }
        const envValue = process.env.CLUSTER_CATEGORY;
        if (envValue) {
            const normalized = envValue.toLowerCase();
            if (Object.values(ClusterCategory).includes(normalized)) {
                return normalized;
            }
            // Invalid value - fall through to default
        }
        return ClusterCategory.prod;
    }
    /**
     * Whether the cluster is a development environment (local or dev).
     * Based on clusterCategory.
     */
    get isDevelopmentEnvironment() {
        return [ClusterCategory.local, ClusterCategory.dev].includes(this.clusterCategory);
    }
    /**
     * Whether NODE_ENV indicates development mode.
     * Returns true when NODE_ENV is 'development' (case-insensitive).
     * This is the standard Node.js way of indicating development mode.
     */
    get isNodeEnvDevelopment() {
        const override = this.overrides.isNodeEnvDevelopment?.();
        if (override !== undefined)
            return override;
        const nodeEnv = process.env.NODE_ENV ?? '';
        return nodeEnv.toLowerCase() === 'development';
    }
}
//# sourceMappingURL=RuntimeConfiguration.js.map