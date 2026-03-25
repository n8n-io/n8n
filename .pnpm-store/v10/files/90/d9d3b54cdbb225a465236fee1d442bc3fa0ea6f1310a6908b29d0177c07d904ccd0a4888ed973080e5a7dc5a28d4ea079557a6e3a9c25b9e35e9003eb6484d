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
exports.toProto3JSON = void 0;
const any_1 = require("./any");
const bytes_1 = require("./bytes");
const util_1 = require("./util");
const enum_1 = require("./enum");
const value_1 = require("./value");
const duration_1 = require("./duration");
const timestamp_1 = require("./timestamp");
const wrappers_1 = require("./wrappers");
const fieldmask_1 = require("./fieldmask");
// Convert a single value, which might happen to be an instance of Long, to JSONValue
function convertSingleValue(value) {
    var _a;
    if (typeof value === 'object') {
        if (((_a = value === null || value === void 0 ? void 0 : value.constructor) === null || _a === void 0 ? void 0 : _a.name) === 'Long') {
            return value.toString();
        }
        throw new Error(`toProto3JSON: don't know how to convert value ${value}`);
    }
    return value;
}
function toProto3JSON(obj, options) {
    const objType = obj.$type;
    if (!objType) {
        throw new Error('Cannot serialize object to proto3 JSON since its .$type is unknown. Use Type.fromObject(obj) before calling toProto3JSON.');
    }
    objType.resolveAll();
    const typeName = (0, util_1.getFullyQualifiedTypeName)(objType);
    // Types that require special handling according to
    // https://developers.google.com/protocol-buffers/docs/proto3#json
    if (typeName === '.google.protobuf.Any') {
        return (0, any_1.googleProtobufAnyToProto3JSON)(obj, options);
    }
    if (typeName === '.google.protobuf.Value') {
        return (0, value_1.googleProtobufValueToProto3JSON)(obj);
    }
    if (typeName === '.google.protobuf.Struct') {
        return (0, value_1.googleProtobufStructToProto3JSON)(obj);
    }
    if (typeName === '.google.protobuf.ListValue') {
        return (0, value_1.googleProtobufListValueToProto3JSON)(obj);
    }
    if (typeName === '.google.protobuf.Duration') {
        return (0, duration_1.googleProtobufDurationToProto3JSON)(obj);
    }
    if (typeName === '.google.protobuf.Timestamp') {
        return (0, timestamp_1.googleProtobufTimestampToProto3JSON)(obj);
    }
    if (typeName === '.google.protobuf.FieldMask') {
        return (0, fieldmask_1.googleProtobufFieldMaskToProto3JSON)(obj);
    }
    if (util_1.wrapperTypes.has(typeName)) {
        return (0, wrappers_1.wrapperToProto3JSON)(obj);
    }
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
        const field = objType.fields[key];
        const fieldResolvedType = field.resolvedType;
        const fieldFullyQualifiedTypeName = fieldResolvedType
            ? (0, util_1.getFullyQualifiedTypeName)(fieldResolvedType)
            : null;
        if (value === null) {
            result[key] = null;
            continue;
        }
        if (Array.isArray(value)) {
            if (value.length === 0) {
                // ignore repeated fields with no values
                continue;
            }
            // if the repeated value has a complex type, convert it to proto3 JSON, otherwise use as is
            result[key] = value.map(fieldResolvedType
                ? element => {
                    return toProto3JSON(element, options);
                }
                : convertSingleValue);
            continue;
        }
        if (field.map) {
            const map = {};
            for (const [mapKey, mapValue] of Object.entries(value)) {
                // if the map value has a complex type, convert it to proto3 JSON, otherwise use as is
                map[mapKey] = fieldResolvedType
                    ? toProto3JSON(mapValue, options)
                    : convertSingleValue(mapValue);
            }
            result[key] = map;
            continue;
        }
        if (fieldFullyQualifiedTypeName === '.google.protobuf.NullValue') {
            result[key] = null;
            continue;
        }
        if (fieldResolvedType && 'values' in fieldResolvedType && value !== null) {
            if (options === null || options === void 0 ? void 0 : options.numericEnums) {
                result[key] = (0, enum_1.resolveEnumValueToNumber)(fieldResolvedType, value);
            }
            else {
                result[key] = (0, enum_1.resolveEnumValueToString)(fieldResolvedType, value);
            }
            continue;
        }
        if (fieldResolvedType) {
            result[key] = toProto3JSON(value, options);
            continue;
        }
        if (typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean' ||
            value === null) {
            if (typeof value === 'number' && !Number.isFinite(value)) {
                result[key] = value.toString();
                continue;
            }
            result[key] = value;
            continue;
        }
        if (Buffer.isBuffer(value) || value instanceof Uint8Array) {
            result[key] = (0, bytes_1.bytesToProto3JSON)(value);
            continue;
        }
        result[key] = convertSingleValue(value);
        continue;
    }
    return result;
}
exports.toProto3JSON = toProto3JSON;
//# sourceMappingURL=toproto3json.js.map