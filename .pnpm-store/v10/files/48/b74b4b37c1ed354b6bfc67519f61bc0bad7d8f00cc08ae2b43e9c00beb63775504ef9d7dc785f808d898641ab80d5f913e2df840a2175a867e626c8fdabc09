"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.AzureMonitorBaseExporter = void 0;
const api_1 = require("@opentelemetry/api");
const connectionStringParser_js_1 = require("../utils/connectionStringParser.js");
const Constants_js_1 = require("../Declarations/Constants.js");
/**
 * Azure Monitor OpenTelemetry Trace Exporter.
 */
class AzureMonitorBaseExporter {
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
        this.endpointUrl = Constants_js_1.DEFAULT_BREEZE_ENDPOINT;
        const connectionString = this.options.connectionString || process.env[Constants_js_1.ENV_CONNECTION_STRING];
        this.isStatsbeatExporter = isStatsbeatExporter ? isStatsbeatExporter : false;
        if (connectionString) {
            const parsedConnectionString = connectionStringParser_js_1.ConnectionStringParser.parse(connectionString);
            this.instrumentationKey =
                parsedConnectionString.instrumentationkey || this.instrumentationKey;
            this.endpointUrl = ((_a = parsedConnectionString.ingestionendpoint) === null || _a === void 0 ? void 0 : _a.trim()) || this.endpointUrl;
            this.aadAudience = parsedConnectionString.aadaudience;
        }
        // Instrumentation key is required
        if (!this.instrumentationKey) {
            const message = "No instrumentation key or connection string was provided to the Azure Monitor Exporter";
            api_1.diag.error(message);
            throw new Error(message);
        }
        if (!connectionStringParser_js_1.ConnectionStringParser.validateInstrumentationKey(this.instrumentationKey)) {
            const message = "Invalid instrumentation key was provided to the Azure Monitor Exporter";
            api_1.diag.error(message);
            throw new Error(message);
        }
        this.trackStatsbeat = !this.isStatsbeatExporter && !process.env[Constants_js_1.LEGACY_ENV_DISABLE_STATSBEAT];
        api_1.diag.debug("AzureMonitorExporter was successfully setup");
    }
}
exports.AzureMonitorBaseExporter = AzureMonitorBaseExporter;
//# sourceMappingURL=base.js.map