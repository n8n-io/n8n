/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as root from '../../generated/root';
import { createExportTraceServiceRequest } from '../internal';
import { PROTOBUF_ENCODER } from '../../common/utils';
const traceResponseType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceResponse;
const traceRequestType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceRequest;
export const ProtobufTraceSerializer = {
    serializeRequest: (arg) => {
        const request = createExportTraceServiceRequest(arg, PROTOBUF_ENCODER);
        return traceRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return traceResponseType.decode(arg);
    },
};
//# sourceMappingURL=trace.js.map