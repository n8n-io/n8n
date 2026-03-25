// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { diag } from "@opentelemetry/api";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import * as ai from "../../utils/constants/applicationinsights.js";
import { StatsbeatMetrics } from "./statsbeatMetrics.js";
import { StatsbeatCounter, STATSBEAT_LANGUAGE, NetworkStatsbeat } from "./types.js";
import { AzureMonitorStatsbeatExporter } from "./statsbeatExporter.js";
import { ENV_DISABLE_STATSBEAT } from "../../Declarations/Constants.js";
import { getAttachType } from "../../utils/metricUtils.js";
export class NetworkStatsbeatMetrics extends StatsbeatMetrics {
    constructor(options) {
        super();
        this.disableNonEssentialStatsbeat = !!process.env[ENV_DISABLE_STATSBEAT];
        this.isInitialized = false;
        this.statsCollectionShortInterval = 900000; // 15 minutes
        this.networkStatsbeatCollection = [];
        this.attach = getAttachType();
        this.connectionString = super.getConnectionString(options.endpointUrl);
        const exporterConfig = {
            connectionString: this.connectionString,
        };
        this.networkAzureExporter = new AzureMonitorStatsbeatExporter(exporterConfig);
        // Exports Network Statsbeat every 15 minutes
        const networkMetricReaderOptions = {
            exporter: this.networkAzureExporter,
            exportIntervalMillis: options.networkCollectionInterval || this.statsCollectionShortInterval, // 15 minutes
        };
        this.networkStatsbeatMeterProvider = new MeterProvider({
            readers: [new PeriodicExportingMetricReader(networkMetricReaderOptions)],
        });
        this.networkStatsbeatMeter = this.networkStatsbeatMeterProvider.getMeter("Azure Monitor Network Statsbeat");
        this.endpointUrl = options.endpointUrl;
        this.runtimeVersion = process.version;
        this.language = STATSBEAT_LANGUAGE;
        this.version = ai.packageVersion;
        this.host = this.getShortHost(options.endpointUrl);
        this.cikey = options.instrumentationKey;
        this.successCountGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.SUCCESS_COUNT);
        this.failureCountGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.FAILURE_COUNT);
        this.retryCountGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.RETRY_COUNT);
        this.throttleCountGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.THROTTLE_COUNT);
        this.exceptionCountGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.EXCEPTION_COUNT);
        this.averageDurationGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.AVERAGE_DURATION);
        if (!this.disableNonEssentialStatsbeat) {
            this.readFailureGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.READ_FAILURE_COUNT);
            this.writeFailureGauge = this.networkStatsbeatMeter.createObservableGauge(StatsbeatCounter.WRITE_FAILURE_COUNT);
        }
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
        this.networkProperties = {
            endpoint: this.endpointUrl,
            host: this.host,
        };
    }
    shutdown() {
        return this.networkStatsbeatMeterProvider.shutdown();
    }
    async initialize() {
        var _a, _b;
        try {
            await super.getResourceProvider();
            // Add network observable callbacks
            this.successCountGauge.addCallback(this.successCallback.bind(this));
            this.networkStatsbeatMeter.addBatchObservableCallback(this.failureCallback.bind(this), [
                this.failureCountGauge,
            ]);
            this.networkStatsbeatMeter.addBatchObservableCallback(this.retryCallback.bind(this), [
                this.retryCountGauge,
            ]);
            this.networkStatsbeatMeter.addBatchObservableCallback(this.throttleCallback.bind(this), [
                this.throttleCountGauge,
            ]);
            this.networkStatsbeatMeter.addBatchObservableCallback(this.exceptionCallback.bind(this), [
                this.exceptionCountGauge,
            ]);
            if (!this.disableNonEssentialStatsbeat) {
                (_a = this.readFailureGauge) === null || _a === void 0 ? void 0 : _a.addCallback(this.readFailureCallback.bind(this));
                (_b = this.writeFailureGauge) === null || _b === void 0 ? void 0 : _b.addCallback(this.writeFailureCallback.bind(this));
            }
            this.averageDurationGauge.addCallback(this.durationCallback.bind(this));
        }
        catch (error) {
            diag.debug("Call to get the resource provider failed.");
        }
    }
    // Observable gauge callbacks
    successCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        // Only send metrics if count is greater than zero
        if (counter.totalSuccessfulRequestCount > 0) {
            const attributes = Object.assign(Object.assign({}, this.commonProperties), this.networkProperties);
            observableResult.observe(counter.totalSuccessfulRequestCount, attributes);
            counter.totalSuccessfulRequestCount = 0;
        }
    }
    failureCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        /*
          Takes the failureCountGauge, value (of the counter), and attributes
          create a unqiue counter based on statusCode as well
          append statusCode to attributes so the newly created attributes are unique.
        */
        const attributes = Object.assign(Object.assign(Object.assign({}, this.networkProperties), this.commonProperties), { statusCode: 0 });
        // For each { statusCode -> count } mapping, call observe, passing the count and attributes that include the statusCode
        for (let i = 0; i < counter.totalFailedRequestCount.length; i++) {
            // Only send metrics if count is greater than zero
            if (counter.totalFailedRequestCount[i].count > 0) {
                attributes.statusCode = counter.totalFailedRequestCount[i].statusCode;
                observableResult.observe(this.failureCountGauge, counter.totalFailedRequestCount[i].count, Object.assign({}, attributes));
                counter.totalFailedRequestCount[i].count = 0;
            }
        }
    }
    retryCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const attributes = Object.assign(Object.assign(Object.assign({}, this.networkProperties), this.commonProperties), { statusCode: 0 });
        for (let i = 0; i < counter.retryCount.length; i++) {
            // Only send metrics if count is greater than zero
            if (counter.retryCount[i].count > 0) {
                attributes.statusCode = counter.retryCount[i].statusCode;
                observableResult.observe(this.retryCountGauge, counter.retryCount[i].count, Object.assign({}, attributes));
                counter.retryCount[i].count = 0;
            }
        }
    }
    throttleCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const attributes = Object.assign(Object.assign(Object.assign({}, this.networkProperties), this.commonProperties), { statusCode: 0 });
        for (let i = 0; i < counter.throttleCount.length; i++) {
            // Only send metrics if count is greater than zero
            if (counter.throttleCount[i].count > 0) {
                attributes.statusCode = counter.throttleCount[i].statusCode;
                observableResult.observe(this.throttleCountGauge, counter.throttleCount[i].count, Object.assign({}, attributes));
                counter.throttleCount[i].count = 0;
            }
        }
    }
    exceptionCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const attributes = Object.assign(Object.assign(Object.assign({}, this.networkProperties), this.commonProperties), { exceptionType: "" });
        for (let i = 0; i < counter.exceptionCount.length; i++) {
            // Only send metrics if count is greater than zero
            if (counter.exceptionCount[i].count > 0) {
                attributes.exceptionType = counter.exceptionCount[i].exceptionType;
                observableResult.observe(this.exceptionCountGauge, counter.exceptionCount[i].count, Object.assign({}, attributes));
                counter.exceptionCount[i].count = 0;
            }
        }
    }
    durationCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const attributes = Object.assign(Object.assign({}, this.networkProperties), this.commonProperties);
        for (let i = 0; i < this.networkStatsbeatCollection.length; i++) {
            const currentCounter = this.networkStatsbeatCollection[i];
            currentCounter.time = Number(new Date());
            const intervalRequests = currentCounter.totalRequestCount - currentCounter.lastRequestCount || 0;
            // Only calculate average if there were actual requests
            if (intervalRequests > 0) {
                currentCounter.averageRequestExecutionTime =
                    (currentCounter.intervalRequestExecutionTime -
                        currentCounter.lastIntervalRequestExecutionTime) /
                        intervalRequests || 0;
            }
            else {
                currentCounter.averageRequestExecutionTime = 0;
            }
            currentCounter.lastIntervalRequestExecutionTime = currentCounter.intervalRequestExecutionTime; // reset
            currentCounter.lastRequestCount = currentCounter.totalRequestCount;
            currentCounter.lastTime = currentCounter.time;
        }
        // Only report if there's a non-zero average duration
        if (counter.averageRequestExecutionTime > 0) {
            observableResult.observe(counter.averageRequestExecutionTime, attributes);
            counter.averageRequestExecutionTime = 0;
        }
    }
    readFailureCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        // Only send metrics if count is greater than zero
        if (counter.totalReadFailureCount > 0) {
            const attributes = Object.assign(Object.assign({}, this.commonProperties), this.networkProperties);
            observableResult.observe(counter.totalReadFailureCount, attributes);
            counter.totalReadFailureCount = 0;
        }
    }
    writeFailureCallback(observableResult) {
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        // Only send metrics if count is greater than zero
        if (counter.totalWriteFailureCount > 0) {
            const attributes = Object.assign(Object.assign({}, this.commonProperties), this.networkProperties);
            observableResult.observe(counter.totalWriteFailureCount, attributes);
            counter.totalWriteFailureCount = 0;
        }
    }
    // Public methods to increase counters
    countSuccess(duration) {
        if (!this.isInitialized) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        counter.totalRequestCount++;
        counter.totalSuccessfulRequestCount++;
        counter.intervalRequestExecutionTime += duration;
    }
    countFailure(duration, statusCode) {
        if (!this.isInitialized) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const currentStatusCounter = counter.totalFailedRequestCount.find((statusCounter) => statusCode === statusCounter.statusCode);
        if (currentStatusCounter) {
            currentStatusCounter.count++;
        }
        else {
            counter.totalFailedRequestCount.push({ statusCode: statusCode, count: 1 });
        }
        counter.totalRequestCount++;
        counter.intervalRequestExecutionTime += duration;
    }
    countRetry(statusCode) {
        if (!this.isInitialized) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const currentStatusCounter = counter.retryCount.find((statusCounter) => statusCode === statusCounter.statusCode);
        if (currentStatusCounter) {
            currentStatusCounter.count++;
        }
        else {
            counter.retryCount.push({ statusCode: statusCode, count: 1 });
        }
    }
    countThrottle(statusCode) {
        if (!this.isInitialized) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const currentStatusCounter = counter.throttleCount.find((statusCounter) => statusCode === statusCounter.statusCode);
        if (currentStatusCounter) {
            currentStatusCounter.count++;
        }
        else {
            counter.throttleCount.push({ statusCode: statusCode, count: 1 });
        }
    }
    countReadFailure() {
        if (!this.isInitialized || this.disableNonEssentialStatsbeat) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        counter.totalReadFailureCount++;
    }
    countWriteFailure() {
        if (!this.isInitialized || this.disableNonEssentialStatsbeat) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        counter.totalWriteFailureCount++;
    }
    countException(exceptionType) {
        if (!this.isInitialized) {
            return;
        }
        const counter = this.getNetworkStatsbeatCounter(this.endpointUrl, this.host);
        const currentErrorCounter = counter.exceptionCount.find((exceptionCounter) => exceptionType.name === exceptionCounter.exceptionType);
        if (currentErrorCounter) {
            currentErrorCounter.count++;
        }
        else {
            counter.exceptionCount.push({ exceptionType: exceptionType.name, count: 1 });
        }
    }
    // Gets a networkStatsbeat counter if one exists for the given endpoint
    getNetworkStatsbeatCounter(endpoint, host) {
        // Check if the counter is available
        for (let i = 0; i < this.networkStatsbeatCollection.length; i++) {
            // Same object
            if (endpoint === this.networkStatsbeatCollection[i].endpoint &&
                host === this.networkStatsbeatCollection[i].host) {
                return this.networkStatsbeatCollection[i];
            }
        }
        // Create a new counter if not found
        const newCounter = new NetworkStatsbeat(endpoint, host);
        this.networkStatsbeatCollection.push(newCounter);
        return newCounter;
    }
    getShortHost(originalHost) {
        let shortHost = originalHost;
        try {
            const hostRegex = new RegExp(/^https?:\/\/(?:www\.)?([^/.-]+)/);
            const res = hostRegex.exec(originalHost);
            if (res !== null && res.length > 1) {
                shortHost = res[1];
            }
            shortHost = shortHost.replace(".in.applicationinsights.azure.com", "");
        }
        catch (error) {
            diag.debug("Failed to get the short host name.");
        }
        return shortHost;
    }
    /**
     * Singleton Network Statsbeat Metrics instance.
     * @internal
     */
    static getInstance(options) {
        if (!NetworkStatsbeatMetrics.instance) {
            NetworkStatsbeatMetrics.instance = new NetworkStatsbeatMetrics(options);
        }
        return NetworkStatsbeatMetrics.instance;
    }
}
NetworkStatsbeatMetrics.instance = null;
//# sourceMappingURL=networkStatsbeatMetrics.js.map