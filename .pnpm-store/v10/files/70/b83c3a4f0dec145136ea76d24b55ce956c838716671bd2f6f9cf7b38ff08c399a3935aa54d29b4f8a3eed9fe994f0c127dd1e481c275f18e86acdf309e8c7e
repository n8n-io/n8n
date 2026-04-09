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
        // For nesting, we only need to wrap a selector with :is() if it has a top-level combinator,
        // e.g. `.dark .text-white`, to be independent of DOM order. Any other selector, including
        // combinators inside of pseudos like `:where()`, are ok to nest.
        let shouldWrap = sel.nodes.some((node)=>node.type === "combinator");
        if (shouldWrap) {
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
