"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    env: function() {
        return env;
    },
    contextMap: function() {
        return contextMap;
    },
    configContextMap: function() {
        return configContextMap;
    },
    contextSourcesMap: function() {
        return contextSourcesMap;
    },
    sourceHashMap: function() {
        return sourceHashMap;
    },
    NOT_ON_DEMAND: function() {
        return NOT_ON_DEMAND;
    },
    NONE: function() {
        return NONE;
    },
    resolveDebug: function() {
        return resolveDebug;
    }
});
const env = typeof process !== "undefined" ? {
    NODE_ENV: process.env.NODE_ENV,
    DEBUG: resolveDebug(process.env.DEBUG)
} : {
    NODE_ENV: "production",
    DEBUG: false
};
const contextMap = new Map();
const configContextMap = new Map();
const contextSourcesMap = new Map();
const sourceHashMap = new Map();
const NOT_ON_DEMAND = new String("*");
const NONE = Symbol("__NONE__");
function resolveDebug(debug) {
    if (debug === undefined) {
        return false;
    }
    // Environment variables are strings, so convert to boolean
    if (debug === "true" || debug === "1") {
        return true;
    }
    if (debug === "false" || debug === "0") {
        return false;
    }
    // Keep the debug convention into account:
    // DEBUG=* -> This enables all debug modes
    // DEBUG=projectA,projectB,projectC -> This enables debug for projectA, projectB and projectC
    // DEBUG=projectA:* -> This enables all debug modes for projectA (if you have sub-types)
    // DEBUG=projectA,-projectB -> This enables debug for projectA and explicitly disables it for projectB
    if (debug === "*") {
        return true;
    }
    let debuggers = debug.split(",").map((d)=>d.split(":")[0]);
    // Ignoring tailwindcss
    if (debuggers.includes("-tailwindcss")) {
        return false;
    }
    // Including tailwindcss
    if (debuggers.includes("tailwindcss")) {
        return true;
    }
    return false;
}
