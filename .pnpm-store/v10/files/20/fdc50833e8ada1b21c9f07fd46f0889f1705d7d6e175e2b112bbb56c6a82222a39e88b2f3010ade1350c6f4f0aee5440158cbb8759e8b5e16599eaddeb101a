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
exports.isValidName = exports.isDescriptorCompatibleWith = exports.createInstrumentDescriptorWithView = exports.createInstrumentDescriptor = void 0;
const api_1 = require("@opentelemetry/api");
const utils_1 = require("./utils");
function createInstrumentDescriptor(name, type, options) {
    if (!isValidName(name)) {
        api_1.diag.warn(`Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`);
    }
    return {
        name,
        type,
        description: options?.description ?? '',
        unit: options?.unit ?? '',
        valueType: options?.valueType ?? api_1.ValueType.DOUBLE,
        advice: options?.advice ?? {},
    };
}
exports.createInstrumentDescriptor = createInstrumentDescriptor;
function createInstrumentDescriptorWithView(view, instrument) {
    return {
        name: view.name ?? instrument.name,
        description: view.description ?? instrument.description,
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