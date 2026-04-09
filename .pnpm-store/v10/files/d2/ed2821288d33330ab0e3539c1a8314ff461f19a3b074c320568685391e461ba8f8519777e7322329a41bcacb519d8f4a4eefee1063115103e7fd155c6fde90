"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProtobufLogsSerializer = void 0;
/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
const root = require("../../generated/root");
const internal_1 = require("../internal");
const utils_1 = require("../../common/utils");
const logsResponseType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceResponse;
const logsRequestType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceRequest;
/*
 * @experimental this serializer may receive breaking changes in minor versions, pin this package's version when using this constant
 */
exports.ProtobufLogsSerializer = {
    serializeRequest: (arg) => {
        const request = (0, internal_1.createExportLogsServiceRequest)(arg, utils_1.PROTOBUF_ENCODER);
        return logsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return logsResponseType.decode(arg);
    },
};
//# sourceMappingURL=logs.js.map