/*
 * Copyright The OpenTelemetry Authors
 * SPDX-License-Identifier: Apache-2.0
 */
/**
 * Validates if a value is a valid AnyValue for Log Attributes according to OpenTelemetry spec.
 * Log Attributes support a superset of standard Attributes and must support:
 * - Scalar values: string, boolean, signed 64 bit integer, or double precision floating point
 * - Byte arrays (Uint8Array)
 * - Arrays of any values (heterogeneous arrays allowed)
 * - Maps from string to any value (nested objects)
 * - Empty values (null/undefined)
 *
 * @param val - The value to validate
 * @returns true if the value is a valid AnyValue, false otherwise
 */
export function isLogAttributeValue(val) {
    return isLogAttributeValueInternal(val, new WeakSet());
}
function isLogAttributeValueInternal(val, visited) {
    // null and undefined are explicitly allowed
    if (val == null) {
        return true;
    }
    // Scalar values
    if (typeof val === 'string' ||
        typeof val === 'number' ||
        typeof val === 'boolean') {
        return true;
    }
    // Byte arrays
    if (val instanceof Uint8Array) {
        return true;
    }
    // For objects and arrays, check for circular references
    if (typeof val === 'object') {
        if (visited.has(val)) {
            // Circular reference detected - reject it
            return false;
        }
        visited.add(val);
        // Arrays (can contain any AnyValue, including heterogeneous)
        if (Array.isArray(val)) {
            return val.every(item => isLogAttributeValueInternal(item, visited));
        }
        // Only accept plain objects (not built-in objects like Date, RegExp, Error, etc.)
        // Check if it's a plain object by verifying its constructor is Object or it has no constructor
        const obj = val;
        if (obj.constructor !== Object && obj.constructor !== undefined) {
            return false;
        }
        // Objects/Maps (including empty objects)
        // All object properties must be valid AnyValues
        return Object.values(obj).every(item => isLogAttributeValueInternal(item, visited));
    }
    return false;
}
//# sourceMappingURL=validation.js.map