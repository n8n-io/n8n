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
exports.fromProto3JSON = exports.fromProto3JSONToInternalRepresentation = void 0;
const any_1 = require("./any");
const bytes_1 = require("./bytes");
const enum_1 = require("./enum");
const value_1 = require("./value");
const util_1 = require("./util");
const duration_1 = require("./duration");
const timestamp_1 = require("./timestamp");
const wrappers_1 = require("./wrappers");
const fieldmask_1 = require("./fieldmask");
function fromProto3JSONToInternalRepresentation(type, json) {
    const fullyQualifiedTypeName = typeof type === 'string' ? type : (0, util_1.getFullyQualifiedTypeName)(type);
    if (typeof type !== 'string' && 'values' in type) {
        // type is an Enum
        if (fullyQualifiedTypeName === '.google.protobuf.NullValue') {
            return 'NULL_VALUE';
        }
        return (0, enum_1.resolveEnumValueToString)(type, json);
    }
    if (typeof type !== 'string') {
        type.resolveAll();
    }
    if (typeof type === 'string') {
        return json;
    }
    // Types that require special handling according to
    // https://developers.google.com/protocol-buffers/docs/proto3#json
    // Types that can have meaningful "null" value
    if (fullyQualifiedTypeName === '.google.protobuf.Value') {
        return (0, value_1.googleProtobufValueFromProto3JSON)(json);
    }
    if (util_1.wrapperTypes.has(fullyQualifiedTypeName)) {
        if ((json !== null && typeof json === 'object') || Array.isArray(json)) {
            throw new Error(`fromProto3JSONToInternalRepresentation: JSON representation for ${fullyQualifiedTypeName} expects a string, a number, or a boolean, but got ${typeof json}`);
        }
        return (0, wrappers_1.wrapperFromProto3JSON)(fullyQualifiedTypeName, json);
    }
    if (json === null) {
        return null;
    }
    // Types that cannot be "null"
    if (fullyQualifiedTypeName === '.google.protobuf.Any') {
        return (0, any_1.googleProtobufAnyFromProto3JSON)(type.root, json);
    }
    if (fullyQualifiedTypeName === '.google.protobuf.Struct') {
        if (typeof json !== 'object') {
            throw new Error(`fromProto3JSONToInternalRepresentation: google.protobuf.Struct must be an object but got ${typeof json}`);
        }
        if (Array.isArray(json)) {
            throw new Error('fromProto3JSONToInternalRepresentation: google.protobuf.Struct must be an object but got an array');
        }
        return (0, value_1.googleProtobufStructFromProto3JSON)(json);
    }
    if (fullyQualifiedTypeName === '.google.protobuf.ListValue') {
        if (!Array.isArray(json)) {
            throw new Error(`fromProto3JSONToInternalRepresentation: google.protobuf.ListValue must be an array but got ${typeof json}`);
        }
        return (0, value_1.googleProtobufListValueFromProto3JSON)(json);
    }
    if (fullyQualifiedTypeName === '.google.protobuf.Duration') {
        if (typeof json !== 'string') {
            throw new Error(`fromProto3JSONToInternalRepresentation: google.protobuf.Duration must be a string but got ${typeof json}`);
        }
        return (0, duration_1.googleProtobufDurationFromProto3JSON)(json);
    }
    if (fullyQualifiedTypeName === '.google.protobuf.Timestamp') {
        if (typeof json !== 'string') {
            throw new Error(`fromProto3JSONToInternalRepresentation: google.protobuf.Timestamp must be a string but got ${typeof json}`);
        }
        return (0, timestamp_1.googleProtobufTimestampFromProto3JSON)(json);
    }
    if (fullyQualifiedTypeName === '.google.protobuf.FieldMask') {
        if (typeof json !== 'string') {
            throw new Error(`fromProto3JSONToInternalRepresentation: google.protobuf.FieldMask must be a string but got ${typeof json}`);
        }
        return (0, fieldmask_1.googleProtobufFieldMaskFromProto3JSON)(json);
    }
    const result = {};
    for (const [key, value] of Object.entries(json)) {
        const field = type.fields[key];
        if (!field) {
            continue;
        }
        const resolvedType = field.resolvedType;
        const fieldType = field.type;
        if (field.repeated) {
            if (value === null) {
                result[key] = [];
            }
            else {
                if (!Array.isArray(value)) {
                    throw new Error(`fromProto3JSONToInternalRepresentation: expected an array for field ${key}`);
                }
                result[key] = value.map(element => fromProto3JSONToInternalRepresentation(resolvedType || fieldType, element));
            }
        }
        else if (field.map) {
            const map = {};
            for (const [mapKey, mapValue] of Object.entries(value)) {
                map[mapKey] = fromProto3JSONToInternalRepresentation(resolvedType || fieldType, mapValue);
            }
            result[key] = map;
        }
        else if (fieldType.match(/^(?:(?:(?:u?int|fixed)(?:32|64))|float|double)$/)) {
            if (typeof value !== 'number' && typeof value !== 'string') {
                throw new Error(`fromProto3JSONToInternalRepresentation: field ${key} of type ${field.type} cannot contain value ${value}`);
            }
            result[key] = value;
        }
        else if (fieldType === 'string') {
            if (typeof value !== 'string') {
                throw new Error(`fromProto3JSONToInternalRepresentation: field ${key} of type ${field.type} cannot contain value ${value}`);
            }
            result[key] = value;
        }
        else if (fieldType === 'bool') {
            if (typeof value !== 'boolean') {
                throw new Error(`fromProto3JSONToInternalRepresentation: field ${key} of type ${field.type} cannot contain value ${value}`);
            }
            result[key] = value;
        }
        else if (fieldType === 'bytes') {
            if (typeof value !== 'string') {
                throw new Error(`fromProto3JSONToInternalRepresentation: field ${key} of type ${field.type} cannot contain value ${value}`);
            }
            result[key] = (0, bytes_1.bytesFromProto3JSON)(value);
        }
        else {
            // Message type
            (0, util_1.assert)(resolvedType !== null, `Expected to be able to resolve type for field ${field.name}`);
            const deserializedValue = fromProto3JSONToInternalRepresentation(resolvedType, value);
            result[key] = deserializedValue;
        }
    }
    return result;
}
exports.fromProto3JSONToInternalRepresentation = fromProto3JSONToInternalRepresentation;
function fromProto3JSON(type, json) {
    const internalRepr = fromProto3JSONToInternalRepresentation(type, json);
    if (internalRepr === null) {
        return null;
    }
    // We only expect a real object here sine all special cases should be already resolved. Everything else is an internal error
    (0, util_1.assert)(typeof internalRepr === 'object' && !Array.isArray(internalRepr), `fromProto3JSON: expected an object, not ${json}`);
    return type.fromObject(internalRepr);
}
exports.fromProto3JSON = fromProto3JSON;
//# sourceMappingURL=fromproto3json.js.map