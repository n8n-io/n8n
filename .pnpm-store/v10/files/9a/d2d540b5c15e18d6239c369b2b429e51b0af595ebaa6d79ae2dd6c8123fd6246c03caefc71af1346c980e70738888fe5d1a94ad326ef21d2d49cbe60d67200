// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { RuntimeConfiguration } from '@microsoft/agents-a365-runtime';
// Default constants
const PROD_OBSERVABILITY_SCOPE = 'https://api.powerplatform.com/.default';
/**
 * Configuration for observability package.
 * Inherits runtime settings and adds observability-specific settings.
 */
export class ObservabilityConfiguration extends RuntimeConfiguration {
    get observabilityOverrides() {
        return this.overrides;
    }
    constructor(overrides) {
        super(overrides);
    }
    // Inherited: clusterCategory, isDevelopmentEnvironment, isNodeEnvDevelopment
    /**
     * Gets the observability authentication scopes.
     * Used by AgenticTokenCache for observability service authentication.
     */
    get observabilityAuthenticationScopes() {
        const result = this.observabilityOverrides.observabilityAuthenticationScopes?.();
        if (result !== undefined) {
            return result;
        }
        const override = process.env.A365_OBSERVABILITY_SCOPES_OVERRIDE;
        if (override?.trim()) {
            return override.trim().split(/\s+/);
        }
        return [PROD_OBSERVABILITY_SCOPE];
    }
    get isObservabilityExporterEnabled() {
        const result = this.observabilityOverrides.isObservabilityExporterEnabled?.();
        if (result !== undefined)
            return result;
        return RuntimeConfiguration.parseEnvBoolean(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER);
    }
    get useCustomDomainForObservability() {
        const result = this.observabilityOverrides.useCustomDomainForObservability?.();
        if (result !== undefined)
            return result;
        return RuntimeConfiguration.parseEnvBoolean(process.env.A365_OBSERVABILITY_USE_CUSTOM_DOMAIN);
    }
    get observabilityDomainOverride() {
        const result = this.observabilityOverrides.observabilityDomainOverride?.();
        if (result !== undefined) {
            return result;
        }
        const override = process.env.A365_OBSERVABILITY_DOMAIN_OVERRIDE;
        if (override?.trim()) {
            return override.trim().replace(/\/+$/, '');
        }
        return null;
    }
    get observabilityLogLevel() {
        return this.observabilityOverrides.observabilityLogLevel?.()
            ?? process.env.A365_OBSERVABILITY_LOG_LEVEL
            ?? 'none';
    }
}
//# sourceMappingURL=ObservabilityConfiguration.js.map