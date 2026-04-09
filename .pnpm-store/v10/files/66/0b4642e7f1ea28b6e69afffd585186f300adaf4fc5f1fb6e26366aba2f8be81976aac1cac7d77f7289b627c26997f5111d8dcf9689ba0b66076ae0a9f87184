"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.startNodeSDK = exports.NodeSDK = exports.tracing = exports.resources = exports.node = exports.metrics = exports.logs = exports.core = exports.contextBase = exports.api = void 0;
// This is a meta-package, and these exist in to re-export *all* items from
// the individual packages as individual _namespaces_, so wildcard exports are
// appropriate here. Otherwise, it'd be a pain to enumerate and keep things
// in-sync with all the upstream packages.
/* eslint-disable no-restricted-syntax */
exports.api = require("@opentelemetry/api");
exports.contextBase = require("@opentelemetry/api");
exports.core = require("@opentelemetry/core");
exports.logs = require("@opentelemetry/sdk-logs");
exports.metrics = require("@opentelemetry/sdk-metrics");
exports.node = require("@opentelemetry/sdk-trace-node");
exports.resources = require("@opentelemetry/resources");
exports.tracing = require("@opentelemetry/sdk-trace-base");
/* eslint-enable no-restricted-syntax */
var sdk_1 = require("./sdk");
Object.defineProperty(exports, "NodeSDK", { enumerable: true, get: function () { return sdk_1.NodeSDK; } });
var start_1 = require("./start");
Object.defineProperty(exports, "startNodeSDK", { enumerable: true, get: function () { return start_1.startNodeSDK; } });
//# sourceMappingURL=index.js.map