"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serialize = serialize;
/* eslint-disable */
// @ts-nocheck
const env_js_1 = require("../../utils/env.cjs");
var LIMIT_REPLACE_NODE = "[...]";
var CIRCULAR_REPLACE_NODE = { result: "[Circular]" };
var arr = [];
var replacerStack = [];
const encoder = new TextEncoder();
function defaultOptions() {
    return {
        depthLimit: Number.MAX_SAFE_INTEGER,
        edgesLimit: Number.MAX_SAFE_INTEGER,
    };
}
function encodeString(str) {
    return encoder.encode(str);
}
// Shared function to handle well-known types
function serializeWellKnownTypes(val) {
    if (val && typeof val === "object" && val !== null) {
        if (val instanceof Map) {
            return Object.fromEntries(val);
        }
        else if (val instanceof Set) {
            return Array.from(val);
        }
        else if (val instanceof Date) {
            return val.toISOString();
        }
        else if (val instanceof RegExp) {
            return val.toString();
        }
        else if (val instanceof Error) {
            return {
                name: val.name,
                message: val.message,
            };
        }
    }
    else if (typeof val === "bigint") {
        return val.toString();
    }
    return val;
}
// Default replacer function to handle well-known types
function createDefaultReplacer(userReplacer) {
    return function (key, val) {
        // Apply user replacer first if provided
        if (userReplacer) {
            const userResult = userReplacer.call(this, key, val);
            // If user replacer returned undefined, fall back to our serialization
            if (userResult !== undefined) {
                return userResult;
            }
        }
        // Fall back to our well-known type handling
        return serializeWellKnownTypes(val);
    };
}
// Regular stringify
function serialize(obj, errorContext, replacer, spacer, options) {
    try {
        const str = JSON.stringify(obj, createDefaultReplacer(replacer), spacer);
        return encodeString(str);
    }
    catch (e) {
        // Fall back to more complex stringify if circular reference
        if (!e.message?.includes("Converting circular structure to JSON")) {
            console.warn(`[WARNING]: LangSmith received unserializable value.${errorContext ? `\nContext: ${errorContext}` : ""}`);
            return encodeString("[Unserializable]");
        }
        (0, env_js_1.getLangSmithEnvironmentVariable)("SUPPRESS_CIRCULAR_JSON_WARNINGS") !==
            "true" &&
            console.warn(`[WARNING]: LangSmith received circular JSON. This will decrease tracer performance. ${errorContext ? `\nContext: ${errorContext}` : ""}`);
        if (typeof options === "undefined") {
            options = defaultOptions();
        }
        decirc(obj, "", 0, [], undefined, 0, options);
        let res;
        try {
            if (replacerStack.length === 0) {
                res = JSON.stringify(obj, replacer, spacer);
            }
            else {
                res = JSON.stringify(obj, replaceGetterValues(replacer), spacer);
            }
        }
        catch (_) {
            return encodeString("[unable to serialize, circular reference is too complex to analyze]");
        }
        finally {
            while (arr.length !== 0) {
                const part = arr.pop();
                if (part.length === 4) {
                    Object.defineProperty(part[0], part[1], part[3]);
                }
                else {
                    part[0][part[1]] = part[2];
                }
            }
        }
        return encodeString(res);
    }
}
function setReplace(replace, val, k, parent) {
    var propertyDescriptor = Object.getOwnPropertyDescriptor(parent, k);
    if (propertyDescriptor.get !== undefined) {
        if (propertyDescriptor.configurable) {
            Object.defineProperty(parent, k, { value: replace });
            arr.push([parent, k, val, propertyDescriptor]);
        }
        else {
            replacerStack.push([val, k, replace]);
        }
    }
    else {
        parent[k] = replace;
        arr.push([parent, k, val]);
    }
}
function decirc(val, k, edgeIndex, stack, parent, depth, options) {
    depth += 1;
    var i;
    if (typeof val === "object" && val !== null) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i] === val) {
                setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
                return;
            }
        }
        if (typeof options.depthLimit !== "undefined" &&
            depth > options.depthLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        if (typeof options.edgesLimit !== "undefined" &&
            edgeIndex + 1 > options.edgesLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        stack.push(val);
        // Optimize for Arrays. Big arrays could kill the performance otherwise!
        if (Array.isArray(val)) {
            for (i = 0; i < val.length; i++) {
                decirc(val[i], i, i, stack, val, depth, options);
            }
        }
        else {
            // Handle well-known types before Object.keys iteration
            val = serializeWellKnownTypes(val);
            var keys = Object.keys(val);
            for (i = 0; i < keys.length; i++) {
                var key = keys[i];
                decirc(val[key], key, i, stack, val, depth, options);
            }
        }
        stack.pop();
    }
}
// Stable-stringify
function compareFunction(a, b) {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
}
function deterministicStringify(obj, replacer, spacer, options) {
    if (typeof options === "undefined") {
        options = defaultOptions();
    }
    var tmp = deterministicDecirc(obj, "", 0, [], undefined, 0, options) || obj;
    var res;
    try {
        if (replacerStack.length === 0) {
            res = JSON.stringify(tmp, replacer, spacer);
        }
        else {
            res = JSON.stringify(tmp, replaceGetterValues(replacer), spacer);
        }
    }
    catch (_) {
        return JSON.stringify("[unable to serialize, circular reference is too complex to analyze]");
    }
    finally {
        // Ensure that we restore the object as it was.
        while (arr.length !== 0) {
            var part = arr.pop();
            if (part.length === 4) {
                Object.defineProperty(part[0], part[1], part[3]);
            }
            else {
                part[0][part[1]] = part[2];
            }
        }
    }
    return res;
}
function deterministicDecirc(val, k, edgeIndex, stack, parent, depth, options) {
    depth += 1;
    var i;
    if (typeof val === "object" && val !== null) {
        for (i = 0; i < stack.length; i++) {
            if (stack[i] === val) {
                setReplace(CIRCULAR_REPLACE_NODE, val, k, parent);
                return;
            }
        }
        try {
            if (typeof val.toJSON === "function") {
                return;
            }
        }
        catch (_) {
            return;
        }
        if (typeof options.depthLimit !== "undefined" &&
            depth > options.depthLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        if (typeof options.edgesLimit !== "undefined" &&
            edgeIndex + 1 > options.edgesLimit) {
            setReplace(LIMIT_REPLACE_NODE, val, k, parent);
            return;
        }
        stack.push(val);
        // Optimize for Arrays. Big arrays could kill the performance otherwise!
        if (Array.isArray(val)) {
            for (i = 0; i < val.length; i++) {
                deterministicDecirc(val[i], i, i, stack, val, depth, options);
            }
        }
        else {
            // Handle well-known types before Object.keys iteration
            val = serializeWellKnownTypes(val);
            // Create a temporary object in the required way
            var tmp = {};
            var keys = Object.keys(val).sort(compareFunction);
            for (i = 0; i < keys.length; i++) {
                var key = keys[i];
                deterministicDecirc(val[key], key, i, stack, val, depth, options);
                tmp[key] = val[key];
            }
            if (typeof parent !== "undefined") {
                arr.push([parent, k, val]);
                parent[k] = tmp;
            }
            else {
                return tmp;
            }
        }
        stack.pop();
    }
}
// wraps replacer function to handle values we couldn't replace
// and mark them as replaced value
function replaceGetterValues(replacer) {
    replacer =
        typeof replacer !== "undefined"
            ? replacer
            : function (k, v) {
                return v;
            };
    return function (key, val) {
        if (replacerStack.length > 0) {
            for (var i = 0; i < replacerStack.length; i++) {
                var part = replacerStack[i];
                if (part[1] === key && part[0] === val) {
                    val = part[2];
                    replacerStack.splice(i, 1);
                    break;
                }
            }
        }
        return replacer.call(this, key, val);
    };
}
