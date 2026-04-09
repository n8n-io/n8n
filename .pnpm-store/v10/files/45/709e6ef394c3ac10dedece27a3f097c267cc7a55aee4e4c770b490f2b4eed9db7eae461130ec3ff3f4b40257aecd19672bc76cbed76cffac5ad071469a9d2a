// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { isDefined } from "@azure/core-util";
export function walk(v, fn) {
    const seen = new Set();
    const mutated = new Map();
    deepLazyApply(v);
    for (const value of mutated.values()) {
        replaceChildren(value);
    }
    return mutated.get(v) ?? v;
    function deepLazyApply(value) {
        if (seen.has(value)) {
            return;
        }
        seen.add(value);
        const children = getChildren(cachedApply(value) ?? value);
        children?.forEach(deepLazyApply);
        if (children?.some((node) => mutated.has(node))) {
            mutated.set(value, mutated.get(value) ?? shallowCopy(value));
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
                applied[i] = mutated.get(e) ?? e;
            });
        }
        else if (typeof applied === "object" && applied !== null) {
            Object.keys(applied).forEach((key) => {
                applied[key] = mutated.get(applied[key]) ?? applied[key];
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
            ? { ...value }
            : value;
    return value === maybeCopy
        ? value
        : Object.setPrototypeOf(maybeCopy, Object.getPrototypeOf(value));
}
//# sourceMappingURL=walk.js.map