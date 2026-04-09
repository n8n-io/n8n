// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createLoggerContext } from "@typespec/ts-http-runtime/internal/logger";
const context = createLoggerContext({
    logLevelEnvVarName: "AZURE_LOG_LEVEL",
    namespace: "azure",
});
/**
 * The AzureLogger provides a mechanism for overriding where logs are output to.
 * By default, logs are sent to stderr.
 * Override the `log` method to redirect logs to another location.
 */
export const AzureLogger = context.logger;
/**
 * Immediately enables logging at the specified log level. If no level is specified, logging is disabled.
 * @param level - The log level to enable for logging.
 * Options from most verbose to least verbose are:
 * - verbose
 * - info
 * - warning
 * - error
 */
export function setLogLevel(level) {
    context.setLogLevel(level);
}
/**
 * Retrieves the currently specified log level.
 */
export function getLogLevel() {
    return context.getLogLevel();
}
/**
 * Creates a logger for use by the Azure SDKs that inherits from `AzureLogger`.
 * @param namespace - The name of the SDK package.
 * @hidden
 */
export function createClientLogger(namespace) {
    return context.createClientLogger(namespace);
}
//# sourceMappingURL=index.js.map