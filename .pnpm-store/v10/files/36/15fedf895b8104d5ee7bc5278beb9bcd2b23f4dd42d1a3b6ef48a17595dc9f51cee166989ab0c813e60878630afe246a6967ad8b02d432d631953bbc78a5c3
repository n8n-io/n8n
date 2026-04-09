import type { LoggerConfig, LoggerConfigurator } from '../types';
/**
 * Configuration for a specific logger pattern
 *
 * @experimental This feature is in development as per the OpenTelemetry specification.
 */
export interface LoggerPattern {
    /**
     * The logger name or pattern to match.
     * Use '*' for wildcard matching.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    pattern: string;
    /**
     * The configuration to apply to matching loggers.
     * Partial config is allowed; unspecified properties will use defaults.
     *
     * @experimental This feature is in development as per the OpenTelemetry specification.
     */
    config: LoggerConfig;
}
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
export declare function createLoggerConfigurator(patterns: LoggerPattern[]): LoggerConfigurator;
//# sourceMappingURL=LoggerConfigurators.d.ts.map