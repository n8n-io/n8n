/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import * as root from '../../generated/root';
import { createExportLogsServiceRequest } from '../internal';
import { PROTOBUF_ENCODER } from '../../common/utils';
const logsResponseType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceResponse;
const logsRequestType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceRequest;
/*
 * @experimental this serializer may receive breaking changes in minor versions, pin this package's version when using this constant
 */
export const ProtobufLogsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportLogsServiceRequest(arg, PROTOBUF_ENCODER);
        return logsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return logsResponseType.decode(arg);
    },
};
//# sourceMappingURL=logs.js.map