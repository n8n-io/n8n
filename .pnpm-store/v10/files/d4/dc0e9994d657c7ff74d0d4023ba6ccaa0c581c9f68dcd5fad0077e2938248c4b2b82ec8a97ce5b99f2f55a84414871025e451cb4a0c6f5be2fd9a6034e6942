"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeArgs = normalizeArgs;
const options_js_1 = require("./options.js");
/**
 * Normalizes the given arguments, accounting for optional args.
 */
function normalizeArgs(_args) {
    let path;
    let schema;
    let options;
    let callback;
    const args = Array.prototype.slice.call(_args);
    if (typeof args[args.length - 1] === "function") {
        // The last parameter is a callback function
        callback = args.pop();
    }
    if (typeof args[0] === "string") {
        // The first parameter is the path
        path = args[0];
        if (typeof args[2] === "object") {
            // The second parameter is the schema, and the third parameter is the options
            schema = args[1];
            options = args[2];
        }
        else {
            // The second parameter is the options
            schema = undefined;
            options = args[1];
        }
    }
    else {
        // The first parameter is the schema
        path = "";
        schema = args[0];
        options = args[1];
    }
    try {
        options = (0, options_js_1.getNewOptions)(options);
    }
    catch (e) {
        console.error(`JSON Schema Ref Parser: Error normalizing options: ${e}`);
    }
    if (!options.mutateInputSchema && typeof schema === "object") {
        // Make a deep clone of the schema, so that we don't alter the original object
        schema = JSON.parse(JSON.stringify(schema));
    }
    return {
        path,
        schema,
        options,
        callback,
    };
}
exports.default = normalizeArgs;
