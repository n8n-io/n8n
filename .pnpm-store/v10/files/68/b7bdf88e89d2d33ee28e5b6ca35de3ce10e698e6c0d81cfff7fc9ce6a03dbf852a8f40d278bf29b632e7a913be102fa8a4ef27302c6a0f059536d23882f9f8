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
import { createContextKey } from '@opentelemetry/api';
const RPC_METADATA_KEY = createContextKey('OpenTelemetry SDK Context Key RPC_METADATA');
export var RPCType;
(function (RPCType) {
    RPCType["HTTP"] = "http";
})(RPCType || (RPCType = {}));
export function setRPCMetadata(context, meta) {
    return context.setValue(RPC_METADATA_KEY, meta);
}
export function deleteRPCMetadata(context) {
    return context.deleteValue(RPC_METADATA_KEY);
}
export function getRPCMetadata(context) {
    return context.getValue(RPC_METADATA_KEY);
}
//# sourceMappingURL=rpc-metadata.js.map