"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupResource = exports.startNodeSDK = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const configuration_1 = require("@opentelemetry/configuration");
const api_1 = require("@opentelemetry/api");
const utils_1 = require("./utils");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const sdk_logs_1 = require("@opentelemetry/sdk-logs");
const api_logs_1 = require("@opentelemetry/api-logs");
const resources_1 = require("@opentelemetry/resources");
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const semconv_1 = require("./semconv");
/**
 * @experimental Function to start the OpenTelemetry Node SDK
 * @param sdkOptions
 */
function startNodeSDK(sdkOptions) {
    const configFactory = (0, configuration_1.createConfigFactory)();
    const config = configFactory.getConfigModel();
    if (config.disabled) {
        api_1.diag.info('OpenTelemetry SDK is disabled');
        return NOOP_SDK;
    }
    if (config.log_level != null) {
        api_1.diag.setLogger(new api_1.DiagConsoleLogger(), { logLevel: config.log_level });
    }
    (0, instrumentation_1.registerInstrumentations)({
        instrumentations: sdkOptions?.instrumentations?.flat() ?? [],
    });
    const components = create(config, sdkOptions);
    api_1.context.setGlobalContextManager(components.contextManager);
    if (components.loggerProvider) {
        api_logs_1.logs.setGlobalLoggerProvider(components.loggerProvider);
    }
    if (components.propagator) {
        api_1.propagation.setGlobalPropagator(components.propagator);
    }
    const shutdownFn = async () => {
        const promises = [];
        if (components.loggerProvider) {
            promises.push(components.loggerProvider.shutdown());
        }
        await Promise.all(promises);
    };
    return { shutdown: shutdownFn };
}
exports.startNodeSDK = startNodeSDK;
const NOOP_SDK = {
    shutdown: async () => { },
};
/**
 * Interpret configuration model and return SDK components.
 */
function create(config, sdkOptions) {
    const defaultContextManager = new context_async_hooks_1.AsyncLocalStorageContextManager();
    defaultContextManager.enable();
    const components = {
        contextManager: defaultContextManager,
    };
    const resource = setupResource(config, sdkOptions);
    const propagator = sdkOptions?.textMapPropagator === null
        ? null
        : (sdkOptions?.textMapPropagator ??
            (0, utils_1.getPropagatorFromConfiguration)(config));
    if (propagator) {
        components.propagator = propagator;
    }
    const logProcessors = (0, utils_1.getLogRecordProcessorsFromConfiguration)(config);
    if (logProcessors) {
        const loggerProvider = new sdk_logs_1.LoggerProvider({
            resource: resource,
            processors: logProcessors,
        });
        components.loggerProvider = loggerProvider;
    }
    return components;
}
function setupResource(config, sdkOptions) {
    let resource = (0, utils_1.getResourceFromConfiguration)(config) ?? (0, resources_1.defaultResource)();
    let resourceDetectors = [];
    if (sdkOptions.resourceDetectors != null) {
        resourceDetectors = sdkOptions.resourceDetectors;
    }
    else if (config.node_resource_detectors) {
        resourceDetectors = (0, utils_1.getResourceDetectorsFromConfiguration)(config);
    }
    if (resourceDetectors.length > 0) {
        const internalConfig = {
            detectors: resourceDetectors,
        };
        resource = resource.merge((0, resources_1.detectResources)(internalConfig));
    }
    const instanceId = (0, utils_1.getInstanceID)(config);
    resource =
        instanceId === undefined
            ? resource
            : resource.merge((0, resources_1.resourceFromAttributes)({
                [semconv_1.ATTR_SERVICE_INSTANCE_ID]: instanceId,
            }));
    return resource;
}
exports.setupResource = setupResource;
//# sourceMappingURL=start.js.map