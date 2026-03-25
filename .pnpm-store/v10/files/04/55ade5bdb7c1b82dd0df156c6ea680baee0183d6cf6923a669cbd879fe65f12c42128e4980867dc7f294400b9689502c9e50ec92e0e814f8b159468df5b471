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
exports.bytesFromProto3JSON = exports.bytesToProto3JSON = void 0;
function bytesToProto3JSON(obj) {
    if (Buffer.isBuffer(obj)) {
        return obj.toString('base64');
    }
    else {
        return Buffer.from(obj.buffer, 0, obj.byteLength).toString('base64');
    }
}
exports.bytesToProto3JSON = bytesToProto3JSON;
function bytesFromProto3JSON(json) {
    return Buffer.from(json, 'base64');
}
exports.bytesFromProto3JSON = bytesFromProto3JSON;
//# sourceMappingURL=bytes.js.map