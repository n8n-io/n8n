"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityConfiguration = void 0;
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
// Default constants
const PROD_OBSERVABILITY_SCOPE = 'https://api.powerplatform.com/.default';
/**
 * Configuration for observability package.
 * Inherits runtime settings and adds observability-specific settings.
 */
class ObservabilityConfiguration extends agents_a365_runtime_1.RuntimeConfiguration {
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
        return agents_a365_runtime_1.RuntimeConfiguration.parseEnvBoolean(process.env.ENABLE_A365_OBSERVABILITY_EXPORTER);
    }
    get useCustomDomainForObservability() {
        const result = this.observabilityOverrides.useCustomDomainForObservability?.();
        if (result !== undefined)
            return result;
        return agents_a365_runtime_1.RuntimeConfiguration.parseEnvBoolean(process.env.A365_OBSERVABILITY_USE_CUSTOM_DOMAIN);
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
exports.ObservabilityConfiguration = ObservabilityConfiguration;
//# sourceMappingURL=ObservabilityConfiguration.js.map