"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.replaceJSONPointers = replaceJSONPointers;
const JsonPointer = require('json-pointer');
function replaceJSONPointers(expression, context) {
    const jsonPointerReplacementRules = [
        {
            pattern: /\$response\.body#\/([\w/]+)/g,
            ctxFunction: (match, pointer) => {
                return resolvePointer(context.$response?.body, pointer, match);
            },
        },
        {
            pattern: /\$request\.body#\/([\w/]+)/g,
            ctxFunction: (match, pointer) => {
                return resolvePointer(context.$request?.body, pointer, match);
            },
        },
        {
            pattern: /\$outputs\.([\w-]+)#\/([\w/]+)/g,
            ctxFunction: (match, property, pointer) => {
                return resolvePointer(context.$outputs?.[property], pointer, match);
            },
        },
        {
            pattern: /\$workflows\.([\w-]+)\.outputs\.([\w-]+)#\/([\w/]+)/g,
            ctxFunction: (match, workflowId, property, pointer) => {
                return resolvePointer(context.$workflows?.[workflowId]?.outputs?.[property], pointer, match);
            },
        },
        {
            pattern: /\$steps\.([\w-]+)\.outputs\.([\w-]+)#\/([\w/]+)/g,
            ctxFunction: (match, stepId, property, pointer) => {
                return resolvePointer(context.$steps?.[stepId]?.outputs?.[property], pointer, match);
            },
        },
    ];
    let result = expression;
    for (const { pattern, ctxFunction } of jsonPointerReplacementRules) {
        result = result.replaceAll(pattern, ctxFunction);
    }
    return result;
}
function resolvePointer(sourceContext, pointer, fallbackMatch) {
    if (sourceContext) {
        try {
            const value = JsonPointer.get(sourceContext, `/${pointer}`);
            if (typeof value === 'string') {
                return JSON.stringify(value); // Safely quote the strings
            }
            if (Array.isArray(value) || typeof value === 'object') {
                return JSON.stringify(value);
            }
            return value !== undefined ? value : fallbackMatch;
        }
        catch (_error) {
            return fallbackMatch;
        }
    }
    return fallbackMatch;
}
//# sourceMappingURL=replace-json-pointers.js.map