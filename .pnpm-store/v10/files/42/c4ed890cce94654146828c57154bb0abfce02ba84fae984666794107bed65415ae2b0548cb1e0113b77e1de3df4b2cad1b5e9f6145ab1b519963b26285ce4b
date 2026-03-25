/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as root from '../../generated/root';
import { createExportTraceServiceRequest } from '../internal';
const traceResponseType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceResponse;
const traceRequestType = root.opentelemetry.proto.collector.trace.v1
    .ExportTraceServiceRequest;
export const ProtobufTraceSerializer = {
    serializeRequest: (arg) => {
        const request = createExportTraceServiceRequest(arg);
        return traceRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return traceResponseType.decode(arg);
    },
};
//# sourceMappingURL=trace.js.map