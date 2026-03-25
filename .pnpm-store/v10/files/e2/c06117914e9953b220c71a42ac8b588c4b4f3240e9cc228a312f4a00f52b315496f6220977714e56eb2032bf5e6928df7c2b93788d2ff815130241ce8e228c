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
exports.ResolvingLoadBalancer = void 0;
const load_balancer_1 = require("./load-balancer");
const service_config_1 = require("./service-config");
const connectivity_state_1 = require("./connectivity-state");
const resolver_1 = require("./resolver");
const picker_1 = require("./picker");
const backoff_timeout_1 = require("./backoff-timeout");
const constants_1 = require("./constants");
const metadata_1 = require("./metadata");
const logging = require("./logging");
const constants_2 = require("./constants");
const uri_parser_1 = require("./uri-parser");
const load_balancer_child_handler_1 = require("./load-balancer-child-handler");
const TRACER_NAME = 'resolving_load_balancer';
function trace(text) {
    logging.trace(constants_2.LogVerbosity.DEBUG, TRACER_NAME, text);
}
/**
 * Name match levels in order from most to least specific. This is the order in
 * which searches will be performed.
 */
const NAME_MATCH_LEVEL_ORDER = [
    'SERVICE_AND_METHOD',
    'SERVICE',
    'EMPTY',
];
function hasMatchingName(service, method, methodConfig, matchLevel) {
    for (const name of methodConfig.name) {
        switch (matchLevel) {
            case 'EMPTY':
                if (!name.service && !name.method) {
                    return true;
                }
                break;
            case 'SERVICE':
                if (name.service === service && !name.method) {
                    return true;
                }
                break;
            case 'SERVICE_AND_METHOD':
                if (name.service === service && name.method === method) {
                    return true;
                }
        }
    }
    return false;
}
function findMatchingConfig(service, method, methodConfigs, matchLevel) {
    for (const config of methodConfigs) {
        if (hasMatchingName(service, method, config, matchLevel)) {
            return config;
        }
    }
    return null;
}
function getDefaultConfigSelector(serviceConfig) {
    return {
        invoke(methodName, metadata) {
            var _a, _b;
            const splitName = methodName.split('/').filter(x => x.length > 0);
            const service = (_a = splitName[0]) !== null && _a !== void 0 ? _a : '';
            const method = (_b = splitName[1]) !== null && _b !== void 0 ? _b : '';
            if (serviceConfig && serviceConfig.methodConfig) {
                /* Check for the following in order, and return the first method
                * config that matches:
                * 1. A name that exactly matches the service and method
                * 2. A name with no method set that matches the service
                * 3. An empty name
                */
                for (const matchLevel of NAME_MATCH_LEVEL_ORDER) {
                    const matchingConfig = findMatchingConfig(service, method, serviceConfig.methodConfig, matchLevel);
                    if (matchingConfig) {
                        return {
                            methodConfig: matchingConfig,
                            pickInformation: {},
                            status: constants_1.Status.OK,
                            dynamicFilterFactories: [],
                        };
                    }
                }
            }
            return {
                methodConfig: { name: [] },
                pickInformation: {},
                status: constants_1.Status.OK,
                dynamicFilterFactories: [],
            };
        },
        unref() { }
    };
}
class ResolvingLoadBalancer {
    /**
     * Wrapper class that behaves like a `LoadBalancer` and also handles name
     * resolution internally.
     * @param target The address of the backend to connect to.
     * @param channelControlHelper `ChannelControlHelper` instance provided by
     *     this load balancer's owner.
     * @param defaultServiceConfig The default service configuration to be used
     *     if none is provided by the name resolver. A `null` value indicates
     *     that the default behavior should be the default unconfigured behavior.
     *     In practice, that means using the "pick first" load balancer
     *     implmentation
     */
    constructor(target, channelControlHelper, channelOptions, onSuccessfulResolution, onFailedResolution) {
        this.target = target;
        this.channelControlHelper = channelControlHelper;
        this.channelOptions = channelOptions;
        this.onSuccessfulResolution = onSuccessfulResolution;
        this.onFailedResolution = onFailedResolution;
        this.latestChildState = connectivity_state_1.ConnectivityState.IDLE;
        this.latestChildPicker = new picker_1.QueuePicker(this);
        this.latestChildErrorMessage = null;
        /**
         * This resolving load balancer's current connectivity state.
         */
        this.currentState = connectivity_state_1.ConnectivityState.IDLE;
        /**
         * The service config object from the last successful resolution, if
         * available. A value of null indicates that we have not yet received a valid
         * service config from the resolver.
         */
        this.previousServiceConfig = null;
        /**
         * Indicates whether we should attempt to resolve again after the backoff
         * timer runs out.
         */
        this.continueResolving = false;
        if (channelOptions['grpc.service_config']) {
            this.defaultServiceConfig = (0, service_config_1.validateServiceConfig)(JSON.parse(channelOptions['grpc.service_config']));
        }
        else {
            this.defaultServiceConfig = {
                loadBalancingConfig: [],
                methodConfig: [],
            };
        }
        this.updateState(connectivity_state_1.ConnectivityState.IDLE, new picker_1.QueuePicker(this), null);
        this.childLoadBalancer = new load_balancer_child_handler_1.ChildLoadBalancerHandler({
            createSubchannel: channelControlHelper.createSubchannel.bind(channelControlHelper),
            requestReresolution: () => {
                /* If the backoffTimeout is running, we're still backing off from
                 * making resolve requests, so we shouldn't make another one here.
                 * In that case, the backoff timer callback will call
                 * updateResolution */
                if (this.backoffTimeout.isRunning()) {
                    trace('requestReresolution delayed by backoff timer until ' +
                        this.backoffTimeout.getEndTime().toISOString());
                    this.continueResolving = true;
                }
                else {
                    this.updateResolution();
                }
            },
            updateState: (newState, picker, errorMessage) => {
                this.latestChildState = newState;
                this.latestChildPicker = picker;
                this.latestChildErrorMessage = errorMessage;
                this.updateState(newState, picker, errorMessage);
            },
            addChannelzChild: channelControlHelper.addChannelzChild.bind(channelControlHelper),
            removeChannelzChild: channelControlHelper.removeChannelzChild.bind(channelControlHelper),
        });
        this.innerResolver = (0, resolver_1.createResolver)(target, {
            onSuccessfulResolution: (endpointList, serviceConfig, serviceConfigError, configSelector, attributes) => {
                var _a;
                this.backoffTimeout.stop();
                this.backoffTimeout.reset();
                let workingServiceConfig = null;
                /* This first group of conditionals implements the algorithm described
                 * in https://github.com/grpc/proposal/blob/master/A21-service-config-error-handling.md
                 * in the section called "Behavior on receiving a new gRPC Config".
                 */
                if (serviceConfig === null) {
                    // Step 4 and 5
                    if (serviceConfigError === null) {
                        // Step 5
                        this.previousServiceConfig = null;
                        workingServiceConfig = this.defaultServiceConfig;
                    }
                    else {
                        // Step 4
                        if (this.previousServiceConfig === null) {
                            // Step 4.ii
                            this.handleResolutionFailure(serviceConfigError);
                        }
                        else {
                            // Step 4.i
                            workingServiceConfig = this.previousServiceConfig;
                        }
                    }
                }
                else {
                    // Step 3
                    workingServiceConfig = serviceConfig;
                    this.previousServiceConfig = serviceConfig;
                }
                const workingConfigList = (_a = workingServiceConfig === null || workingServiceConfig === void 0 ? void 0 : workingServiceConfig.loadBalancingConfig) !== null && _a !== void 0 ? _a : [];
                const loadBalancingConfig = (0, load_balancer_1.selectLbConfigFromList)(workingConfigList, true);
                if (loadBalancingConfig === null) {
                    // There were load balancing configs but none are supported. This counts as a resolution failure
                    this.handleResolutionFailure({
                        code: constants_1.Status.UNAVAILABLE,
                        details: 'All load balancer options in service config are not compatible',
                        metadata: new metadata_1.Metadata(),
                    });
                    configSelector === null || configSelector === void 0 ? void 0 : configSelector.unref();
                    return;
                }
                this.childLoadBalancer.updateAddressList(endpointList, loadBalancingConfig, Object.assign(Object.assign({}, this.channelOptions), attributes));
                const finalServiceConfig = workingServiceConfig !== null && workingServiceConfig !== void 0 ? workingServiceConfig : this.defaultServiceConfig;
                this.onSuccessfulResolution(finalServiceConfig, configSelector !== null && configSelector !== void 0 ? configSelector : getDefaultConfigSelector(finalServiceConfig));
            },
            onError: (error) => {
                this.handleResolutionFailure(error);
            },
        }, channelOptions);
        const backoffOptions = {
            initialDelay: channelOptions['grpc.initial_reconnect_backoff_ms'],
            maxDelay: channelOptions['grpc.max_reconnect_backoff_ms'],
        };
        this.backoffTimeout = new backoff_timeout_1.BackoffTimeout(() => {
            if (this.continueResolving) {
                this.updateResolution();
                this.continueResolving = false;
            }
            else {
                this.updateState(this.latestChildState, this.latestChildPicker, this.latestChildErrorMessage);
            }
        }, backoffOptions);
        this.backoffTimeout.unref();
    }
    updateResolution() {
        this.innerResolver.updateResolution();
        if (this.currentState === connectivity_state_1.ConnectivityState.IDLE) {
            /* this.latestChildPicker is initialized as new QueuePicker(this), which
             * is an appropriate value here if the child LB policy is unset.
             * Otherwise, we want to delegate to the child here, in case that
             * triggers something. */
            this.updateState(connectivity_state_1.ConnectivityState.CONNECTING, this.latestChildPicker, this.latestChildErrorMessage);
        }
        this.backoffTimeout.runOnce();
    }
    updateState(connectivityState, picker, errorMessage) {
        trace((0, uri_parser_1.uriToString)(this.target) +
            ' ' +
            connectivity_state_1.ConnectivityState[this.currentState] +
            ' -> ' +
            connectivity_state_1.ConnectivityState[connectivityState]);
        // Ensure that this.exitIdle() is called by the picker
        if (connectivityState === connectivity_state_1.ConnectivityState.IDLE) {
            picker = new picker_1.QueuePicker(this, picker);
        }
        this.currentState = connectivityState;
        this.channelControlHelper.updateState(connectivityState, picker, errorMessage);
    }
    handleResolutionFailure(error) {
        if (this.latestChildState === connectivity_state_1.ConnectivityState.IDLE) {
            this.updateState(connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE, new picker_1.UnavailablePicker(error), error.details);
            this.onFailedResolution(error);
        }
    }
    exitIdle() {
        if (this.currentState === connectivity_state_1.ConnectivityState.IDLE ||
            this.currentState === connectivity_state_1.ConnectivityState.TRANSIENT_FAILURE) {
            if (this.backoffTimeout.isRunning()) {
                this.continueResolving = true;
            }
            else {
                this.updateResolution();
            }
        }
        this.childLoadBalancer.exitIdle();
    }
    updateAddressList(endpointList, lbConfig) {
        throw new Error('updateAddressList not supported on ResolvingLoadBalancer');
    }
    resetBackoff() {
        this.backoffTimeout.reset();
        this.childLoadBalancer.resetBackoff();
    }
    destroy() {
        this.childLoadBalancer.destroy();
        this.innerResolver.destroy();
        this.backoffTimeout.reset();
        this.backoffTimeout.stop();
        this.latestChildState = connectivity_state_1.ConnectivityState.IDLE;
        this.latestChildPicker = new picker_1.QueuePicker(this);
        this.currentState = connectivity_state_1.ConnectivityState.IDLE;
        this.previousServiceConfig = null;
        this.continueResolving = false;
    }
    getTypeName() {
        return 'resolving_load_balancer';
    }
}
exports.ResolvingLoadBalancer = ResolvingLoadBalancer;
//# sourceMappingURL=resolving-load-balancer.js.map