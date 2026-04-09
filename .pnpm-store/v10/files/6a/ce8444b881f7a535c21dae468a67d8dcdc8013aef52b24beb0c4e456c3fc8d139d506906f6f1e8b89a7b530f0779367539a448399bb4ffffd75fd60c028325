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
exports.WeightedRoundRobinLoadBalancingConfig = void 0;
exports.setup = setup;
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const duration_1 = require("./duration");
const load_balancer_1 = require("./load-balancer");
const load_balancer_pick_first_1 = require("./load-balancer-pick-first");
const logging = require("./logging");
const orca_1 = require("./orca");
const picker_1 = require("./picker");
const priority_queue_1 = require("./priority-queue");
const subchannel_address_1 = require("./subchannel-address");
const TRACER_NAME = 'weighted_round_robin';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const TYPE_NAME = 'weighted_round_robin';
const DEFAULT_OOB_REPORTING_PERIOD_MS = 10000;
const DEFAULT_BLACKOUT_PERIOD_MS = 10000;
const DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS = 3 * 60000;
const DEFAULT_WEIGHT_UPDATE_PERIOD_MS = 1000;
const DEFAULT_ERROR_UTILIZATION_PENALTY = 1;
function validateFieldType(obj, fieldName, expectedType) {
    if (fieldName in obj &&
        obj[fieldName] !== undefined &&
        typeof obj[fieldName] !== expectedType) {
        throw new Error(`weighted round robin config ${fieldName} parse error: expected ${expectedType}, got ${typeof obj[fieldName]}`);
    }
}
function parseDurationField(obj, fieldName) {
    if (fieldName in obj && obj[fieldName] !== undefined && obj[fieldName] !== null) {
        let durationObject;
        if ((0, duration_1.isDuration)(obj[fieldName])) {
            durationObject = obj[fieldName];
        }
        else if ((0, duration_1.isDurationMessage)(obj[fieldName])) {
            durationObject = (0, duration_1.durationMessageToDuration)(obj[fieldName]);
        }
        else if (typeof obj[fieldName] === 'string') {
            const parsedDuration = (0, duration_1.parseDuration)(obj[fieldName]);
            if (!parsedDuration) {
                throw new Error(`weighted round robin config ${fieldName}: failed to parse duration string ${obj[fieldName]}`);
            }
            durationObject = parsedDuration;
        }
        else {
            throw new Error(`weighted round robin config ${fieldName}: expected duration, got ${typeof obj[fieldName]}`);
        }
        return (0, duration_1.durationToMs)(durationObject);
    }
    return null;
}
class WeightedRoundRobinLoadBalancingConfig {
    constructor(enableOobLoadReport, oobLoadReportingPeriodMs, blackoutPeriodMs, weightExpirationPeriodMs, weightUpdatePeriodMs, errorUtilizationPenalty) {
        this.enableOobLoadReport = enableOobLoadReport !== null && enableOobLoadReport !== void 0 ? enableOobLoadReport : false;
        this.oobLoadReportingPeriodMs = oobLoadReportingPeriodMs !== null && oobLoadReportingPeriodMs !== void 0 ? oobLoadReportingPeriodMs : DEFAULT_OOB_REPORTING_PERIOD_MS;
        this.blackoutPeriodMs = blackoutPeriodMs !== null && blackoutPeriodMs !== void 0 ? blackoutPeriodMs : DEFAULT_BLACKOUT_PERIOD_MS;
        this.weightExpirationPeriodMs = weightExpirationPeriodMs !== null && weightExpirationPeriodMs !== void 0 ? weightExpirationPeriodMs : DEFAULT_WEIGHT_EXPIRATION_PERIOD_MS;
        this.weightUpdatePeriodMs = Math.max(weightUpdatePeriodMs !== null && weightUpdatePeriodMs !== void 0 ? weightUpdatePeriodMs : DEFAULT_WEIGHT_UPDATE_PERIOD_MS, 100);
        this.errorUtilizationPenalty = errorUtilizationPenalty !== null && errorUtilizationPenalty !== void 0 ? errorUtilizationPenalty : DEFAULT_ERROR_UTILIZATION_PENALTY;
    }
    getLoadBalancerName() {
        return TYPE_NAME;
    }
    toJsonObject() {
        return {
            enable_oob_load_report: this.enableOobLoadReport,
            oob_load_reporting_period: (0, duration_1.durationToString)((0, duration_1.msToDuration)(this.oobLoadReportingPeriodMs)),
            blackout_period: (0, duration_1.durationToString)((0, duration_1.msToDuration)(this.blackoutPeriodMs)),
            weight_expiration_period: (0, duration_1.durationToString)((0, duration_1.msToDuration)(this.weightExpirationPeriodMs)),
            weight_update_period: (0, duration_1.durationToString)((0, duration_1.msToDuration)(this.weightUpdatePeriodMs)),
            error_utilization_penalty: this.errorUtilizationPenalty
        };
    }
    static createFromJson(obj) {
        validateFieldType(obj, 'enable_oob_load_report', 'boolean');
        validateFieldType(obj, 'error_utilization_penalty', 'number');
        if (obj.error_utilization_penalty < 0) {
            throw new Error('weighted round robin config error_utilization_penalty < 0');
        }
        return new WeightedRoundRobinLoadBalancingConfig(obj.enable_oob_load_report, parseDurationField(obj, 'oob_load_reporting_period'), parseDurationField(obj, 'blackout_period'), parseDurationField(obj, 'weight_expiration_period'), parseDurationField(obj, 'weight_update_period'), obj.error_utilization_penalty);
    }
    getEnableOobLoadReport() {
        return this.enableOobLoadReport;
    }
    getOobLoadReportingPeriodMs() {
        return this.oobLoadReportingPeriodMs;
    }
    getBlackoutPeriodMs() {
        return this.blackoutPeriodMs;
    }
    getWeightExpirationPeriodMs() {
        return this.weightExpirationPeriodMs;
    }
    getWeightUpdatePeriodMs() {
        return this.weightUpdatePeriodMs;
    }
    getErrorUtilizationPenalty() {
        return this.errorUtilizationPenalty;
    }
}
exports.WeightedRoundRobinLoadBalancingConfig = WeightedRoundRobinLoadBalancingConfig;
class WeightedRoundRobinPicker {
    constructor(children, metricsHandler) {
        this.metricsHandler = metricsHandler;
        this.queue = new priority_queue_1.PriorityQueue((a, b) => a.deadline < b.deadline);
        const positiveWeight = children.filter(picker => picker.weight > 0);
        let averageWeight;
        if (positiveWeight.length < 2) {
            averageWeight = 1;
        }
        else {
            let weightSum = 0;
            for (const { weight } of positiveWeight) {
                weightSum += weight;
            }
            averageWeight = weightSum / positiveWeight.length;
        }
        for (const child of children) {
            const period = child.weight > 0 ? 1 / child.weight : averageWeight;
            this.queue.push({
                endpointName: child.endpointName,
                picker: child.picker,
                period: period,
                deadline: Math.random() * period
            });
        }
    }
    pick(pickArgs) {
        const entry = this.queue.pop();
        this.queue.push(Object.assign(Object.assign({}, entry), { deadline: entry.deadline + entry.period }));
        const childPick = entry.picker.pick(pickArgs);
        if (childPick.pickResultType === picker_1.PickResultType.COMPLETE) {
            if (this.metricsHandler) {
                return Object.assign(Object.assign({}, childPick), { onCallEnded: (0, orca_1.createMetricsReader)(loadReport => this.metricsHandler(loadReport, entry.endpointName), childPick.onCallEnded) });
            }
            else {
                const subchannelWrapper = childPick.subchannel;
                return Object.assign(Object.assign({}, childPick), { subchannel: subchannelWrapper.getWrappedSubchannel() });
            }
        }
        else {
            return childPick;
        }
    }
}
class WeightedRoundRobinLoadBalancer {
    constructor(channelControlHelper) {
        this.channelControlHelper = channelControlHelper;
        this.latestConfig = null;
        this.children = new Map();
        this.currentState = connectivity_state_1.ConnectivityState.IDLE;
        this.updatesPaused = false;
        this.lastError = null;
        this.weightUpdateTimer = null;
    }
    countChildrenWithState(state) {
        let count = 0;
        for (const entry of this.children.values()) {
            if (entry.child.getConnectivityState() === state) {
                count += 1;
            }
        }
        return count;
    }
    updateWeight(entry, loadReport) {
        var _a, _b;
        const qps = loadReport.rps_fractional;
        let utilization = loadReport.application_utilization;
        if (utilization > 0 && qps > 0) {
            utilization += (loadReport.eps / qps) * ((_b = (_a = this.latestConfig) === null || _a === void 0 ? void 0 : _a.getErrorUtilizationPenalty()) !== null && _b !== void 0 ? _b : 0);
        }
        const newWeight = utilization === 0 ? 0 : qps / utilization;
        if (newWeight === 0) {
            return;
        }
        const now = new Date();
        if (entry.nonEmptySince === null) {
            entry.nonEmptySince = now;
        }
        entry.lastUpdated = now;
        entry.weight = newWeight;
    }
    getWeight(entry) {
        if (!this.latestConfig) {
            return 0;
        }
        const now = new Date().getTime();
        if (now - entry.lastUpdated.getTime() >= this.latestConfig.getWeightExpirationPeriodMs()) {
            entry.nonEmptySince = null;
            return 0;
        }
        const blackoutPeriod = this.latestConfig.getBlackoutPeriodMs();
        if (blackoutPeriod > 0 && (entry.nonEmptySince === null || now - entry.nonEmptySince.getTime() < blackoutPeriod)) {
            return 0;
        }
        return entry.weight;
    }
    calculateAndUpdateState() {
        if (this.updatesPaused || !this.latestConfig) {
            return;
        }
        if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.READY) > 0) {
            const weightedPickers = [];
            for (const [endpoint, entry] of this.children) {
                if (entry.child.getConnectivityState() !== connectivity_state_1.ConnectivityState.READY) {
                    continue;
                }
                weightedPickers.push({
                    endpointName: endpoint,
                    picker: entry.child.getPicker(),
                    weight: this.getWeight(entry)
                });
            }
            trace('Created picker with weights: ' + weightedPickers.map(entry => entry.endpointName + ':' + entry.weight).join(','));
            let metricsHandler;
            if (!this.latestConfig.getEnableOobLoadReport()) {
                metricsHandler = (loadReport, endpointName) => {
                    const childEntry = this.children.get(endpointName);
                    if (childEntry) {
                        this.updateWeight(childEntry, loadReport);
                    }
                };
            }
            else {
                metricsHandler = null;
            }
            this.updateState(connectivity_state_1.ConnectivityState.READY, new WeightedRoundRobinPicker(weightedPickers, metricsHandler), null);
        }
        else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.CONNECTING) > 0) {
            this.updateState(connectivity_state_1.ConnectivityState.CONNECTING, new picker_1.QueuePicker(this), null);
        }
        else if (this.countChildrenWithState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) > 0) {
            const errorMessage = `weighted_round_robin: No connection established. Last error: ${this.lastError}`;
            this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({
                details: errorMessage,
            }), errorMessage);
        }
        else {
            this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
        }
        /* round_robin should keep all children connected, this is how we do that.
          * We can't do this more efficiently in the individual child's updateState
          * callback because that doesn't have a reference to which child the state
          * change is associated with. */
        for (const { child } of this.children.values()) {
            if (child.getConnectivityState() === connectivity_state_1.ConnectivityState.IDLE) {
                child.exitIdle();
            }
        }
    }
    updateState(newState, picker, errorMessage) {
        trace(connectivity_state_1.ConnectivityState[this.currentState] +
            ' -> ' +
            connectivity_state_1.ConnectivityState[newState]);
        this.currentState = newState;
        this.channelControlHelper.updateState(newState, picker, errorMessage);
    }
    updateAddressList(maybeEndpointList, lbConfig, options, resolutionNote) {
        var _a, _b;
        if (!(lbConfig instanceof WeightedRoundRobinLoadBalancingConfig)) {
            return false;
        }
        if (!maybeEndpointList.ok) {
            if (this.children.size === 0) {
                this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker(maybeEndpointList.error), maybeEndpointList.error.details);
            }
            return true;
        }
        if (maybeEndpointList.value.length === 0) {
            const errorMessage = `No addresses resolved. Resolution note: ${resolutionNote}`;
            this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker({ details: errorMessage }), errorMessage);
            return false;
        }
        trace('Connect to endpoint list ' + maybeEndpointList.value.map(subchannel_address_1.endpointToString));
        const now = new Date();
        const seenEndpointNames = new Set();
        this.updatesPaused = true;
        this.latestConfig = lbConfig;
        for (const endpoint of maybeEndpointList.value) {
            const name = (0, subchannel_address_1.endpointToString)(endpoint);
            seenEndpointNames.add(name);
            let entry = this.children.get(name);
            if (!entry) {
                entry = {
                    child: new load_balancer_pick_first_1.LeafLoadBalancer(endpoint, (0, load_balancer_1.createChildChannelControlHelper)(this.channelControlHelper, {
                        updateState: (connectivityState, picker, errorMessage) => {
                            /* Ensure that name resolution is requested again after active
                              * connections are dropped. This is more aggressive than necessary to
                              * accomplish that, so we are counting on resolvers to have
                              * reasonable rate limits. */
                            if (this.currentState === connectivity_state_1.ConnectivityState.READY && connectivityState !== connectivity_state_1.ConnectivityState.READY) {
                                this.channelControlHelper.requestReresolution();
                            }
                            if (connectivityState === connectivity_state_1.ConnectivityState.READY) {
                                entry.nonEmptySince = null;
                            }
                            if (errorMessage) {
                                this.lastError = errorMessage;
                            }
                            this.calculateAndUpdateState();
                        },
                        createSubchannel: (subchannelAddress, subchannelArgs) => {
                            const subchannel = this.channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
                            if (entry === null || entry === void 0 ? void 0 : entry.oobMetricsListener) {
                                return new orca_1.OrcaOobMetricsSubchannelWrapper(subchannel, entry.oobMetricsListener, this.latestConfig.getOobLoadReportingPeriodMs());
                            }
                            else {
                                return subchannel;
                            }
                        }
                    }), options, resolutionNote),
                    lastUpdated: now,
                    nonEmptySince: null,
                    weight: 0,
                    oobMetricsListener: null
                };
                this.children.set(name, entry);
            }
            if (lbConfig.getEnableOobLoadReport()) {
                entry.oobMetricsListener = loadReport => {
                    this.updateWeight(entry, loadReport);
                };
            }
            else {
                entry.oobMetricsListener = null;
            }
        }
        for (const [endpointName, entry] of this.children) {
            if (seenEndpointNames.has(endpointName)) {
                entry.child.startConnecting();
            }
            else {
                entry.child.destroy();
                this.children.delete(endpointName);
            }
        }
        this.updatesPaused = false;
        this.calculateAndUpdateState();
        if (this.weightUpdateTimer) {
            clearInterval(this.weightUpdateTimer);
        }
        this.weightUpdateTimer = (_b = (_a = setInterval(() => {
            if (this.currentState === connectivity_state_1.ConnectivityState.READY) {
                this.calculateAndUpdateState();
            }
        }, lbConfig.getWeightUpdatePeriodMs())).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
        return true;
    }
    exitIdle() {
        /* The weighted_round_robin LB policy is only in the IDLE state if it has
         * no addresses to try to connect to and it has no picked subchannel.
         * In that case, there is no meaningful action that can be taken here. */
    }
    resetBackoff() {
        // This LB policy has no backoff to reset
    }
    destroy() {
        for (const entry of this.children.values()) {
            entry.child.destroy();
        }
        this.children.clear();
        if (this.weightUpdateTimer) {
            clearInterval(this.weightUpdateTimer);
        }
    }
    getTypeName() {
        return TYPE_NAME;
    }
}
function setup() {
    (0, load_balancer_1.registerLoadBalancerType)(TYPE_NAME, WeightedRoundRobinLoadBalancer, WeightedRoundRobinLoadBalancingConfig);
}
//# sourceMappingURL=load-balancer-weighted-round-robin.js.map