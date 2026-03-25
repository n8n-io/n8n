/**
 * Utility logic for environment-related operations.
 *
 * Note: These utility functions are maintained for backward compatibility.
 * For new code, prefer using the configuration classes directly:
 * - RuntimeConfiguration for clusterCategory, isDevelopmentEnvironment, isNodeEnvDevelopment
 * - ToolingConfiguration for mcpPlatformAuthenticationScope
 * - ObservabilityConfiguration for observabilityAuthenticationScopes
 */
import { RuntimeConfiguration } from './configuration';
import { IConfigurationProvider } from './configuration/IConfigurationProvider';
/**
 * Production observability authentication scope.
 * @deprecated This constant is exported for backward compatibility only.
 * For new code, use `ObservabilityConfiguration.observabilityAuthenticationScopes` instead.
 */
export declare const PROD_OBSERVABILITY_SCOPE = "https://api.powerplatform.com/.default";
/**
 * Production MCP platform authentication scope.
 * @deprecated This constant is exported for backward compatibility only.
 * For new code, use `ToolingConfiguration.mcpPlatformAuthenticationScope` instead.
 */
export declare const PROD_MCP_PLATFORM_AUTHENTICATION_SCOPE = "ea9ffc3e-8a23-4a7d-836d-234d7c7565c1/.default";
/**
 * Default cluster category for production environments.
 * @deprecated This constant is exported for backward compatibility only.
 * For new code, use `RuntimeConfiguration.clusterCategory` instead.
 */
export declare const PROD_OBSERVABILITY_CLUSTER_CATEGORY = "prod";
export declare const PRODUCTION_ENVIRONMENT_NAME = "production";
export declare const DEVELOPMENT_ENVIRONMENT_NAME = "Development";
/**
 * Returns the scope for authenticating to the observability service.
 *
 * @returns The authentication scopes for the current environment.
 * @deprecated Use ObservabilityConfiguration.observabilityAuthenticationScopes instead.
 *
 * @example
 * // Before:
 * import { getObservabilityAuthenticationScope } from '@microsoft/agents-a365-runtime';
 * const scopes = getObservabilityAuthenticationScope();
 *
 * // After:
 * import { defaultObservabilityConfigurationProvider } from '@microsoft/agents-a365-observability';
 * const scopes = [...defaultObservabilityConfigurationProvider.getConfiguration().observabilityAuthenticationScopes];
 */
export declare function getObservabilityAuthenticationScope(): string[];
/**
 * Gets the cluster category from environment variables.
 *
 * @param configProvider Optional configuration provider. Defaults to defaultRuntimeConfigurationProvider if not specified.
 * @returns The cluster category from CLUSTER_CATEGORY env var, defaults to 'prod'.
 * @deprecated Use RuntimeConfiguration.clusterCategory instead.
 *
 * @example
 * // Before:
 * import { getClusterCategory } from '@microsoft/agents-a365-runtime';
 * const cluster = getClusterCategory();
 *
 * // After:
 * import { defaultRuntimeConfigurationProvider } from '@microsoft/agents-a365-runtime';
 * const cluster = defaultRuntimeConfigurationProvider.getConfiguration().clusterCategory;
 */
export declare function getClusterCategory(configProvider?: IConfigurationProvider<RuntimeConfiguration>): string;
/**
 * Returns true if the current environment is a development environment.
 *
 * @param configProvider Optional configuration provider. Defaults to defaultRuntimeConfigurationProvider if not specified.
 * @returns True if the current environment is development, false otherwise.
 * @deprecated Use RuntimeConfiguration.isDevelopmentEnvironment instead.
 *
 * @example
 * // Before:
 * import { isDevelopmentEnvironment } from '@microsoft/agents-a365-runtime';
 * if (isDevelopmentEnvironment()) { ... }
 *
 * // After:
 * import { defaultRuntimeConfigurationProvider } from '@microsoft/agents-a365-runtime';
 * if (defaultRuntimeConfigurationProvider.getConfiguration().isDevelopmentEnvironment) { ... }
 */
export declare function isDevelopmentEnvironment(configProvider?: IConfigurationProvider<RuntimeConfiguration>): boolean;
/**
 * Gets the MCP platform authentication scope.
 *
 * @returns The MCP platform authentication scope.
 * @deprecated Use ToolingConfiguration.mcpPlatformAuthenticationScope instead.
 *
 * @example
 * // Before:
 * import { getMcpPlatformAuthenticationScope } from '@microsoft/agents-a365-runtime';
 * const scope = getMcpPlatformAuthenticationScope();
 *
 * // After:
 * import { defaultToolingConfigurationProvider } from '@microsoft/agents-a365-tooling';
 * const scope = defaultToolingConfigurationProvider.getConfiguration().mcpPlatformAuthenticationScope;
 */
export declare function getMcpPlatformAuthenticationScope(): string;
//# sourceMappingURL=environment-utils.d.ts.map