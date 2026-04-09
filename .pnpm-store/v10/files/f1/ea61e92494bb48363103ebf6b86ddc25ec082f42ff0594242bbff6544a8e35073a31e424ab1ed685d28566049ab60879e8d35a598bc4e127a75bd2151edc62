"use strict";
/*
 * Copyright 2025 gRPC authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrcaOobMetricsSubchannelWrapper = exports.GRPC_METRICS_HEADER = exports.ServerMetricRecorder = exports.PerRequestMetricRecorder = void 0;
exports.createOrcaClient = createOrcaClient;
exports.createMetricsReader = createMetricsReader;
const make_client_1 = require("./make-client");
const duration_1 = require("./duration");
const channel_credentials_1 = require("./channel-credentials");
const subchannel_interface_1 = require("./subchannel-interface");
const constants_1 = require("./constants");
const backoff_timeout_1 = require("./backoff-timeout");
const connectivity_state_1 = require("./connectivity-state");
const loadedOrcaProto = null;
function loadOrcaProto() {
    if (loadedOrcaProto) {
        return loadedOrcaProto;
    }
    /* The purpose of this complexity is to avoid loading @grpc/proto-loader at
     * runtime for users who will not use/enable ORCA. */
    const loaderLoadSync = require('@grpc/proto-loader')
        .loadSync;
    const loadedProto = loaderLoadSync('xds/service/orca/v3/orca.proto', {
        keepCase: true,
        longs: String,
        enums: String,
        defaults: true,
        oneofs: true,
        includeDirs: [
            `${__dirname}/../../proto/xds`,
            `${__dirname}/../../proto/protoc-gen-validate`
        ],
    });
    return (0, make_client_1.loadPackageDefinition)(loadedProto);
}
/**
 * ORCA metrics recorder for a single request
 */
class PerRequestMetricRecorder {
    constructor() {
        this.message = {};
    }
    /**
     * Records a request cost metric measurement for the call.
     * @param name
     * @param value
     */
    recordRequestCostMetric(name, value) {
        if (!this.message.request_cost) {
            this.message.request_cost = {};
        }
        this.message.request_cost[name] = value;
    }
    /**
     * Records a request cost metric measurement for the call.
     * @param name
     * @param value
     */
    recordUtilizationMetric(name, value) {
        if (!this.message.utilization) {
            this.message.utilization = {};
        }
        this.message.utilization[name] = value;
    }
    /**
     * Records an opaque named metric measurement for the call.
     * @param name
     * @param value
     */
    recordNamedMetric(name, value) {
        if (!this.message.named_metrics) {
            this.message.named_metrics = {};
        }
        this.message.named_metrics[name] = value;
    }
    /**
     * Records the CPU utilization metric measurement for the call.
     * @param value
     */
    recordCPUUtilizationMetric(value) {
        this.message.cpu_utilization = value;
    }
    /**
     * Records the memory utilization metric measurement for the call.
     * @param value
     */
    recordMemoryUtilizationMetric(value) {
        this.message.mem_utilization = value;
    }
    /**
     * Records the memory utilization metric measurement for the call.
     * @param value
     */
    recordApplicationUtilizationMetric(value) {
        this.message.application_utilization = value;
    }
    /**
     * Records the queries per second measurement.
     * @param value
     */
    recordQpsMetric(value) {
        this.message.rps_fractional = value;
    }
    /**
     * Records the errors per second measurement.
     * @param value
     */
    recordEpsMetric(value) {
        this.message.eps = value;
    }
    serialize() {
        const orcaProto = loadOrcaProto();
        return orcaProto.xds.data.orca.v3.OrcaLoadReport.serialize(this.message);
    }
}
exports.PerRequestMetricRecorder = PerRequestMetricRecorder;
const DEFAULT_REPORT_INTERVAL_MS = 30000;
class ServerMetricRecorder {
    constructor() {
        this.message = {};
        this.serviceImplementation = {
            StreamCoreMetrics: call => {
                const reportInterval = call.request.report_interval ?
                    (0, duration_1.durationToMs)((0, duration_1.durationMessageToDuration)(call.request.report_interval)) :
                    DEFAULT_REPORT_INTERVAL_MS;
                const reportTimer = setInterval(() => {
                    call.write(this.message);
                }, reportInterval);
                call.on('cancelled', () => {
                    clearInterval(reportTimer);
                });
            }
        };
    }
    putUtilizationMetric(name, value) {
        if (!this.message.utilization) {
            this.message.utilization = {};
        }
        this.message.utilization[name] = value;
    }
    setAllUtilizationMetrics(metrics) {
        this.message.utilization = Object.assign({}, metrics);
    }
    deleteUtilizationMetric(name) {
        var _a;
        (_a = this.message.utilization) === null || _a === void 0 ? true : delete _a[name];
    }
    setCpuUtilizationMetric(value) {
        this.message.cpu_utilization = value;
    }
    deleteCpuUtilizationMetric() {
        delete this.message.cpu_utilization;
    }
    setApplicationUtilizationMetric(value) {
        this.message.application_utilization = value;
    }
    deleteApplicationUtilizationMetric() {
        delete this.message.application_utilization;
    }
    setQpsMetric(value) {
        this.message.rps_fractional = value;
    }
    deleteQpsMetric() {
        delete this.message.rps_fractional;
    }
    setEpsMetric(value) {
        this.message.eps = value;
    }
    deleteEpsMetric() {
        delete this.message.eps;
    }
    addToServer(server) {
        const serviceDefinition = loadOrcaProto().xds.service.orca.v3.OpenRcaService.service;
        server.addService(serviceDefinition, this.serviceImplementation);
    }
}
exports.ServerMetricRecorder = ServerMetricRecorder;
function createOrcaClient(channel) {
    const ClientClass = loadOrcaProto().xds.service.orca.v3.OpenRcaService;
    return new ClientClass('unused', channel_credentials_1.ChannelCredentials.createInsecure(), { channelOverride: channel });
}
exports.GRPC_METRICS_HEADER = 'endpoint-load-metrics-bin';
const PARSED_LOAD_REPORT_KEY = 'grpc_orca_load_report';
/**
 * Create an onCallEnded callback for use in a picker.
 * @param listener The listener to handle metrics, whenever they are provided.
 * @param previousOnCallEnded The previous onCallEnded callback to propagate
 * to, if applicable.
 * @returns
 */
