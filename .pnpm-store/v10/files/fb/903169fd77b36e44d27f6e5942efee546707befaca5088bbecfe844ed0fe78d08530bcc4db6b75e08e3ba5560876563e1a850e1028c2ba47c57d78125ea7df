// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { isDefined } from "@azure/core-util";
export function walk(v, fn) {
    var _a;
    const seen = new Set();
    const mutated = new Map();
    deepLazyApply(v);
    for (const value of mutated.values()) {
        replaceChildren(value);
    }
    return (_a = mutated.get(v)) !== null && _a !== void 0 ? _a : v;
    function deepLazyApply(value) {
        var _a, _b;
        if (seen.has(value)) {
            return;
        }
        seen.add(value);
        const children = getChildren((_a = cachedApply(value)) !== null && _a !== void 0 ? _a : value);
        children === null || children === void 0 ? void 0 : children.forEach(deepLazyApply);
        if (children === null || children === void 0 ? void 0 : children.some((node) => mutated.has(node))) {
            mutated.set(value, (_b = mutated.get(value)) !== null && _b !== void 0 ? _b : shallowCopy(value));
        }
    }
    function cachedApply(value) {
        const cached = mutated.get(value);
        if (isDefined(cached)) {
            return cached;
        }
        const applied = fn(value);
        if (value !== applied) {
            mutated.set(value, applied);
        }
        return mutated.get(value);
    }
    function replaceChildren(applied) {
        if (!isComplex(applied)) {
            return;
        }
        else if (Array.isArray(applied)) {
            applied.forEach((e, i) => {
                var _a;
                applied[i] = (_a = mutated.get(e)) !== null && _a !== void 0 ? _a : e;
            });
        }
        else if (typeof applied === "object" && applied !== null) {
            Object.keys(applied).forEach((key) => {
                var _a;
                applied[key] = (_a = mutated.get(applied[key])) !== null && _a !== void 0 ? _a : applied[key];
            });
        }
    }
}
/**
 * Array inputs SHOULD not have both complex and non-complex elements. This function determines
 * whether an array is complex based solely on the first element.
 */
function isComplex(v) {
    return Array.isArray(v) ? isComplex(v[0]) : typeof v === "object" && v !== null;
}
function getChildren(v) {
    if (!isComplex(v)) {
        return;
    }
    if (Array.isArray(v)) {
        return v;
    }
    return Object.values(v);
}
function shallowCopy(value) {
    const maybeCopy = Array.isArray(value)
        ? value.map((v) => v)
        : typeof value === "object" && value !== null
            ? Object.assign({}, value) : value;
    return value === maybeCopy
        ? value
        : Object.setPrototypeOf(maybeCopy, Object.getPrototypeOf(value));
}
//# sourceMappingURL=walk.js.map