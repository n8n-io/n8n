"use strict";
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtobufTraceSerializer = void 0;
const root = require("../../generated/root");
const internal_1 = require("../internal");
const utils_1 = require("../../common/utils");
const traceResponseType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceResponse;
const traceRequestType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceRequest;
exports.ProtobufTraceSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportTraceServiceRequest)(arg, utils_1.PROTOBUF_ENCODER);
        return traceRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return traceResponseType.decode(arg);
    },
};
//# sourceMappingURL=trace.js.map