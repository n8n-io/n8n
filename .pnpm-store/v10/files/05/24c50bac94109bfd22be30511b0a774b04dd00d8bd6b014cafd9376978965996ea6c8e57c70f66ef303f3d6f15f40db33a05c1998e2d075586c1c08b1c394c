"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "applyImportantSelector", {
    enumerable: true,
    get: function() {
        return applyImportantSelector;
    }
});
const _postcssselectorparser = /*#__PURE__*/ _interop_require_default(require("postcss-selector-parser"));
const _pseudoElements = require("./pseudoElements");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function applyImportantSelector(selector, important) {
    let sel = (0, _postcssselectorparser.default)().astSync(selector);
    sel.each((sel)=>{
        // Wrap with :is if it's not already wrapped
        let isWrapped = sel.nodes[0].type === "pseudo" && sel.nodes[0].value === ":is" && sel.nodes.every((node)=>node.type !== "combinator");
        if (!isWrapped) {
            sel.nodes = [
                _postcssselectorparser.default.pseudo({
                    value: ":is",
                    nodes: [
                        sel.clone()
                    ]
                })
            ];
        }
        (0, _pseudoElements.movePseudos)(sel);
    });
    return `${important} ${sel.toString()}`;
}
