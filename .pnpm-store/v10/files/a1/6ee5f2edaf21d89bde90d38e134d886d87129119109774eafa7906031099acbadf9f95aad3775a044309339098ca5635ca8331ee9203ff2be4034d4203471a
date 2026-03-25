import { RuntimeConfigurationOptions } from '@microsoft/agents-a365-runtime';
/**
 * Tooling configuration options - extends runtime options.
 * All overrides are functions called on each property access.
 *
 * Inherited from RuntimeConfigurationOptions:
 * - clusterCategory
 * - isNodeEnvDevelopment
 */
export type ToolingConfigurationOptions = RuntimeConfigurationOptions & {
    mcpPlatformEndpoint?: () => string;
    /**
     * Override for using ToolingManifest.json vs gateway discovery.
     * Falls back to inherited isNodeEnvDevelopment.
     */
    useToolingManifest?: () => boolean;
    /**
     * Override for MCP platform authentication scope.
     * Falls back to MCP_PLATFORM_AUTHENTICATION_SCOPE env var, then production default.
     */
    mcpPlatformAuthenticationScope?: () => string;
};
//# sourceMappingURL=ToolingConfigurationOptions.d.ts.map