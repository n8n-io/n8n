// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { diag } from "@opentelemetry/api";
import { ExportResultCode } from "@opentelemetry/core";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import * as ai from "../../utils/constants/applicationinsights.js";
import { StatsbeatMetrics } from "./statsbeatMetrics.js";
import { StatsbeatCounter, STATSBEAT_LANGUAGE, StatsbeatFeatureType } from "./types.js";
import { AzureMonitorStatsbeatExporter } from "./statsbeatExporter.js";
import { getAttachType } from "../../utils/metricUtils.js";
/**
 * Long Interval Statsbeat Metrics
 * @internal
 */
export class LongIntervalStatsbeatMetrics extends StatsbeatMetrics {
    constructor(options) {
        super();
        this.statsCollectionLongInterval = 86400000; // 1 day
        this.attach = getAttachType();
        this.feature = 0;
        this.instrumentation = 0;
        this.isInitialized = false;
        this.connectionString = super.getConnectionString(options.endpointUrl);
        const exporterConfig = {
            connectionString: this.connectionString,
            disableOfflineStorage: options.disableOfflineStorage,
        };
        this.setFeatures();
        this.longIntervalAzureExporter = new AzureMonitorStatsbeatExporter(exporterConfig);
        // Export Long Interval Statsbeats every day
        const longIntervalMetricReaderOptions = {
            exporter: this.longIntervalAzureExporter,
            exportIntervalMillis: Number(process.env.LONG_INTERVAL_EXPORT_MILLIS) || this.statsCollectionLongInterval, // 1 day
        };
        this.longIntervalMetricReader = new PeriodicExportingMetricReader(longIntervalMetricReaderOptions);
        this.longIntervalStatsbeatMeterProvider = new MeterProvider({
            readers: [this.longIntervalMetricReader],
        });
        this.longIntervalStatsbeatMeter = this.longIntervalStatsbeatMeterProvider.getMeter("Azure Monitor Long Interval Statsbeat");
        // Assign Common Properties
        this.runtimeVersion = process.version;
        this.language = STATSBEAT_LANGUAGE;
        this.version = ai.packageVersion;
        this.cikey = options.instrumentationKey;
        this.featureStatsbeatGauge = this.longIntervalStatsbeatMeter.createObservableGauge(StatsbeatCounter.FEATURE);
        this.attachStatsbeatGauge = this.longIntervalStatsbeatMeter.createObservableGauge(StatsbeatCounter.ATTACH);
        this.isInitialized = true;
        this.initialize();
        this.commonProperties = {
            os: this.os,
            rp: this.resourceProvider,
            cikey: this.cikey,
            runtimeVersion: this.runtimeVersion,
            language: this.language,
            version: this.version,
            attach: this.attach,
        };
        this.attachProperties = {
            rpId: this.resourceIdentifier,
        };
    }
    async initialize() {
        try {
            await this.getResourceProvider();
            // Add long interval observable callbacks
            this.attachStatsbeatGauge.addCallback(this.attachCallback.bind(this));
            this.longIntervalStatsbeatMeter.addBatchObservableCallback(this.getEnvironmentStatus.bind(this), [this.featureStatsbeatGauge]);
            // Export Feature/Attach Statsbeat once upon app initialization after 15 second delay
            setTimeout(async () => {
                try {
                    const collectionResult = await this.longIntervalMetricReader.collect();
                    if (collectionResult) {
                        this.longIntervalAzureExporter.export(collectionResult.resourceMetrics, (result) => {
                            if (result.code !== ExportResultCode.SUCCESS) {
                                diag.debug(`LongIntervalStatsbeat: metrics export failed (error ${result.error})`);
                            }
                        });
                    }
                    else {
                        diag.debug("LongIntervalStatsbeat: No metrics collected");
                    }
                }
                catch (error) {
                    diag.debug(`LongIntervalStatsbeat: Error collecting metrics: ${error}`);
                }
            }, 15000); // 15 seconds
        }
        catch (error) {
            diag.debug("Call to get the resource provider failed.");
        }
    }
    getEnvironmentStatus(observableResult) {
        this.setFeatures();
        let attributes;
        // Only send instrumentation statsbeat if value is greater than zero
        if (this.instrumentation > 0) {
            attributes = Object.assign(Object.assign({}, this.commonProperties), { feature: this.instrumentation, type: StatsbeatFeatureType.INSTRUMENTATION });
            observableResult.observe(this.featureStatsbeatGauge, 1, Object.assign({}, attributes));
        }
        // Only send feature statsbeat if value is greater than zero
        if (this.feature > 0) {
            attributes = Object.assign(Object.assign({}, this.commonProperties), { feature: this.feature, type: StatsbeatFeatureType.FEATURE });
            observableResult.observe(this.featureStatsbeatGauge, 1, Object.assign({}, attributes));
        }
    }
    setFeatures() {
        const statsbeatFeatures = process.env.AZURE_MONITOR_STATSBEAT_FEATURES;
        if (statsbeatFeatures) {
            try {
                this.feature = JSON.parse(statsbeatFeatures).feature;
                this.instrumentation = JSON.parse(statsbeatFeatures).instrumentation;
            }
            catch (error) {
                diag.debug(`LongIntervalStatsbeat: Failed to parse features/instrumentations (error ${error})`);
            }
        }
    }
    attachCallback(observableResult) {
        const attributes = Object.assign(Object.assign({}, this.commonProperties), this.attachProperties);
        observableResult.observe(1, attributes);
    }
    shutdown() {
        return this.longIntervalStatsbeatMeterProvider.shutdown();
    }
    /**
     * Singleton LongIntervalStatsbeatMetrics instance.
     * @internal
     */
    static getInstance(options) {
        if (!LongIntervalStatsbeatMetrics.instance) {
            LongIntervalStatsbeatMetrics.instance = new LongIntervalStatsbeatMetrics(options);
        }
        return LongIntervalStatsbeatMetrics.instance;
    }
}
LongIntervalStatsbeatMetrics.instance = null;
//# sourceMappingURL=longIntervalStatsbeatMetrics.js.map