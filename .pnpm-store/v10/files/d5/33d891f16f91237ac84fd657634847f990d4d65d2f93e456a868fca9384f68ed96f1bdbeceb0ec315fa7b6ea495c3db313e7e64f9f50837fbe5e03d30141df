"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const t = __importStar(require("@babel/types"));
if (!(Array.isArray(t.TYPES) &&
    t.TYPES.every((t) => typeof t === 'string'))) {
    throw new Error('@babel/types TYPES does not match the expected type.');
}
const FLIPPED_ALIAS_KEYS = t
    .FLIPPED_ALIAS_KEYS;
const TYPES = new Set(t.TYPES);
if (!(FLIPPED_ALIAS_KEYS &&
    // tslint:disable-next-line: strict-type-predicates
    typeof FLIPPED_ALIAS_KEYS === 'object' &&
    Object.keys(FLIPPED_ALIAS_KEYS).every((key) => Array.isArray(FLIPPED_ALIAS_KEYS[key]) &&
        // tslint:disable-next-line: strict-type-predicates
        FLIPPED_ALIAS_KEYS[key].every((v) => typeof v === 'string')))) {
    throw new Error('@babel/types FLIPPED_ALIAS_KEYS does not match the expected type.');
}
/**
 * This serves thre functions:
 *
 * 1. Take any "aliases" and explode them to refecence the concrete types
 * 2. Normalize all handlers to have an `{enter, exit}` pair, rather than raw functions
 * 3. make the enter and exit handlers arrays, so that multiple handlers can be merged
 */
function explode(input) {
    const results = {};
    for (const key in input) {
        const aliases = FLIPPED_ALIAS_KEYS[key];
        if (aliases) {
            for (const concreteKey of aliases) {
                if (concreteKey in results) {
                    if (typeof input[key] === 'function') {
                        results[concreteKey].enter.push(input[key]);
                    }
                    else {
                        if (input[key].enter)
                            results[concreteKey].enter.push(input[key].enter);
                        if (input[key].exit)
                            results[concreteKey].exit.push(input[key].exit);
                    }
                }
                else {
                    if (typeof input[key] === 'function') {
                        results[concreteKey] = {
                            enter: [input[key]],
                            exit: [],
                        };
                    }
                    else {
                        results[concreteKey] = {
                            enter: input[key].enter ? [input[key].enter] : [],
                            exit: input[key].exit ? [input[key].exit] : [],
                        };
                    }
                }
            }
        }
        else if (TYPES.has(key)) {
            if (key in results) {
                if (typeof input[key] === 'function') {
                    results[key].enter.push(input[key]);
                }
                else {
                    if (input[key].enter)
                        results[key].enter.push(input[key].enter);
                    if (input[key].exit)
                        results[key].exit.push(input[key].exit);
                }
            }
            else {
                if (typeof input[key] === 'function') {
                    results[key] = {
                        enter: [input[key]],
                        exit: [],
                    };
                }
                else {
                    results[key] = {
                        enter: input[key].enter ? [input[key].enter] : [],
                        exit: input[key].exit ? [input[key].exit] : [],
                    };
                }
            }
        }
    }
    return results;
}
exports.default = explode;
//# sourceMappingURL=explode.js.map