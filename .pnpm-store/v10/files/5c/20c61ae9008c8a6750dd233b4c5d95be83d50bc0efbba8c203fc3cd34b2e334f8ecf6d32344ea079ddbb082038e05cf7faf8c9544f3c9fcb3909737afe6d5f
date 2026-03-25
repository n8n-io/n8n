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
import { createExportLogsServiceRequest } from '../internal';
const logsResponseType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceResponse;
const logsRequestType = root.opentelemetry.proto.collector.logs.v1
    .ExportLogsServiceRequest;
/*
 * @experimental this serializer may receive breaking changes in minor versions, pin this package's version when using this constant
 */
export const ProtobufLogsSerializer = {
    serializeRequest: (arg) => {
        const request = createExportLogsServiceRequest(arg);
        return logsRequestType.encode(request).finish();
    },
    deserializeResponse: (arg) => {
        return logsResponseType.decode(arg);
    },
};
//# sourceMappingURL=logs.js.map