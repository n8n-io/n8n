import { RuntimeConfiguration } from '@microsoft/agents-a365-runtime';
import { ToolingConfigurationOptions } from './ToolingConfigurationOptions';
/**
 * Configuration for tooling package.
 * Inherits runtime settings and adds tooling-specific settings.
 */
export declare class ToolingConfiguration extends RuntimeConfiguration {
    protected get toolingOverrides(): ToolingConfigurationOptions;
    constructor(overrides?: ToolingConfigurationOptions);
    get mcpPlatformEndpoint(): string;
    /**
     * Whether to use the ToolingManifest.json file instead of gateway discovery.
     * Returns true when NODE_ENV is set to 'development' (case-insensitive), or
     * when explicitly overridden via configuration.
     */
    get useToolingManifest(): boolean;
    /**
     * Gets the MCP platform authentication scope.
     * Used by AgenticAuthenticationService for token exchange.
     * Trims whitespace to prevent token exchange failures.
     */
    get mcpPlatformAuthenticationScope(): string;
}
//# sourceMappingURL=ToolingConfiguration.d.ts.map