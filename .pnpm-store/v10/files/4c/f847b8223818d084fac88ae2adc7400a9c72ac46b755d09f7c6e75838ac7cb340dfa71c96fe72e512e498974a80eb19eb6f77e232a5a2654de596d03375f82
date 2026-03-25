"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.create = create;
// ./pkg/orchestrion_js.js has a side effect of loading the wasm binary. 
// We only want that if the library is actually used!
var cachedCreate;
/**
 * Create a new instrumentation matcher from an array of instrumentation configs.
 */
function create(configs, dc_module) {
    if (!cachedCreate) {
        cachedCreate = require('./pkg/orchestrion_js.js').create;
    }
    if (cachedCreate === undefined) {
        throw new Error("Failed to load '@apm-js-collab/code-transformer'");
    }
    return cachedCreate(configs, dc_module);
}
