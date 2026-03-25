// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
// ------------------------------------------------------------------------------
import { defaultObservabilityConfigurationProvider } from '../configuration';
/**
 * Check if exporter is enabled via environment variables.
 *
 * NOTE: Exporter-specific helpers have been moved to
 * tracing/exporter/utils.ts. This file remains only for any
 * non-exporter tracing utilities that may be added in the future.
 *
 * @param configProvider Optional configuration provider. Defaults to defaultObservabilityConfigurationProvider if not specified.
 */
export const isAgent365ExporterEnabled = (configProvider) => {
    const provider = configProvider ?? defaultObservabilityConfigurationProvider;
    return provider.getConfiguration().isObservabilityExporterEnabled;
};
//# sourceMappingURL=util.js.map