"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
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
exports.defaultPerRequestSpanProcessorConfigurationProvider = exports.defaultObservabilityConfigurationProvider = void 0;
const agents_a365_runtime_1 = require("@microsoft/agents-a365-runtime");
const ObservabilityConfiguration_1 = require("./ObservabilityConfiguration");
const PerRequestSpanProcessorConfiguration_1 = require("./PerRequestSpanProcessorConfiguration");
__exportStar(require("./ObservabilityConfigurationOptions"), exports);
__exportStar(require("./ObservabilityConfiguration"), exports);
__exportStar(require("./PerRequestSpanProcessorConfigurationOptions"), exports);
__exportStar(require("./PerRequestSpanProcessorConfiguration"), exports);
/**
 * Shared default provider for ObservabilityConfiguration.
 */
exports.defaultObservabilityConfigurationProvider = new agents_a365_runtime_1.DefaultConfigurationProvider(() => new ObservabilityConfiguration_1.ObservabilityConfiguration());
/**
 * Shared default provider for PerRequestSpanProcessorConfiguration.
 */
exports.defaultPerRequestSpanProcessorConfigurationProvider = new agents_a365_runtime_1.DefaultConfigurationProvider(() => new PerRequestSpanProcessorConfiguration_1.PerRequestSpanProcessorConfiguration());
//# sourceMappingURL=index.js.map