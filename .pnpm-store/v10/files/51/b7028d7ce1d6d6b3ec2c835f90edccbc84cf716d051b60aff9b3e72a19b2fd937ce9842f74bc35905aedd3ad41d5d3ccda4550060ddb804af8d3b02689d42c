"use strict";
// Copyright 2021 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.assert = exports.wrapperTypes = exports.getFullyQualifiedTypeName = void 0;
function getFullyQualifiedTypeName(type) {
    // We assume that the protobuf package tree cannot have cycles.
    let fullyQualifiedTypeName = '';
    while (type.parent) {
        fullyQualifiedTypeName = `.${type.name}${fullyQualifiedTypeName}`;
        type = type.parent;
    }
    return fullyQualifiedTypeName;
}
exports.getFullyQualifiedTypeName = getFullyQualifiedTypeName;
exports.wrapperTypes = new Set([
    '.google.protobuf.DoubleValue',
    '.google.protobuf.FloatValue',
    '.google.protobuf.Int64Value',
    '.google.protobuf.UInt64Value',
    '.google.protobuf.Int32Value',
    '.google.protobuf.UInt32Value',
    '.google.protobuf.BoolValue',
    '.google.protobuf.StringValue',
    '.google.protobuf.BytesValue',
]);
function assert(assertion, message) {
    if (!assertion) {
        throw new Error(message);
    }
}
exports.assert = assert;
//# sourceMappingURL=util.js.map