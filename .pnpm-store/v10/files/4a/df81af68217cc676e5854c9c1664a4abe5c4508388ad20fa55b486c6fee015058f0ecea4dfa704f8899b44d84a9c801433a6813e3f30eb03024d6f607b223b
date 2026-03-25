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
exports.resolveEnumValueToNumber = exports.resolveEnumValueToString = void 0;
function resolveEnumValueToString(enumType, enumValue) {
    // for unknown enum values, do not fail and try to do the best we could.
    // protobuf.js fromObject() will likely ignore unknown values, but at least
    // we won't fail.
    if (typeof enumValue === 'number') {
        const value = enumType.valuesById[enumValue];
        if (typeof value === 'undefined') {
            // unknown value, cannot convert to string, returning number as is
            return enumValue;
        }
        return value;
    }
    if (typeof enumValue === 'string') {
        // for strings, just accept what we got
        return enumValue;
    }
    throw new Error('resolveEnumValueToString: enum value must be a string or a number');
}
exports.resolveEnumValueToString = resolveEnumValueToString;
function resolveEnumValueToNumber(enumType, enumValue) {
    if (typeof enumValue === 'number') {
        // return as is
        return enumValue;
    }
    if (typeof enumValue === 'string') {
        const num = enumType.values[enumValue];
        if (typeof num === 'undefined') {
            // unknown value, cannot convert to number, returning string as is
            return enumValue;
        }
        return num;
    }
    throw new Error('resolveEnumValueToNumber: enum value must be a string or a number');
}
exports.resolveEnumValueToNumber = resolveEnumValueToNumber;
//# sourceMappingURL=enum.js.map