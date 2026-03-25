"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservabilityManager = void 0;
const ObservabilityBuilder_1 = require("./ObservabilityBuilder");
/**
 * Main entry point for Agent 365 providing OpenTelemetry tracing for AI agents and tools
 */
class ObservabilityManager {
    /**
     * Configures Agent 365 with OpenTelemetry tracing for AI agents and tools
     * @param configure Optional configuration callback for the Builder
     * @returns The configured Builder instance
     */
    static configure(configure) {
        const builder = new ObservabilityBuilder_1.ObservabilityBuilder();
        configure?.(builder);
        ObservabilityManager.instance = builder;
        return builder;
    }
    /**
     * Configures and starts Agent 365 with simplified options
     * @param options Configuration options
     * @returns The configured and started Builder instance
     */
    static start(options) {
        const builder = new ObservabilityBuilder_1.ObservabilityBuilder();
        if (options?.serviceName) {
            builder.withService(options.serviceName, options.serviceVersion);
        }
        if (options?.tokenResolver) {
            builder.withTokenResolver(options.tokenResolver);
        }
        if (options?.clusterCategory) {
            builder.withClusterCategory(options.clusterCategory);
        }
        if (options?.configProvider) {
            builder.withConfigurationProvider(options.configProvider);
        }
        builder.start();
        ObservabilityManager.instance = builder;
        return builder;
    }
    /**
     * Gets the current Agent 365 instance
     * @returns The current instance or null if not configured
     */
    static getInstance() {
        return ObservabilityManager.instance || null;
    }
    /**
     * Shuts down Agent 365
     */
    static async shutdown() {
        if (ObservabilityManager.instance) {
            await ObservabilityManager.instance.shutdown();
            ObservabilityManager.instance = undefined;
        }
    }
}
exports.ObservabilityManager = ObservabilityManager;
//# sourceMappingURL=ObservabilityManager.js.map