function createMetricsReader(listener, previousOnCallEnded) {
    return (code, details, metadata) => {
        let parsedLoadReport = metadata.getOpaque(PARSED_LOAD_REPORT_KEY);
        if (parsedLoadReport) {
            listener(parsedLoadReport);
        }
        else {
            const serializedLoadReport = metadata.get(exports.GRPC_METRICS_HEADER);
            if (serializedLoadReport.length > 0) {
                const orcaProto = loadOrcaProto();
                parsedLoadReport = orcaProto.xds.data.orca.v3.OrcaLoadReport.deserialize(serializedLoadReport[0]);
                listener(parsedLoadReport);
                metadata.setOpaque(PARSED_LOAD_REPORT_KEY, parsedLoadReport);
            }
        }
        if (previousOnCallEnded) {
            previousOnCallEnded(code, details, metadata);
        }
    };
}
const DATA_PRODUCER_KEY = 'orca_oob_metrics';
class OobMetricsDataWatcher {
    constructor(metricsListener, intervalMs) {
        this.metricsListener = metricsListener;
        this.intervalMs = intervalMs;
        this.dataProducer = null;
    }
    setSubchannel(subchannel) {
        const producer = subchannel.getOrCreateDataProducer(DATA_PRODUCER_KEY, createOobMetricsDataProducer);
        this.dataProducer = producer;
        producer.addDataWatcher(this);
    }
    destroy() {
        var _a;
        (_a = this.dataProducer) === null || _a === void 0 ? void 0 : _a.removeDataWatcher(this);
    }
    getInterval() {
        return this.intervalMs;
    }
    onMetricsUpdate(metrics) {
        this.metricsListener(metrics);
    }
}
class OobMetricsDataProducer {
    constructor(subchannel) {
        this.subchannel = subchannel;
        this.dataWatchers = new Set();
        this.orcaSupported = true;
        this.metricsCall = null;
        this.currentInterval = Infinity;
        this.backoffTimer = new backoff_timeout_1.BackoffTimeout(() => this.updateMetricsSubscription());
        this.subchannelStateListener = () => this.updateMetricsSubscription();
        const channel = subchannel.getChannel();
        this.client = createOrcaClient(channel);
        subchannel.addConnectivityStateListener(this.subchannelStateListener);
    }
    addDataWatcher(dataWatcher) {
        this.dataWatchers.add(dataWatcher);
        this.updateMetricsSubscription();
    }
    removeDataWatcher(dataWatcher) {
        var _a;
        this.dataWatchers.delete(dataWatcher);
        if (this.dataWatchers.size === 0) {
            this.subchannel.removeDataProducer(DATA_PRODUCER_KEY);
            (_a = this.metricsCall) === null || _a === void 0 ? void 0 : _a.cancel();
            this.metricsCall = null;
            this.client.close();
            this.subchannel.removeConnectivityStateListener(this.subchannelStateListener);
        }
        else {
            this.updateMetricsSubscription();
        }
    }
    updateMetricsSubscription() {
        var _a;
        if (this.dataWatchers.size === 0 || !this.orcaSupported || this.subchannel.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY) {
            return;
        }
        const newInterval = Math.min(...Array.from(this.dataWatchers).map(watcher => watcher.getInterval()));
        if (!this.metricsCall || newInterval !== this.currentInterval) {
            (_a = this.metricsCall) === null || _a === void 0 ? void 0 : _a.cancel();
            this.currentInterval = newInterval;
            const metricsCall = this.client.streamCoreMetrics({ report_interval: (0, duration_1.msToDuration)(newInterval) });
            this.metricsCall = metricsCall;
            metricsCall.on('data', (report) => {
                this.dataWatchers.forEach(watcher => {
                    watcher.onMetricsUpdate(report);
                });
            });
            metricsCall.on('error', (error) => {
                this.metricsCall = null;
                if (error.code === constants_1.Status.UNIMPLEMENTED) {
                    this.orcaSupported = false;
                    return;
                }
                if (error.code === constants_1.Status.CANCELLED) {
                    return;
                }
                this.backoffTimer.runOnce();
            });
        }
    }
}
class OrcaOobMetricsSubchannelWrapper extends subchannel_interface_1.BaseSubchannelWrapper {
    constructor(child, metricsListener, intervalMs) {
        super(child);
        this.addDataWatcher(new OobMetricsDataWatcher(metricsListener, intervalMs));
    }
    getWrappedSubchannel() {
        return this.child;
    }
}
exports.OrcaOobMetricsSubchannelWrapper = OrcaOobMetricsSubchannelWrapper;
function createOobMetricsDataProducer(subchannel) {
    return new OobMetricsDataProducer(subchannel);
}
//# sourceMappingURL=orca.js.map