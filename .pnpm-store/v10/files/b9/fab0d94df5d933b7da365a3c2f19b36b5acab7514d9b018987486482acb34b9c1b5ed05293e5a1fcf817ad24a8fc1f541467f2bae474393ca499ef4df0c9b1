"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.omit = omit;
const pick_js_1 = require("./pick.js");
const typedInclude_js_1 = require("./typedInclude.js");
/**
 * Return copy of object, omitting blocklisted array of props
 */
function omit(o, props) {
    const propsArr = Array.isArray(props) ? props : [props];
    const letsKeep = Object.keys(o).filter((prop) => !(0, typedInclude_js_1.typedInclude)(propsArr, prop));
    return (0, pick_js_1.pick)(o, letsKeep);
}
