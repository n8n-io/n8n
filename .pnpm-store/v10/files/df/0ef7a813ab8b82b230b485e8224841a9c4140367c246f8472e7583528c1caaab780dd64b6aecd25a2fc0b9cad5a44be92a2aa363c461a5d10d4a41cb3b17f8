"use strict";
/*
 * Copyright 2022 gRPC authors.
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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutlierDetectionLoadBalancer = exports.OutlierDetectionLoadBalancingConfig = void 0;
exports.setup = setup;
const connectivity_state_1 = require("./connectivity-state");
const constants_1 = require("./constants");
const duration_1 = require("./duration");
const experimental_1 = require("./experimental");
const load_balancer_1 = require("./load-balancer");
const load_balancer_child_handler_1 = require("./load-balancer-child-handler");
const picker_1 = require("./picker");
const subchannel_address_1 = require("./subchannel-address");
const subchannel_interface_1 = require("./subchannel-interface");
const logging = require("./logging");
const TRACER_NAME = 'outlier_detection';
function trace(text) {
    logging.trace(constants_1.LogVerbosity.DEBUG, TRACER_NAME, text);
}
const TYPE_NAME = 'outlier_detection';
const OUTLIER_DETECTION_ENABLED = ((_a = process.env.GRPC_EXPERIMENTAL_ENABLE_OUTLIER_DETECTION) !== null && _a !== void 0 ? _a : 'true') === 'true';
const defaultSuccessRateEjectionConfig = {
    stdev_factor: 1900,
    enforcement_percentage: 100,
    minimum_hosts: 5,
    request_volume: 100,
};
const defaultFailurePercentageEjectionConfig = {
    threshold: 85,
    enforcement_percentage: 100,
    minimum_hosts: 5,
    request_volume: 50,
};
function validateFieldType(obj, fieldName, expectedType, objectName) {
    if (fieldName in obj &&
        obj[fieldName] !== undefined &&
        typeof obj[fieldName] !== expectedType) {
        const fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
        throw new Error(`outlier detection config ${fullFieldName} parse error: expected ${expectedType}, got ${typeof obj[fieldName]}`);
    }
}
function validatePositiveDuration(obj, fieldName, objectName) {
    const fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
    if (fieldName in obj && obj[fieldName] !== undefined) {
        if (!(0, duration_1.isDuration)(obj[fieldName])) {
            throw new Error(`outlier detection config ${fullFieldName} parse error: expected Duration, got ${typeof obj[fieldName]}`);
        }
        if (!(obj[fieldName].seconds >= 0 &&
            obj[fieldName].seconds <= 315576000000 &&
            obj[fieldName].nanos >= 0 &&
            obj[fieldName].nanos <= 999999999)) {
            throw new Error(`outlier detection config ${fullFieldName} parse error: values out of range for non-negative Duaration`);
        }
    }
}
function validatePercentage(obj, fieldName, objectName) {
    const fullFieldName = objectName ? `${objectName}.${fieldName}` : fieldName;
    validateFieldType(obj, fieldName, 'number', objectName);
    if (fieldName in obj &&
        obj[fieldName] !== undefined &&
        !(obj[fieldName] >= 0 && obj[fieldName] <= 100)) {
        throw new Error(`outlier detection config ${fullFieldName} parse error: value out of range for percentage (0-100)`);
    }
}
class OutlierDetectionLoadBalancingConfig {
    constructor(intervalMs, baseEjectionTimeMs, maxEjectionTimeMs, maxEjectionPercent, successRateEjection, failurePercentageEjection, childPolicy) {
        this.childPolicy = childPolicy;
        if (childPolicy.getLoadBalancerName() === 'pick_first') {
            throw new Error('outlier_detection LB policy cannot have a pick_first child policy');
        }
        this.intervalMs = intervalMs !== null && intervalMs !== void 0 ? intervalMs : 10000;
        this.baseEjectionTimeMs = baseEjectionTimeMs !== null && baseEjectionTimeMs !== void 0 ? baseEjectionTimeMs : 30000;
        this.maxEjectionTimeMs = maxEjectionTimeMs !== null && maxEjectionTimeMs !== void 0 ? maxEjectionTimeMs : 300000;
        this.maxEjectionPercent = maxEjectionPercent !== null && maxEjectionPercent !== void 0 ? maxEjectionPercent : 10;
        this.successRateEjection = successRateEjection
            ? Object.assign(Object.assign({}, defaultSuccessRateEjectionConfig), successRateEjection) : null;
        this.failurePercentageEjection = failurePercentageEjection
            ? Object.assign(Object.assign({}, defaultFailurePercentageEjectionConfig), failurePercentageEjection) : null;
    }
    getLoadBalancerName() {
        return TYPE_NAME;
    }
    toJsonObject() {
        var _a, _b;
        return {
            outlier_detection: {
                interval: (0, duration_1.msToDuration)(this.intervalMs),
                base_ejection_time: (0, duration_1.msToDuration)(this.baseEjectionTimeMs),
                max_ejection_time: (0, duration_1.msToDuration)(this.maxEjectionTimeMs),
                max_ejection_percent: this.maxEjectionPercent,
                success_rate_ejection: (_a = this.successRateEjection) !== null && _a !== void 0 ? _a : undefined,
                failure_percentage_ejection: (_b = this.failurePercentageEjection) !== null && _b !== void 0 ? _b : undefined,
                child_policy: [this.childPolicy.toJsonObject()],
            },
        };
    }
    getIntervalMs() {
        return this.intervalMs;
    }
    getBaseEjectionTimeMs() {
        return this.baseEjectionTimeMs;
    }
    getMaxEjectionTimeMs() {
        return this.maxEjectionTimeMs;
    }
    getMaxEjectionPercent() {
        return this.maxEjectionPercent;
    }
    getSuccessRateEjectionConfig() {
        return this.successRateEjection;
    }
    getFailurePercentageEjectionConfig() {
        return this.failurePercentageEjection;
    }
    getChildPolicy() {
        return this.childPolicy;
    }
    static createFromJson(obj) {
        var _a;
        validatePositiveDuration(obj, 'interval');
        validatePositiveDuration(obj, 'base_ejection_time');
        validatePositiveDuration(obj, 'max_ejection_time');
        validatePercentage(obj, 'max_ejection_percent');
        if ('success_rate_ejection' in obj &&
            obj.success_rate_ejection !== undefined) {
            if (typeof obj.success_rate_ejection !== 'object') {
                throw new Error('outlier detection config success_rate_ejection must be an object');
            }
            validateFieldType(obj.success_rate_ejection, 'stdev_factor', 'number', 'success_rate_ejection');
            validatePercentage(obj.success_rate_ejection, 'enforcement_percentage', 'success_rate_ejection');
            validateFieldType(obj.success_rate_ejection, 'minimum_hosts', 'number', 'success_rate_ejection');
            validateFieldType(obj.success_rate_ejection, 'request_volume', 'number', 'success_rate_ejection');
        }
        if ('failure_percentage_ejection' in obj &&
            obj.failure_percentage_ejection !== undefined) {
            if (typeof obj.failure_percentage_ejection !== 'object') {
                throw new Error('outlier detection config failure_percentage_ejection must be an object');
            }
            validatePercentage(obj.failure_percentage_ejection, 'threshold', 'failure_percentage_ejection');
            validatePercentage(obj.failure_percentage_ejection, 'enforcement_percentage', 'failure_percentage_ejection');
            validateFieldType(obj.failure_percentage_ejection, 'minimum_hosts', 'number', 'failure_percentage_ejection');
            validateFieldType(obj.failure_percentage_ejection, 'request_volume', 'number', 'failure_percentage_ejection');
        }
        if (!('child_policy' in obj) || !Array.isArray(obj.child_policy)) {
            throw new Error('outlier detection config child_policy must be an array');
        }
        const childPolicy = (0, load_balancer_1.selectLbConfigFromList)(obj.child_policy);
        if (!childPolicy) {
            throw new Error('outlier detection config child_policy: no valid recognized policy found');
        }
        return new OutlierDetectionLoadBalancingConfig(obj.interval ? (0, duration_1.durationToMs)(obj.interval) : null, obj.base_ejection_time ? (0, duration_1.durationToMs)(obj.base_ejection_time) : null, obj.max_ejection_time ? (0, duration_1.durationToMs)(obj.max_ejection_time) : null, (_a = obj.max_ejection_percent) !== null && _a !== void 0 ? _a : null, obj.success_rate_ejection, obj.failure_percentage_ejection, childPolicy);
    }
}
exports.OutlierDetectionLoadBalancingConfig = OutlierDetectionLoadBalancingConfig;
class OutlierDetectionSubchannelWrapper extends subchannel_interface_1.BaseSubchannelWrapper {
    constructor(childSubchannel, mapEntry) {
        super(childSubchannel);
        this.mapEntry = mapEntry;
        this.refCount = 0;
    }
    ref() {
        this.child.ref();
        this.refCount += 1;
    }
    unref() {
        this.child.unref();
        this.refCount -= 1;
        if (this.refCount <= 0) {
            if (this.mapEntry) {
                const index = this.mapEntry.subchannelWrappers.indexOf(this);
                if (index >= 0) {
                    this.mapEntry.subchannelWrappers.splice(index, 1);
                }
            }
        }
    }
    eject() {
        this.setHealthy(false);
    }
    uneject() {
        this.setHealthy(true);
    }
    getMapEntry() {
        return this.mapEntry;
    }
    getWrappedSubchannel() {
        return this.child;
    }
}
function createEmptyBucket() {
    return {
        success: 0,
        failure: 0,
    };
}
class CallCounter {
    constructor() {
        this.activeBucket = createEmptyBucket();
        this.inactiveBucket = createEmptyBucket();
    }
    addSuccess() {
        this.activeBucket.success += 1;
    }
    addFailure() {
        this.activeBucket.failure += 1;
    }
    switchBuckets() {
        this.inactiveBucket = this.activeBucket;
        this.activeBucket = createEmptyBucket();
    }
    getLastSuccesses() {
        return this.inactiveBucket.success;
    }
    getLastFailures() {
        return this.inactiveBucket.failure;
    }
}
class OutlierDetectionPicker {
    constructor(wrappedPicker, countCalls) {
        this.wrappedPicker = wrappedPicker;
        this.countCalls = countCalls;
    }
    pick(pickArgs) {
        const wrappedPick = this.wrappedPicker.pick(pickArgs);
        if (wrappedPick.pickResultType === picker_1.PickResultType.COMPLETE) {
            const subchannelWrapper = wrappedPick.subchannel;
            const mapEntry = subchannelWrapper.getMapEntry();
            if (mapEntry) {
                let onCallEnded = wrappedPick.onCallEnded;
                if (this.countCalls) {
                    onCallEnded = statusCode => {
                        var _a;
                        if (statusCode === constants_1.Status.OK) {
                            mapEntry.counter.addSuccess();
                        }
                        else {
                            mapEntry.counter.addFailure();
                        }
                        (_a = wrappedPick.onCallEnded) === null || _a === void 0 ? void 0 : _a.call(wrappedPick, statusCode);
                    };
                }
                return Object.assign(Object.assign({}, wrappedPick), { subchannel: subchannelWrapper.getWrappedSubchannel(), onCallEnded: onCallEnded });
            }
            else {
                return Object.assign(Object.assign({}, wrappedPick), { subchannel: subchannelWrapper.getWrappedSubchannel() });
            }
        }
        else {
            return wrappedPick;
        }
    }
}
class OutlierDetectionLoadBalancer {
    constructor(channelControlHelper) {
        this.entryMap = new subchannel_address_1.EndpointMap();
        this.latestConfig = null;
        this.timerStartTime = null;
        this.childBalancer = new load_balancer_child_handler_1.ChildLoadBalancerHandler((0, experimental_1.createChildChannelControlHelper)(channelControlHelper, {
            createSubchannel: (subchannelAddress, subchannelArgs) => {
                const originalSubchannel = channelControlHelper.createSubchannel(subchannelAddress, subchannelArgs);
                const mapEntry = this.entryMap.getForSubchannelAddress(subchannelAddress);
                const subchannelWrapper = new OutlierDetectionSubchannelWrapper(originalSubchannel, mapEntry);
                if ((mapEntry === null || mapEntry === void 0 ? void 0 : mapEntry.currentEjectionTimestamp) !== null) {
                    // If the address is ejected, propagate that to the new subchannel wrapper
                    subchannelWrapper.eject();
                }
                mapEntry === null || mapEntry === void 0 ? void 0 : mapEntry.subchannelWrappers.push(subchannelWrapper);
                return subchannelWrapper;
            },
            updateState: (connectivityState, picker, errorMessage) => {
                if (connectivityState === connectivity_state_1.ConnectivityState.READY) {
                    channelControlHelper.updateState(connectivityState, new OutlierDetectionPicker(picker, this.isCountingEnabled()), errorMessage);
                }
                else {
                    channelControlHelper.updateState(connectivityState, picker, errorMessage);
                }
            },
        }));
        this.ejectionTimer = setInterval(() => { }, 0);
        clearInterval(this.ejectionTimer);
    }
    isCountingEnabled() {
        return (this.latestConfig !== null &&
            (this.latestConfig.getSuccessRateEjectionConfig() !== null ||
                this.latestConfig.getFailurePercentageEjectionConfig() !== null));
    }
    getCurrentEjectionPercent() {
        let ejectionCount = 0;
        for (const mapEntry of this.entryMap.values()) {
            if (mapEntry.currentEjectionTimestamp !== null) {
                ejectionCount += 1;
            }
        }
        return (ejectionCount * 100) / this.entryMap.size;
    }
    runSuccessRateCheck(ejectionTimestamp) {
        if (!this.latestConfig) {
            return;
        }
        const successRateConfig = this.latestConfig.getSuccessRateEjectionConfig();
        if (!successRateConfig) {
            return;
        }
        trace('Running success rate check');
        // Step 1
        const targetRequestVolume = successRateConfig.request_volume;
        let addresesWithTargetVolume = 0;
        const successRates = [];
        for (const [endpoint, mapEntry] of this.entryMap.entries()) {
            const successes = mapEntry.counter.getLastSuccesses();
            const failures = mapEntry.counter.getLastFailures();
            trace('Stats for ' +
                (0, subchannel_address_1.endpointToString)(endpoint) +
                ': successes=' +
                successes +
                ' failures=' +
                failures +
                ' targetRequestVolume=' +
                targetRequestVolume);
            if (successes + failures >= targetRequestVolume) {
                addresesWithTargetVolume += 1;
                successRates.push(successes / (successes + failures));
            }
        }
        trace('Found ' +
            addresesWithTargetVolume +
            ' success rate candidates; currentEjectionPercent=' +
            this.getCurrentEjectionPercent() +
            ' successRates=[' +
            successRates +
            ']');
        if (addresesWithTargetVolume < successRateConfig.minimum_hosts) {
            return;
        }
        // Step 2
        const successRateMean = successRates.reduce((a, b) => a + b) / successRates.length;
        let successRateDeviationSum = 0;
        for (const rate of successRates) {
            const deviation = rate - successRateMean;
            successRateDeviationSum += deviation * deviation;
        }
        const successRateVariance = successRateDeviationSum / successRates.length;
        const successRateStdev = Math.sqrt(successRateVariance);
        const ejectionThreshold = successRateMean -
            successRateStdev * (successRateConfig.stdev_factor / 1000);
        trace('stdev=' + successRateStdev + ' ejectionThreshold=' + ejectionThreshold);
        // Step 3
        for (const [address, mapEntry] of this.entryMap.entries()) {
            // Step 3.i
            if (this.getCurrentEjectionPercent() >=
                this.latestConfig.getMaxEjectionPercent()) {
                break;
            }
            // Step 3.ii
            const successes = mapEntry.counter.getLastSuccesses();
            const failures = mapEntry.counter.getLastFailures();
            if (successes + failures < targetRequestVolume) {
                continue;
            }
            // Step 3.iii
            const successRate = successes / (successes + failures);
            trace('Checking candidate ' + address + ' successRate=' + successRate);
            if (successRate < ejectionThreshold) {
                const randomNumber = Math.random() * 100;
                trace('Candidate ' +
                    address +
                    ' randomNumber=' +
                    randomNumber +
                    ' enforcement_percentage=' +
                    successRateConfig.enforcement_percentage);
                if (randomNumber < successRateConfig.enforcement_percentage) {
                    trace('Ejecting candidate ' + address);
                    this.eject(mapEntry, ejectionTimestamp);
                }
            }
        }
    }
    runFailurePercentageCheck(ejectionTimestamp) {
        if (!this.latestConfig) {
            return;
        }
        const failurePercentageConfig = this.latestConfig.getFailurePercentageEjectionConfig();
        if (!failurePercentageConfig) {
            return;
        }
        trace('Running failure percentage check. threshold=' +
            failurePercentageConfig.threshold +
            ' request volume threshold=' +
            failurePercentageConfig.request_volume);
        // Step 1
        let addressesWithTargetVolume = 0;
        for (const mapEntry of this.entryMap.values()) {
            const successes = mapEntry.counter.getLastSuccesses();
            const failures = mapEntry.counter.getLastFailures();
            if (successes + failures >= failurePercentageConfig.request_volume) {
                addressesWithTargetVolume += 1;
            }
        }
        if (addressesWithTargetVolume < failurePercentageConfig.minimum_hosts) {
            return;
        }
        // Step 2
        for (const [address, mapEntry] of this.entryMap.entries()) {
            // Step 2.i
            if (this.getCurrentEjectionPercent() >=
                this.latestConfig.getMaxEjectionPercent()) {
                break;
            }
            // Step 2.ii
            const successes = mapEntry.counter.getLastSuccesses();
            const failures = mapEntry.counter.getLastFailures();
            trace('Candidate successes=' + successes + ' failures=' + failures);
            if (successes + failures < failurePercentageConfig.request_volume) {
                continue;
            }
            // Step 2.iii
            const failurePercentage = (failures * 100) / (failures + successes);
            if (failurePercentage > failurePercentageConfig.threshold) {
                const randomNumber = Math.random() * 100;
                trace('Candidate ' +
                    address +
                    ' randomNumber=' +
                    randomNumber +
                    ' enforcement_percentage=' +
                    failurePercentageConfig.enforcement_percentage);
                if (randomNumber < failurePercentageConfig.enforcement_percentage) {
                    trace('Ejecting candidate ' + address);
                    this.eject(mapEntry, ejectionTimestamp);
                }
            }
        }
    }
    eject(mapEntry, ejectionTimestamp) {
        mapEntry.currentEjectionTimestamp = new Date();
        mapEntry.ejectionTimeMultiplier += 1;
        for (const subchannelWrapper of mapEntry.subchannelWrappers) {
            subchannelWrapper.eject();
        }
    }
    uneject(mapEntry) {
        mapEntry.currentEjectionTimestamp = null;
        for (const subchannelWrapper of mapEntry.subchannelWrappers) {
            subchannelWrapper.uneject();
        }
    }
    switchAllBuckets() {
        for (const mapEntry of this.entryMap.values()) {
            mapEntry.counter.switchBuckets();
        }
    }
    startTimer(delayMs) {
        var _a, _b;
        this.ejectionTimer = setTimeout(() => this.runChecks(), delayMs);
        (_b = (_a = this.ejectionTimer).unref) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    runChecks() {
        const ejectionTimestamp = new Date();
        trace('Ejection timer running');
        this.switchAllBuckets();
        if (!this.latestConfig) {
            return;
        }
        this.timerStartTime = ejectionTimestamp;
        this.startTimer(this.latestConfig.getIntervalMs());
        this.runSuccessRateCheck(ejectionTimestamp);
        this.runFailurePercentageCheck(ejectionTimestamp);
        for (const [address, mapEntry] of this.entryMap.entries()) {
            if (mapEntry.currentEjectionTimestamp === null) {
                if (mapEntry.ejectionTimeMultiplier > 0) {
                    mapEntry.ejectionTimeMultiplier -= 1;
                }
            }
            else {
                const baseEjectionTimeMs = this.latestConfig.getBaseEjectionTimeMs();
                const maxEjectionTimeMs = this.latestConfig.getMaxEjectionTimeMs();
                const returnTime = new Date(mapEntry.currentEjectionTimestamp.getTime());
                returnTime.setMilliseconds(returnTime.getMilliseconds() +
                    Math.min(baseEjectionTimeMs * mapEntry.ejectionTimeMultiplier, Math.max(baseEjectionTimeMs, maxEjectionTimeMs)));
                if (returnTime < new Date()) {
                    trace('Unejecting ' + address);
                    this.uneject(mapEntry);
                }
            }
        }
    }
    updateAddressList(endpointList, lbConfig, options) {
        if (!(lbConfig instanceof OutlierDetectionLoadBalancingConfig)) {
            return;
        }
        trace('Received update with config: ' + JSON.stringify(lbConfig.toJsonObject(), undefined, 2));
        for (const endpoint of endpointList) {
            if (!this.entryMap.has(endpoint)) {
                trace('Adding map entry for ' + (0, subchannel_address_1.endpointToString)(endpoint));
                this.entryMap.set(endpoint, {
                    counter: new CallCounter(),
                    currentEjectionTimestamp: null,
                    ejectionTimeMultiplier: 0,
                    subchannelWrappers: [],
                });
            }
        }
        this.entryMap.deleteMissing(endpointList);
        const childPolicy = lbConfig.getChildPolicy();
        this.childBalancer.updateAddressList(endpointList, childPolicy, options);
        if (lbConfig.getSuccessRateEjectionConfig() ||
            lbConfig.getFailurePercentageEjectionConfig()) {
            if (this.timerStartTime) {
                trace('Previous timer existed. Replacing timer');
                clearTimeout(this.ejectionTimer);
                const remainingDelay = lbConfig.getIntervalMs() -
                    (new Date().getTime() - this.timerStartTime.getTime());
                this.startTimer(remainingDelay);
            }
            else {
                trace('Starting new timer');
                this.timerStartTime = new Date();
                this.startTimer(lbConfig.getIntervalMs());
                this.switchAllBuckets();
            }
        }
        else {
            trace('Counting disabled. Cancelling timer.');
            this.timerStartTime = null;
            clearTimeout(this.ejectionTimer);
            for (const mapEntry of this.entryMap.values()) {
                this.uneject(mapEntry);
                mapEntry.ejectionTimeMultiplier = 0;
            }
        }
        this.latestConfig = lbConfig;
    }
    exitIdle() {
        this.childBalancer.exitIdle();
    }
    resetBackoff() {
        this.childBalancer.resetBackoff();
    }
    destroy() {
        clearTimeout(this.ejectionTimer);
        this.childBalancer.destroy();
    }
    getTypeName() {
        return TYPE_NAME;
    }
}
exports.OutlierDetectionLoadBalancer = OutlierDetectionLoadBalancer;
function setup() {
    if (OUTLIER_DETECTION_ENABLED) {
        (0, experimental_1.registerLoadBalancerType)(TYPE_NAME, OutlierDetectionLoadBalancer, OutlierDetectionLoadBalancingConfig);
    }
}
//# sourceMappingURL=load-balancer-outlier-detection.js.map