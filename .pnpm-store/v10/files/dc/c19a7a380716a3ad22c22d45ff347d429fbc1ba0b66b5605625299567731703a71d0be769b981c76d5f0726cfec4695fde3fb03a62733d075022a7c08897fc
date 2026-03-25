import { ClusterCategory } from '../power-platform-api-discovery';
/**
 * Runtime configuration options - all optional functions.
 * Functions are called on each property access, enabling dynamic resolution.
 * Unset values fall back to environment variables.
 */
export type RuntimeConfigurationOptions = {
    /**
     * Override function for cluster category.
     * Called on each property access to enable dynamic per-request resolution.
     * Falls back to CLUSTER_CATEGORY env var, then 'prod'.
     *
     * @example
     * // Static override
     * { clusterCategory: () => ClusterCategory.gov }
     *
     * // Dynamic per-tenant override using async context
     * { clusterCategory: () => context.active().getValue(TENANT_CONFIG_KEY)?.cluster ?? ClusterCategory.prod }
     */
    clusterCategory?: () => ClusterCategory;
    /**
     * Override for NODE_ENV-based development mode detection.
     * Called on each property access to enable dynamic per-request resolution.
     * Falls back to NODE_ENV === 'development' check.
     *
     * @example
     * // Static override
     * { isNodeEnvDevelopment: () => true }
     *
     * // Dynamic override based on request context
     * { isNodeEnvDevelopment: () => context.active().getValue(DEBUG_KEY) === true }
     */
    isNodeEnvDevelopment?: () => boolean;
};
//# sourceMappingURL=RuntimeConfigurationOptions.d.ts.map