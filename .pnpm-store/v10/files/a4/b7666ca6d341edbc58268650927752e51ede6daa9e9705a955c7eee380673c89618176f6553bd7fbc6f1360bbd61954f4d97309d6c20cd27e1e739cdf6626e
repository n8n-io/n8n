"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "nesting", {
    enumerable: true,
    get: function() {
        return nesting;
    }
});
const _postcss = /*#__PURE__*/ _interop_require_default(require("postcss"));
const _postcssnested = /*#__PURE__*/ _interop_require_default(require("postcss-nested"));
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
function nesting(opts = _postcssnested.default) {
    return (root, result)=>{
        root.walkAtRules("screen", (rule)=>{
            rule.name = "media";
            rule.params = `screen(${rule.params})`;
        });
        root.walkAtRules("apply", (rule)=>{
            rule.before(_postcss.default.decl({
                prop: "__apply",
                value: rule.params,
                source: rule.source
            }));
            rule.remove();
        });
        let plugin = (()=>{
            var _opts_hasOwnProperty;
            if (typeof opts === "function" || typeof opts === "object" && (opts === null || opts === void 0 ? void 0 : (_opts_hasOwnProperty = opts.hasOwnProperty) === null || _opts_hasOwnProperty === void 0 ? void 0 : _opts_hasOwnProperty.call(opts, "postcssPlugin"))) {
                return opts;
            }
            if (typeof opts === "string") {
                return require(opts);
            }
            if (Object.keys(opts).length <= 0) {
                return _postcssnested.default;
            }
            throw new Error("tailwindcss/nesting should be loaded with a nesting plugin.");
        })();
        (0, _postcss.default)([
            plugin
        ]).process(root, result.opts).sync();
        root.walkDecls("__apply", (decl)=>{
            decl.before(_postcss.default.atRule({
                name: "apply",
                params: decl.value,
                source: decl.source
            }));
            decl.remove();
        });
        /**
     * Use a private PostCSS API to remove the "clean" flag from the entire AST.
     * This is done because running process() on the AST will set the "clean"
     * flag on all nodes, which we don't want.
     *
     * This causes downstream plugins using the visitor API to be skipped.
     *
     * This is guarded because the PostCSS API is not public
     * and may change in future versions of PostCSS.
     *
     * See https://github.com/postcss/postcss/issues/1712 for more details
     *
     * @param {import('postcss').Node} node
     */ function markDirty(node) {
            if (!("markDirty" in node)) {
                return;
            }
            // Traverse the tree down to the leaf nodes
            if (node.nodes) {
                node.nodes.forEach((n)=>markDirty(n));
            }
            // If it's a leaf node mark it as dirty
            // We do this here because marking a node as dirty
            // will walk up the tree and mark all parents as dirty
            // resulting in a lot of unnecessary work if we did this
            // for every single node
            if (!node.nodes) {
                node.markDirty();
            }
        }
        markDirty(root);
        return root;
    };
}
