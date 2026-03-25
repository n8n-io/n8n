"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    formatVariantSelector: function() {
        return formatVariantSelector;
    },
    eliminateIrrelevantSelectors: function() {
        return eliminateIrrelevantSelectors;
    },
    finalizeSelector: function() {
        return finalizeSelector;
    },
    handleMergePseudo: function() {
        return handleMergePseudo;
    }
});
const _postcssselectorparser = /*#__PURE__*/ _interop_require_default(require("postcss-selector-parser"));
const _unesc = /*#__PURE__*/ _interop_require_default(require("postcss-selector-parser/dist/util/unesc"));
const _escapeClassName = /*#__PURE__*/ _interop_require_default(require("../util/escapeClassName"));
const _prefixSelector = /*#__PURE__*/ _interop_require_default(require("../util/prefixSelector"));
const _pseudoElements = require("./pseudoElements");
const _splitAtTopLevelOnly = require("./splitAtTopLevelOnly");
function _interop_require_default(obj) {
    return obj && obj.__esModule ? obj : {
        default: obj
    };
}
/** @typedef {import('postcss-selector-parser').Root} Root */ /** @typedef {import('postcss-selector-parser').Selector} Selector */ /** @typedef {import('postcss-selector-parser').Pseudo} Pseudo */ /** @typedef {import('postcss-selector-parser').Node} Node */ /** @typedef {{format: string, respectPrefix: boolean}[]} RawFormats */ /** @typedef {import('postcss-selector-parser').Root} ParsedFormats */ /** @typedef {RawFormats | ParsedFormats} AcceptedFormats */ let MERGE = ":merge";
function formatVariantSelector(formats, { context , candidate  }) {
    var _context_tailwindConfig_prefix;
    let prefix = (_context_tailwindConfig_prefix = context === null || context === void 0 ? void 0 : context.tailwindConfig.prefix) !== null && _context_tailwindConfig_prefix !== void 0 ? _context_tailwindConfig_prefix : "";
    // Parse the format selector into an AST
    let parsedFormats = formats.map((format)=>{
        let ast = (0, _postcssselectorparser.default)().astSync(format.format);
        return {
            ...format,
            ast: format.respectPrefix ? (0, _prefixSelector.default)(prefix, ast) : ast
        };
    });
    // We start with the candidate selector
    let formatAst = _postcssselectorparser.default.root({
        nodes: [
            _postcssselectorparser.default.selector({
                nodes: [
                    _postcssselectorparser.default.className({
                        value: (0, _escapeClassName.default)(candidate)
                    })
                ]
            })
        ]
    });
    // And iteratively merge each format selector into the candidate selector
    for (let { ast  } of parsedFormats){
        [formatAst, ast] = handleMergePseudo(formatAst, ast);
        // 2. Merge the format selector into the current selector AST
        ast.walkNesting((nesting)=>nesting.replaceWith(...formatAst.nodes[0].nodes));
        // 3. Keep going!
        formatAst = ast;
    }
    return formatAst;
}
/**
 * Given any node in a selector this gets the "simple" selector it's a part of
 * A simple selector is just a list of nodes without any combinators
 * Technically :is(), :not(), :has(), etc… can have combinators but those are nested
 * inside the relevant node and won't be picked up so they're fine to ignore
 *
 * @param {Node} node
 * @returns {Node[]}
 **/ function simpleSelectorForNode(node) {
    /** @type {Node[]} */ let nodes = [];
    // Walk backwards until we hit a combinator node (or the start)
    while(node.prev() && node.prev().type !== "combinator"){
        node = node.prev();
    }
    // Now record all non-combinator nodes until we hit one (or the end)
    while(node && node.type !== "combinator"){
        nodes.push(node);
        node = node.next();
    }
    return nodes;
}
/**
 * Resorts the nodes in a selector to ensure they're in the correct order
 * Tags go before classes, and pseudo classes go after classes
 *
 * @param {Selector} sel
 * @returns {Selector}
 **/ function resortSelector(sel) {
    sel.sort((a, b)=>{
        if (a.type === "tag" && b.type === "class") {
            return -1;
        } else if (a.type === "class" && b.type === "tag") {
            return 1;
        } else if (a.type === "class" && b.type === "pseudo" && b.value.startsWith("::")) {
            return -1;
        } else if (a.type === "pseudo" && a.value.startsWith("::") && b.type === "class") {
            return 1;
        }
        return sel.index(a) - sel.index(b);
    });
    return sel;
}
function eliminateIrrelevantSelectors(sel, base) {
    let hasClassesMatchingCandidate = false;
    sel.walk((child)=>{
        if (child.type === "class" && child.value === base) {
            hasClassesMatchingCandidate = true;
            return false // Stop walking
            ;
        }
    });
    if (!hasClassesMatchingCandidate) {
        sel.remove();
    }
// We do NOT recursively eliminate sub selectors that don't have the base class
// as this is NOT a safe operation. For example, if we have:
// `.space-x-2 > :not([hidden]) ~ :not([hidden])`
// We cannot remove the [hidden] from the :not() because it would change the
// meaning of the selector.
// TODO: Can we do this for :matches, :is, and :where?
}
function finalizeSelector(current, formats, { context , candidate , base  }) {
    var _context_tailwindConfig;
    var _context_tailwindConfig_separator;
    let separator = (_context_tailwindConfig_separator = context === null || context === void 0 ? void 0 : (_context_tailwindConfig = context.tailwindConfig) === null || _context_tailwindConfig === void 0 ? void 0 : _context_tailwindConfig.separator) !== null && _context_tailwindConfig_separator !== void 0 ? _context_tailwindConfig_separator : ":";
    // Split by the separator, but ignore the separator inside square brackets:
    //
    // E.g.: dark:lg:hover:[paint-order:markers]
    //           ┬  ┬     ┬            ┬
    //           │  │     │            ╰── We will not split here
    //           ╰──┴─────┴─────────────── We will split here
    //
    base = base !== null && base !== void 0 ? base : (0, _splitAtTopLevelOnly.splitAtTopLevelOnly)(candidate, separator).pop();
    // Parse the selector into an AST
    let selector = (0, _postcssselectorparser.default)().astSync(current);
    // Normalize escaped classes, e.g.:
    //
    // The idea would be to replace the escaped `base` in the selector with the
    // `format`. However, in css you can escape the same selector in a few
    // different ways. This would result in different strings and therefore we
    // can't replace it properly.
    //
    //               base: bg-[rgb(255,0,0)]
    //   base in selector: bg-\\[rgb\\(255\\,0\\,0\\)\\]
    //       escaped base: bg-\\[rgb\\(255\\2c 0\\2c 0\\)\\]
    //
    selector.walkClasses((node)=>{
        if (node.raws && node.value.includes(base)) {
            node.raws.value = (0, _escapeClassName.default)((0, _unesc.default)(node.raws.value));
        }
    });
    // Remove extraneous selectors that do not include the base candidate
    selector.each((sel)=>eliminateIrrelevantSelectors(sel, base));
    // If ffter eliminating irrelevant selectors, we end up with nothing
    // Then the whole "rule" this is associated with does not need to exist
    // We use `null` as a marker value for that case
    if (selector.length === 0) {
        return null;
    }
    // If there are no formats that means there were no variants added to the candidate
    // so we can just return the selector as-is
    let formatAst = Array.isArray(formats) ? formatVariantSelector(formats, {
        context,
        candidate
    }) : formats;
    if (formatAst === null) {
        return selector.toString();
    }
    let simpleStart = _postcssselectorparser.default.comment({
        value: "/*__simple__*/"
    });
    let simpleEnd = _postcssselectorparser.default.comment({
        value: "/*__simple__*/"
    });
    // We can safely replace the escaped base now, since the `base` section is
    // now in a normalized escaped value.
    selector.walkClasses((node)=>{
        if (node.value !== base) {
            return;
        }
        let parent = node.parent;
        let formatNodes = formatAst.nodes[0].nodes;
        // Perf optimization: if the parent is a single class we can just replace it and be done
        if (parent.nodes.length === 1) {
            node.replaceWith(...formatNodes);
            return;
        }
        let simpleSelector = simpleSelectorForNode(node);
        parent.insertBefore(simpleSelector[0], simpleStart);
        parent.insertAfter(simpleSelector[simpleSelector.length - 1], simpleEnd);
        for (let child of formatNodes){
            parent.insertBefore(simpleSelector[0], child.clone());
        }
        node.remove();
        // Re-sort the simple selector to ensure it's in the correct order
        simpleSelector = simpleSelectorForNode(simpleStart);
        let firstNode = parent.index(simpleStart);
        parent.nodes.splice(firstNode, simpleSelector.length, ...resortSelector(_postcssselectorparser.default.selector({
            nodes: simpleSelector
        })).nodes);
        simpleStart.remove();
        simpleEnd.remove();
    });
    // Remove unnecessary pseudo selectors that we used as placeholders
    selector.walkPseudos((p)=>{
        if (p.value === MERGE) {
            p.replaceWith(p.nodes);
        }
    });
    // Move pseudo elements to the end of the selector (if necessary)
    selector.each((sel)=>(0, _pseudoElements.movePseudos)(sel));
    return selector.toString();
}
function handleMergePseudo(selector, format) {
    /** @type {{pseudo: Pseudo, value: string}[]} */ let merges = [];
    // Find all :merge() pseudo-classes in `selector`
    selector.walkPseudos((pseudo)=>{
        if (pseudo.value === MERGE) {
            merges.push({
                pseudo,
                value: pseudo.nodes[0].toString()
            });
        }
    });
    // Find all :merge() "attachments" in `format` and attach them to the matching selector in `selector`
    format.walkPseudos((pseudo)=>{
        if (pseudo.value !== MERGE) {
            return;
        }
        let value = pseudo.nodes[0].toString();
        // Does `selector` contain a :merge() pseudo-class with the same value?
        let existing = merges.find((merge)=>merge.value === value);
        // Nope so there's nothing to do
        if (!existing) {
            return;
        }
        // Everything after `:merge()` up to the next combinator is what is attached to the merged selector
        let attachments = [];
        let next = pseudo.next();
        while(next && next.type !== "combinator"){
            attachments.push(next);
            next = next.next();
        }
        let combinator = next;
        existing.pseudo.parent.insertAfter(existing.pseudo, _postcssselectorparser.default.selector({
            nodes: attachments.map((node)=>node.clone())
        }));
        pseudo.remove();
        attachments.forEach((node)=>node.remove());
        // What about this case:
        // :merge(.group):focus > &
        // :merge(.group):hover &
        if (combinator && combinator.type === "combinator") {
            combinator.remove();
        }
    });
    return [
        selector,
        format
    ];
}
