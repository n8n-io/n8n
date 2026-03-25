"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ToolingConfiguration = void 0;
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
// Constants for tooling-specific settings
const MCP_PLATFORM_PROD_BASE_URL = 'https://agent365.svc.cloud.microsoft';
const PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE = 'ea9ffc3e-8a23-4a7d-836d-234d7c7565c1/.default';
/**
 * Normalize URL by trimming whitespace and removing trailing slashes.
 * Prevents double-slash issues in URL construction (e.g., "https://example.com//api").
 */
function normalizeUrl(url) {
    return url.trim().replace(/\/+$/, '');
}
/**
 * Configuration for tooling package.
 * Inherits runtime settings and adds tooling-specific settings.
 */
class ToolingConfiguration extends agents_a365_runtime_1.RuntimeConfiguration {
    // Type-safe access to tooling overrides
    get toolingOverrides() {
        return this.overrides;
    }
    constructor(overrides) {
        super(overrides);
    }
    // Inherited: clusterCategory, isDevelopmentEnvironment, isNodeEnvDevelopment
    get mcpPlatformEndpoint() {
        const override = this.toolingOverrides.mcpPlatformEndpoint?.();
        if (override)
            return normalizeUrl(override);
        const envValue = process.env.MCP_PLATFORM_ENDPOINT?.trim();
        if (envValue)
            return normalizeUrl(envValue);
        return MCP_PLATFORM_PROD_BASE_URL;
    }
    /**
     * Whether to use the ToolingManifest.json file instead of gateway discovery.
     * Returns true when NODE_ENV is set to 'development' (case-insensitive), or
     * when explicitly overridden via configuration.
     */
    get useToolingManifest() {
        const override = this.toolingOverrides.useToolingManifest?.();
        if (override !== undefined)
            return override;
        return this.isNodeEnvDevelopment;
    }
    /**
     * Gets the MCP platform authentication scope.
     * Used by AgenticAuthenticationService for token exchange.
     * Trims whitespace to prevent token exchange failures.
     */
    get mcpPlatformAuthenticationScope() {
        const override = this.toolingOverrides.mcpPlatformAuthenticationScope?.()?.trim();
        if (override)
            return override;
        const envValue = process.env.MCP_PLATFORM_AUTHENTICATION_SCOPE?.trim();
        if (envValue)
            return envValue;
        return PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE;
    }
}
exports.ToolingConfiguration = ToolingConfiguration;
//# sourceMappingURL=ToolingConfiguration.js.map