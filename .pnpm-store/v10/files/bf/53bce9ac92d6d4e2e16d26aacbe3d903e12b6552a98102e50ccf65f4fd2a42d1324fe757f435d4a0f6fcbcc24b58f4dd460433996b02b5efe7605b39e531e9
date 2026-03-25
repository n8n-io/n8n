import { Client } from "@sentry/types";
import { NormalizedOptions } from "../options-mapping";
import { Scope } from "@sentry/core";
export declare function createSentryInstance(options: NormalizedOptions, shouldSendTelemetry: Promise<boolean>, buildTool: string): {
    sentryScope: Scope;
    sentryClient: Client;
};
export declare function setTelemetryDataOnScope(options: NormalizedOptions, scope: Scope, buildTool: string): void;
export declare function allowedToSendTelemetry(options: NormalizedOptions): Promise<boolean>;
/**
 * Flushing the SDK client can fail. We never want to crash the plugin because of telemetry.
 */
export declare function safeFlushTelemetry(sentryClient: Client): Promise<void>;
//# sourceMappingURL=telemetry.d.ts.map