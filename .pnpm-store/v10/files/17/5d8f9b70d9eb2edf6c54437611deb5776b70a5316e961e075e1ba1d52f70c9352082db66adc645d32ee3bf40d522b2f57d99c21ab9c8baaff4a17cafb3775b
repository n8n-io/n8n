"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodeTracerProvider = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const context_async_hooks_1 = require("@opentelemetry/context-async-hooks");
const sdk_trace_base_1 = require("@opentelemetry/sdk-trace-base");
const api_1 = require("@opentelemetry/api");
const core_1 = require("@opentelemetry/core");
function setupContextManager(contextManager) {
    // null means 'do not register'
    if (contextManager === null) {
        return;
    }
    // undefined means 'register default'
    if (contextManager === undefined) {
        const defaultContextManager = new context_async_hooks_1.AsyncLocalStorageContextManager();
        defaultContextManager.enable();
        api_1.context.setGlobalContextManager(defaultContextManager);
        return;
    }
    contextManager.enable();
    api_1.context.setGlobalContextManager(contextManager);
}
function setupPropagator(propagator) {
    // null means 'do not register'
    if (propagator === null) {
        return;
    }
    // undefined means 'register default'
    if (propagator === undefined) {
        api_1.propagation.setGlobalPropagator(new core_1.CompositePropagator({
            propagators: [
                new core_1.W3CTraceContextPropagator(),
                new core_1.W3CBaggagePropagator(),
            ],
        }));
        return;
    }
    api_1.propagation.setGlobalPropagator(propagator);
}
/**
 * Register this TracerProvider for use with the OpenTelemetry API.
 * Undefined values may be replaced with defaults, and
 * null values will be skipped.
 *
 * @param config Configuration object for SDK registration
 */
class NodeTracerProvider extends sdk_trace_base_1.BasicTracerProvider {
    constructor(config = {}) {
        super(config);
    }
    /**
     * Register this TracerProvider for use with the OpenTelemetry API.
     * Undefined values may be replaced with defaults, and
     * null values will be skipped.
     *
     * @param config Configuration object for SDK registration
     */
    register(config = {}) {
        api_1.trace.setGlobalTracerProvider(this);
        setupContextManager(config.contextManager);
        setupPropagator(config.propagator);
    }
}
exports.NodeTracerProvider = NodeTracerProvider;
//# sourceMappingURL=NodeTracerProvider.js.map