/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { SeverityNumber } from '@opentelemetry/api-logs';
/**
 * Default LoggerConfig used when no pattern matches
 *
 * @experimental This feature is in development as per the OpenTelemetry specification.
 */
const DEFAULT_LOGGER_CONFIG = {
    disabled: false,
    minimumSeverity: SeverityNumber.UNSPECIFIED,
    traceBased: false,
};
/**
 * Creates a LoggerConfigurator from an array of logger patterns.
 * Patterns are evaluated in order, and the first matching pattern's config is used.
 * Supports exact matching and simple wildcard patterns with '*'.
 *
 * The returned configurator computes a complete LoggerConfig by merging the matched
 * pattern's config with default values for any unspecified properties.
 *
 * @param patterns - Array of logger patterns with their configurations
 * @returns A LoggerConfigurator function that computes complete LoggerConfig
 * @experimental This feature is in development as per the OpenTelemetry specification.
 *
 * @example
 * ```typescript
 * const configurator = createLoggerConfigurator([
 *   { pattern: 'debug-logger', config: { minimumSeverity: SeverityNumber.DEBUG } },
 *   { pattern: 'prod-*', config: { minimumSeverity: SeverityNumber.WARN } },
 *   { pattern: '*', config: { minimumSeverity: SeverityNumber.INFO } },
 * ]);
 * ```
 */
export function createLoggerConfigurator(patterns) {
    return (loggerScope) => {
        const loggerName = loggerScope.name;
        // Find the first matching pattern
        for (const { pattern, config } of patterns) {
            if (matchesPattern(loggerName, pattern)) {
                // Compute complete config by merging with defaults
                return {
                    disabled: config.disabled ?? DEFAULT_LOGGER_CONFIG.disabled,
                    minimumSeverity: config.minimumSeverity ?? DEFAULT_LOGGER_CONFIG.minimumSeverity,
                    traceBased: config.traceBased ?? DEFAULT_LOGGER_CONFIG.traceBased,
                };
            }
        }
        // No pattern matched, return default config
        return { ...DEFAULT_LOGGER_CONFIG };
    };
}
/**
 * Matches a logger name against a pattern.
 * Supports simple wildcard matching with '*'.
 *
 * @param name - The logger name to match
 * @param pattern - The pattern to match against (supports '*' wildcard)
 * @returns true if the name matches the pattern
 */
function matchesPattern(name, pattern) {
    // Exact match
    if (pattern === name) {
        return true;
    }
    // Wildcard pattern
    if (pattern.includes('*')) {
        const regexPattern = pattern
            .split('*')
            .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
            .join('.*');
        const regex = new RegExp(`^${regexPattern}$`);
        return regex.test(name);
    }
    return false;
}
//# sourceMappingURL=LoggerConfigurators.js.map