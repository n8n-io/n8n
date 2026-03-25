// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { diag } from "@opentelemetry/api";
import { ConnectionStringParser } from "../utils/connectionStringParser.js";
import { DEFAULT_BREEZE_ENDPOINT, ENV_CONNECTION_STRING, LEGACY_ENV_DISABLE_STATSBEAT, } from "../Declarations/Constants.js";
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
export class AzureMonitorBaseExporter {
    /**
     * Initializes a new instance of the AzureMonitorBaseExporter class.
     * @param AzureMonitorExporterOptions - Exporter configuration.
     */
    constructor(options = {}, isStatsbeatExporter) {
        var _a;
        /**
         * Instrumentation key to be used for exported envelopes
         */
        this.instrumentationKey = "";
        /**
         * Ingestion Endpoint URL
         */
        this.endpointUrl = "";
        /**
         *Flag to determine if exporter will generate Statsbeat data
         */
        this.trackStatsbeat = false;
        this.options = options;
        this.instrumentationKey = "";
        this.endpointUrl = DEFAULT_BREEZE_ENDPOINT;
        const connectionString = this.options.connectionString || process.env[ENV_CONNECTION_STRING];
        this.isStatsbeatExporter = isStatsbeatExporter ? isStatsbeatExporter : false;
        if (connectionString) {
            const parsedConnectionString = ConnectionStringParser.parse(connectionString);
            this.instrumentationKey =
                parsedConnectionString.instrumentationkey || this.instrumentationKey;
            this.endpointUrl = ((_a = parsedConnectionString.ingestionendpoint) === null || _a === void 0 ? void 0 : _a.trim()) || this.endpointUrl;
            this.aadAudience = parsedConnectionString.aadaudience;
        }
        // Instrumentation key is required
        if (!this.instrumentationKey) {
            const message = "No instrumentation key or connection string was provided to the Azure Monitor Exporter";
            diag.error(message);
            throw new Error(message);
        }
        if (!ConnectionStringParser.validateInstrumentationKey(this.instrumentationKey)) {
            const message = "Invalid instrumentation key was provided to the Azure Monitor Exporter";
            diag.error(message);
            throw new Error(message);
        }
        this.trackStatsbeat = !this.isStatsbeatExporter && !process.env[LEGACY_ENV_DISABLE_STATSBEAT];
        diag.debug("AzureMonitorExporter was successfully setup");
    }
}
//# sourceMappingURL=base.js.map