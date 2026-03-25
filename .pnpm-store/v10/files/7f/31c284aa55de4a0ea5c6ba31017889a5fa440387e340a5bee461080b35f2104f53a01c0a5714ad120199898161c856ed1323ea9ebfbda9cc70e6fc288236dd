"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filter = filter;
exports.checkIfMatchByStrategy = checkIfMatchByStrategy;
const ref_utils_1 = require("../../../ref-utils");
const utils_1 = require("../../../utils");
function filter(node, ctx, criteria) {
    const { parent, key } = ctx;
    let didDelete = false;
    if (Array.isArray(node)) {
        for (let i = 0; i < node.length; i++) {
            if ((0, ref_utils_1.isRef)(node[i])) {
                const resolved = ctx.resolve(node[i]);
                if (criteria(resolved.node)) {
                    node.splice(i, 1);
                    didDelete = true;
                    i--;
                }
            }
            if (criteria(node[i])) {
                node.splice(i, 1);
                didDelete = true;
                i--;
            }
        }
    }
    else if ((0, utils_1.isPlainObject)(node)) {
        for (const key of Object.keys(node)) {
            node = node;
            if ((0, ref_utils_1.isRef)(node[key])) {
                const resolved = ctx.resolve(node[key]);
                if (criteria(resolved.node)) {
                    delete node[key];
                    didDelete = true;
                }
            }
            if (criteria(node[key])) {
                delete node[key];
                didDelete = true;
            }
        }
    }
    if (didDelete && ((0, utils_1.isEmptyObject)(node) || (0, utils_1.isEmptyArray)(node))) {
        delete parent[key];
    }
}
function checkIfMatchByStrategy(nodeValue, decoratorValue, strategy) {
    if (nodeValue === undefined || decoratorValue === undefined) {
        return false;
    }
    if (!Array.isArray(decoratorValue) && !Array.isArray(nodeValue)) {
        return nodeValue === decoratorValue;
    }
    decoratorValue = toArrayIfNeeded(decoratorValue);
    nodeValue = toArrayIfNeeded(nodeValue);
    if (strategy === 'any') {
        return decoratorValue.some((item) => nodeValue.includes(item));
    }
    if (strategy === 'all') {
        return decoratorValue.every((item) => nodeValue.includes(item));
    }
    return false;
}
function toArrayIfNeeded(value) {
    return Array.isArray(value) ? value : [value];
}
