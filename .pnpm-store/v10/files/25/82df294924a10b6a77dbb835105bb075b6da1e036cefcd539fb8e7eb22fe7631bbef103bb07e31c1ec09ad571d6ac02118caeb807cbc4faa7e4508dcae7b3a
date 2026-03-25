"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.preparePayload = preparePayload;
const omit_js_1 = require("../../utils/omit.js");
function preparePayload(args) {
    return "data" in args
        ? args
        : {
            ...(0, omit_js_1.omit)(args, "inputs"),
            data: args.inputs,
        };
}
