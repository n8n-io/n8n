"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSpan = void 0;
const core_tracing_1 = require("@azure/core-tracing");
/**
 * Creates a tracing client using the global tracer.
 * @internal
 */
const tracingClient = (0, core_tracing_1.createTracingClient)({
    namespace: "Microsoft.Search",
    packageName: "Azure.Search",
});
exports.createSpan = tracingClient.startSpan;
//# sourceMappingURL=tracing.js.map