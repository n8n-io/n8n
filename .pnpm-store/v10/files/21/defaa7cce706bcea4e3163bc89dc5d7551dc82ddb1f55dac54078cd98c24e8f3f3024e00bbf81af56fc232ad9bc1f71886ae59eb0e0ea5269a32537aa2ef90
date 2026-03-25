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
exports.googleProtobufFieldMaskFromProto3JSON = exports.googleProtobufFieldMaskToProto3JSON = void 0;
function googleProtobufFieldMaskToProto3JSON(obj) {
    return obj.paths.join(',');
}
exports.googleProtobufFieldMaskToProto3JSON = googleProtobufFieldMaskToProto3JSON;
function googleProtobufFieldMaskFromProto3JSON(json) {
    return {
        paths: json.split(','),
    };
}
exports.googleProtobufFieldMaskFromProto3JSON = googleProtobufFieldMaskFromProto3JSON;
//# sourceMappingURL=fieldmask.js.map