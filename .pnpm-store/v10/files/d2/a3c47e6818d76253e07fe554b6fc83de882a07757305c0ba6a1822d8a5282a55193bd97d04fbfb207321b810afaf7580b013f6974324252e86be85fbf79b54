"use strict";
// ------------------------------------------------------------------------------
// Copyright (c) Microsoft Corporation. All rights reserved.
// ------------------------------------------------------------------------------
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatError = exports.resetLogger = exports.getLogger = exports.setLogger = exports.logger = exports.OutputScope = exports.InferenceScope = exports.InvokeAgentScope = exports.ExecuteToolScope = exports.OpenTelemetryScope = exports.InferenceOperationType = exports.InvocationRole = exports.ExecutionType = exports.runWithExtractedTraceContext = exports.extractTraceContext = exports.injectTraceContext = exports.createContextWithParentSpanRef = exports.runWithParentSpanRef = exports.getExportToken = exports.updateExportToken = exports.runWithExportToken = exports.BaggageScope = exports.BaggageBuilder = exports.ExporterEventNames = exports.OpenTelemetryConstants = exports.Agent365ExporterOptions = exports.Builder = exports.ObservabilityManager = void 0;
// Main SDK classes
var ObservabilityManager_1 = require("./ObservabilityManager");
Object.defineProperty(exports, "ObservabilityManager", { enumerable: true, get: function () { return ObservabilityManager_1.ObservabilityManager; } });
var ObservabilityBuilder_1 = require("./ObservabilityBuilder");
Object.defineProperty(exports, "Builder", { enumerable: true, get: function () { return ObservabilityBuilder_1.ObservabilityBuilder; } });
var Agent365ExporterOptions_1 = require("./tracing/exporter/Agent365ExporterOptions");
Object.defineProperty(exports, "Agent365ExporterOptions", { enumerable: true, get: function () { return Agent365ExporterOptions_1.Agent365ExporterOptions; } });
// Tracing constants
var constants_1 = require("./tracing/constants");
Object.defineProperty(exports, "OpenTelemetryConstants", { enumerable: true, get: function () { return constants_1.OpenTelemetryConstants; } });
var ExporterEventNames_1 = require("./tracing/exporter/ExporterEventNames");
Object.defineProperty(exports, "ExporterEventNames", { enumerable: true, get: function () { return ExporterEventNames_1.ExporterEventNames; } });
// Baggage builder
var BaggageBuilder_1 = require("./tracing/middleware/BaggageBuilder");
Object.defineProperty(exports, "BaggageBuilder", { enumerable: true, get: function () { return BaggageBuilder_1.BaggageBuilder; } });
Object.defineProperty(exports, "BaggageScope", { enumerable: true, get: function () { return BaggageBuilder_1.BaggageScope; } });
// Per-request export utilities
var token_context_1 = require("./tracing/context/token-context");
Object.defineProperty(exports, "runWithExportToken", { enumerable: true, get: function () { return token_context_1.runWithExportToken; } });
Object.defineProperty(exports, "updateExportToken", { enumerable: true, get: function () { return token_context_1.updateExportToken; } });
Object.defineProperty(exports, "getExportToken", { enumerable: true, get: function () { return token_context_1.getExportToken; } });
// Parent span context utilities
var parent_span_context_1 = require("./tracing/context/parent-span-context");
Object.defineProperty(exports, "runWithParentSpanRef", { enumerable: true, get: function () { return parent_span_context_1.runWithParentSpanRef; } });
Object.defineProperty(exports, "createContextWithParentSpanRef", { enumerable: true, get: function () { return parent_span_context_1.createContextWithParentSpanRef; } });
// Trace context propagation utilities (W3C traceparent/tracestate)
var trace_context_propagation_1 = require("./tracing/context/trace-context-propagation");
Object.defineProperty(exports, "injectTraceContext", { enumerable: true, get: function () { return trace_context_propagation_1.injectTraceContext; } });
Object.defineProperty(exports, "extractTraceContext", { enumerable: true, get: function () { return trace_context_propagation_1.extractTraceContext; } });
Object.defineProperty(exports, "runWithExtractedTraceContext", { enumerable: true, get: function () { return trace_context_propagation_1.runWithExtractedTraceContext; } });
// Contracts and interfaces
var contracts_1 = require("./tracing/contracts");
Object.defineProperty(exports, "ExecutionType", { enumerable: true, get: function () { return contracts_1.ExecutionType; } });
Object.defineProperty(exports, "InvocationRole", { enumerable: true, get: function () { return contracts_1.InvocationRole; } });
Object.defineProperty(exports, "InferenceOperationType", { enumerable: true, get: function () { return contracts_1.InferenceOperationType; } });
// Scopes
var OpenTelemetryScope_1 = require("./tracing/scopes/OpenTelemetryScope");
Object.defineProperty(exports, "OpenTelemetryScope", { enumerable: true, get: function () { return OpenTelemetryScope_1.OpenTelemetryScope; } });
var ExecuteToolScope_1 = require("./tracing/scopes/ExecuteToolScope");
Object.defineProperty(exports, "ExecuteToolScope", { enumerable: true, get: function () { return ExecuteToolScope_1.ExecuteToolScope; } });
var InvokeAgentScope_1 = require("./tracing/scopes/InvokeAgentScope");
Object.defineProperty(exports, "InvokeAgentScope", { enumerable: true, get: function () { return InvokeAgentScope_1.InvokeAgentScope; } });
var InferenceScope_1 = require("./tracing/scopes/InferenceScope");
Object.defineProperty(exports, "InferenceScope", { enumerable: true, get: function () { return InferenceScope_1.InferenceScope; } });
var OutputScope_1 = require("./tracing/scopes/OutputScope");
Object.defineProperty(exports, "OutputScope", { enumerable: true, get: function () { return OutputScope_1.OutputScope; } });
var logging_1 = require("./utils/logging");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return logging_1.logger; } });
Object.defineProperty(exports, "setLogger", { enumerable: true, get: function () { return logging_1.setLogger; } });
Object.defineProperty(exports, "getLogger", { enumerable: true, get: function () { return logging_1.getLogger; } });
Object.defineProperty(exports, "resetLogger", { enumerable: true, get: function () { return logging_1.resetLogger; } });
Object.defineProperty(exports, "formatError", { enumerable: true, get: function () { return logging_1.formatError; } });
// Configuration
__exportStar(require("./configuration"), exports);
//# sourceMappingURL=index.js.map