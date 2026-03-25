"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheDefaultValue = void 0;
// when no manifest exists, the default is calculated.  This may throw, so we need to catch it
const cacheDefaultValue = async (flagOrArg, respectNoCacheDefault) => {
    if (respectNoCacheDefault && flagOrArg.noCacheDefault)
        return;
    // Prefer the defaultHelp function (returns a friendly string for complex types)
    if (typeof flagOrArg.defaultHelp === 'function') {
        try {
            return await flagOrArg.defaultHelp({ flags: {}, options: flagOrArg });
        }
        catch {
            return;
        }
    }
    // if not specified, try the default function
    if (typeof flagOrArg.default === 'function') {
        try {
            return await flagOrArg.default({ flags: {}, options: flagOrArg });
        }
        catch { }
    }
    else {
        return flagOrArg.default;
    }
};
exports.cacheDefaultValue = cacheDefaultValue;
