/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
import { ValueType, diag, } from '@opentelemetry/api';
import { equalsCaseInsensitive } from './utils';
export function createInstrumentDescriptor(name, type, options) {
    if (!isValidName(name)) {
        diag.warn(`Invalid metric name: "${name}". The metric name should be a ASCII string with a length no greater than 255 characters.`);
    }
    return {
        name,
        type,
        description: options?.description ?? '',
        unit: options?.unit ?? '',
        valueType: options?.valueType ?? ValueType.DOUBLE,
        advice: options?.advice ?? {},
    };
}
export function createInstrumentDescriptorWithView(view, instrument) {
    return {
        name: view.name ?? instrument.name,
        description: view.description ?? instrument.description,
        type: instrument.type,
        unit: instrument.unit,
        valueType: instrument.valueType,
        advice: instrument.advice,
    };
}
export function isDescriptorCompatibleWith(descriptor, otherDescriptor) {
    // Names are case-insensitive strings.
    return (equalsCaseInsensitive(descriptor.name, otherDescriptor.name) &&
        descriptor.unit === otherDescriptor.unit &&
        descriptor.type === otherDescriptor.type &&
        descriptor.valueType === otherDescriptor.valueType);
}
// ASCII string with a length no greater than 255 characters.
// NB: the first character counted separately from the rest.
const NAME_REGEXP = /^[a-z][a-z0-9_.\-/]{0,254}$/i;
export function isValidName(name) {
    return NAME_REGEXP.test(name);
}
//# sourceMappingURL=InstrumentDescriptor.js.map