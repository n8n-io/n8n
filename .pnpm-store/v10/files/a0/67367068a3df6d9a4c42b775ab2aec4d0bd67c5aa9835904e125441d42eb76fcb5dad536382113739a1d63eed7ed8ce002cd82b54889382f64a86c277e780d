"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupSelectors = exports.getDocumentRoot = void 0;
var positionals_js_1 = require("./positionals.js");
function getDocumentRoot(node) {
    while (node.parent)
        node = node.parent;
    return node;
}
exports.getDocumentRoot = getDocumentRoot;
function groupSelectors(selectors) {
    var filteredSelectors = [];
    var plainSelectors = [];
    for (var _i = 0, selectors_1 = selectors; _i < selectors_1.length; _i++) {
        var selector = selectors_1[_i];
        if (selector.some(positionals_js_1.isFilter)) {
            filteredSelectors.push(selector);
        }
        else {
            plainSelectors.push(selector);
        }
    }
    return [plainSelectors, filteredSelectors];
}
exports.groupSelectors = groupSelectors;
//# sourceMappingURL=helpers.js.map