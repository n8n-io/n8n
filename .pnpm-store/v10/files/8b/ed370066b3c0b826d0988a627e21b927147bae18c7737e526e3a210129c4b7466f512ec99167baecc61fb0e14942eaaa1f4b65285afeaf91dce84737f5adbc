// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RuntimeConfiguration } from './RuntimeConfiguration';
/**
 * Default provider that returns environment-based configuration.
 *
 * **Multi-tenant considerations:**
 * This provider creates a single configuration instance at construction time,
 * shared across all requests in a process. The default module-level providers
 * (e.g., `defaultRuntimeConfigurationProvider`) are singletons.
 *
 * For multi-tenant scenarios, two approaches are supported:
 *
 * 1. **Dynamic override functions (recommended):** Pass override functions that
 *    read from async context (e.g., OpenTelemetry baggage) at runtime. The same
 *    Configuration instance returns different values per request.
 *    ```typescript
 *    const config = new ToolingConfiguration({
 *      mcpPlatformEndpoint: () => {
 *        const tenantConfig = context.active().getValue(TENANT_KEY);
 *        return tenantConfig?.endpoint ?? 'https://default.endpoint';
 *      }
 *    });
 *    ```
 *
 * 2. **Per-tenant providers:** Create separate provider instances for each tenant
 *    when different tenants need different override functions entirely.
 */
export class DefaultConfigurationProvider {
    constructor(factory) {
        this._configuration = factory();
    }
    getConfiguration() {
        return this._configuration;
    }
}
/**
 * Shared default provider for RuntimeConfiguration.
 * Uses environment variables with no overrides - suitable for single-tenant
 * deployments or when using dynamic override functions for multi-tenancy.
 */
export const defaultRuntimeConfigurationProvider = new DefaultConfigurationProvider(() => new RuntimeConfiguration());
//# sourceMappingURL=DefaultConfigurationProvider.js.map