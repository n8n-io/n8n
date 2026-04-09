"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidName = exports.isDescriptorCompatibleWith = exports.createInstrumentDescriptorWithView = exports.createInstrumentDescriptor = exports.InstrumentType = void 0;
const api_1 = require("@opentelemetry/api");
const utils_1 = require("./utils");
/**
 * Supported types of metric instruments.
 */
var InstrumentType;
(function (InstrumentType) {
    InstrumentType["COUNTER"] = "COUNTER";
    InstrumentType["GAUGE"] = "GAUGE";
    InstrumentType["HISTOGRAM"] = "HISTOGRAM";
    InstrumentType["UP_DOWN_COUNTER"] = "UP_DOWN_COUNTER";
    InstrumentType["OBSERVABLE_COUNTER"] = "OBSERVABLE_COUNTER";
    InstrumentType["OBSERVABLE_GAUGE"] = "OBSERVABLE_GAUGE";
    InstrumentType["OBSERVABLE_UP_DOWN_COUNTER"] = "OBSERVABLE_UP_DOWN_COUNTER";
})(InstrumentType = exports.InstrumentType || (exports.InstrumentType = {}));
function createInstrumentDescriptor(name, type, options) {
    var _a, _b, _c, _d;
    if (!isValidName(name)) {
        api_1.diag.warn(`Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`);
    }
    return {
        name,
        type,
        description: (_a = options === null || options === void 0 ? void 0 : options.description) !== null && _a !== void 0 ? _a : '',
        unit: (_b = options === null || options === void 0 ? void 0 : options.unit) !== null && _b !== void 0 ? _b : '',
        valueType: (_c = options === null || options === void 0 ? void 0 : options.valueType) !== null && _c !== void 0 ? _c : api_1.ValueType.DOUBLE,
        advice: (_d = options === null || options === void 0 ? void 0 : options.advice) !== null && _d !== void 0 ? _d : {},
    };
}
exports.createInstrumentDescriptor = createInstrumentDescriptor;
function createInstrumentDescriptorWithView(view, instrument) {
    var _a, _b;
    return {
        name: (_a = view.name) !== null && _a !== void 0 ? _a : instrument.name,
        description: (_b = view.description) !== null && _b !== void 0 ? _b : instrument.description,
        type: instrument.type,
        unit: instrument.unit,
        valueType: instrument.valueType,
        advice: instrument.advice,
    };
}
exports.createInstrumentDescriptorWithView = createInstrumentDescriptorWithView;
function isDescriptorCompatibleWith(descriptor, otherDescriptor) {
    // Names are case-insensitive strings.
    return ((0, utils_1.equalsCaseInsensitive)(descriptor.name, otherDescriptor.name) &&
        descriptor.unit === otherDescriptor.unit &&
        descriptor.type === otherDescriptor.type &&
        descriptor.valueType === otherDescriptor.valueType);
}
exports.isDescriptorCompatibleWith = isDescriptorCompatibleWith;
// ASCII string with a length no greater than 255 characters.
// NB: the first character counted separately from the rest.
const NAME_REGEXP = /^[a-z][a-z0-9_.\-/]{0,254}$/i;
function isValidName(name) {
    return name.match(NAME_REGEXP) != null;
}
exports.isValidName = isValidName;
//# sourceMappingURL=InstrumentDescriptor.js.map