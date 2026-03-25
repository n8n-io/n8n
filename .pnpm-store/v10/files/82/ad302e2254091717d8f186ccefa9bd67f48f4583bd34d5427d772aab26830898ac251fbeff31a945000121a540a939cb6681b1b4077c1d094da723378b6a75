"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------------------------
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAgent365ExporterEnabled = void 0;
const configuration_1 = require("../configuration");
/**
 * Check if exporter is enabled via environment variables.
 *
 * NOTE: Exporter-specific helpers have been moved to
 * tracing/exporter/utils.ts. This file remains only for any
 * non-exporter tracing utilities that may be added in the future.
 *
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
const isAgent365ExporterEnabled = (configProvider) => {
    const provider = configProvider ?? configuration_1.defaultObservabilityConfigurationProvider;
    return provider.getConfiguration().isObservabilityExporterEnabled;
};
exports.isAgent365ExporterEnabled = isAgent365ExporterEnabled;
//# sourceMappingURL=util.js.map