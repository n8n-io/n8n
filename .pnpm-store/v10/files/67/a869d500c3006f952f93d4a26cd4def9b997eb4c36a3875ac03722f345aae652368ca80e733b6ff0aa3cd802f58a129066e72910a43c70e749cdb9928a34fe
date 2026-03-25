"use strict";
/*
 * Copyright 2019 gRPC authors.
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
exports.createChildChannelControlHelper = createChildChannelControlHelper;
exports.registerLoadBalancerType = registerLoadBalancerType;
exports.registerDefaultLoadBalancerType = registerDefaultLoadBalancerType;
exports.createLoadBalancer = createLoadBalancer;
exports.isLoadBalancerNameRegistered = isLoadBalancerNameRegistered;
exports.parseLoadBalancingConfig = parseLoadBalancingConfig;
exports.getDefaultConfig = getDefaultConfig;
exports.selectLbConfigFromList = selectLbConfigFromList;
const logging_1 = require("./logging");
const constants_1 = require("./constants");
/**
 * Create a child ChannelControlHelper that overrides some methods of the
 * parent while letting others pass through to the parent unmodified. This
 * allows other code to create these children without needing to know about
 * all of the methods to be passed through.
 * @param parent
 * @param overrides
 */
function createChildChannelControlHelper(parent, overrides) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return {
        createSubchannel: (_b = (_a = overrides.createSubchannel) === null || _a === void 0 ? void 0 : _a.bind(overrides)) !== null && _b !== void 0 ? _b : parent.createSubchannel.bind(parent),
        updateState: (_d = (_c = overrides.updateState) === null || _c === void 0 ? void 0 : _c.bind(overrides)) !== null && _d !== void 0 ? _d : parent.updateState.bind(parent),
        requestReresolution: (_f = (_e = overrides.requestReresolution) === null || _e === void 0 ? void 0 : _e.bind(overrides)) !== null && _f !== void 0 ? _f : parent.requestReresolution.bind(parent),
        addChannelzChild: (_h = (_g = overrides.addChannelzChild) === null || _g === void 0 ? void 0 : _g.bind(overrides)) !== null && _h !== void 0 ? _h : parent.addChannelzChild.bind(parent),
        removeChannelzChild: (_k = (_j = overrides.removeChannelzChild) === null || _j === void 0 ? void 0 : _j.bind(overrides)) !== null && _k !== void 0 ? _k : parent.removeChannelzChild.bind(parent),
    };
}
const registeredLoadBalancerTypes = {};
let defaultLoadBalancerType = null;
function registerLoadBalancerType(typeName, loadBalancerType, loadBalancingConfigType) {
    registeredLoadBalancerTypes[typeName] = {
        LoadBalancer: loadBalancerType,
        LoadBalancingConfig: loadBalancingConfigType,
    };
}
function registerDefaultLoadBalancerType(typeName) {
    defaultLoadBalancerType = typeName;
}
function createLoadBalancer(config, channelControlHelper) {
    const typeName = config.getLoadBalancerName();
    if (typeName in registeredLoadBalancerTypes) {
        return new registeredLoadBalancerTypes[typeName].LoadBalancer(channelControlHelper);
    }
    else {
        return null;
    }
}
function isLoadBalancerNameRegistered(typeName) {
    return typeName in registeredLoadBalancerTypes;
}
function parseLoadBalancingConfig(rawConfig) {
    const keys = Object.keys(rawConfig);
    if (keys.length !== 1) {
        throw new Error('Provided load balancing config has multiple conflicting entries');
    }
    const typeName = keys[0];
    if (typeName in registeredLoadBalancerTypes) {
        try {
            return registeredLoadBalancerTypes[typeName].LoadBalancingConfig.createFromJson(rawConfig[typeName]);
        }
        catch (e) {
            throw new Error(`${typeName}: ${e.message}`);
        }
    }
    else {
        throw new Error(`Unrecognized load balancing config name ${typeName}`);
    }
}
function getDefaultConfig() {
    if (!defaultLoadBalancerType) {
        throw new Error('No default load balancer type registered');
    }
    return new registeredLoadBalancerTypes[defaultLoadBalancerType].LoadBalancingConfig();
}
function selectLbConfigFromList(configs, fallbackTodefault = false) {
    for (const config of configs) {
        try {
            return parseLoadBalancingConfig(config);
        }
        catch (e) {
            (0, logging_1.log)(constants_1.LogVerbosity.DEBUG, 'Config parsing failed with error', e.message);
            continue;
        }
    }
    if (fallbackTodefault) {
        if (defaultLoadBalancerType) {
            return new registeredLoadBalancerTypes[defaultLoadBalancerType].LoadBalancingConfig();
        }
        else {
            return null;
        }
    }
    else {
        return null;
    }
}
//# sourceMappingURL=load-balancer.js.map