"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pick = pick;
/**
 * Return copy of object, only keeping allowlisted properties.
 */
function pick(o, props) {
    return Object.assign({}, ...props.map((prop) => {
        if (o[prop] !== undefined) {
            return { [prop]: o[prop] };
        }
    }));
}
