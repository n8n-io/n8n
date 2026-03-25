import type { SenderResult } from "../../types.js";
import type { TelemetryItem as Envelope } from "../../generated/index.js";
import type { AzureMonitorExporterOptions } from "../../config.js";
import { BaseSender } from "./baseSender.js";
/**
 * Exporter HTTP sender class
 * @internal
 */
export declare class HttpSender extends BaseSender {
    private readonly appInsightsClient;
    private appInsightsClientOptions;
    constructor(options: {
        endpointUrl: string;
        instrumentationKey: string;
        trackStatsbeat: boolean;
        exporterOptions: AzureMonitorExporterOptions;
        aadAudience?: string;
        isStatsbeatSender?: boolean;
    });
    /**
     * Send Azure envelopes
     * @internal
     */
    send(envelopes: Envelope[]): Promise<SenderResult>;
    /**
     * Shutdown sender
     * @internal
     */
    shutdown(): Promise<void>;
    handlePermanentRedirect(location: string | undefined): void;
}
//# sourceMappingURL=httpSender.d.ts.map