/** @typedef {import('postcss-selector-parser').Root} Root */ /** @typedef {import('postcss-selector-parser').Selector} Selector */ /** @typedef {import('postcss-selector-parser').Pseudo} Pseudo */ /** @typedef {import('postcss-selector-parser').Node} Node */ // There are some pseudo-elements that may or may not be:
// **Actionable**
// Zero or more user-action pseudo-classes may be attached to the pseudo-element itself
// structural-pseudo-classes are NOT allowed but we don't make
// The spec is not clear on whether this is allowed or not — but in practice it is.
// **Terminal**
// It MUST be placed at the end of a selector
//
// This is the required in the spec. However, some pseudo elements are not "terminal" because
// they represent a "boundary piercing" that is compiled out by a build step.
// **Jumpable**
// Any terminal element may "jump" over combinators when moving to the end of the selector
//
// This is a backwards-compat quirk of pseudo element variants from earlier versions of Tailwind CSS.
/** @typedef {'terminal' | 'actionable' | 'jumpable'} PseudoProperty */ /** @type {Record<string, PseudoProperty[]>} */ "use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "movePseudos", {
    enumerable: true,
    get: function() {
        return movePseudos;
    }
});
let elementProperties = {
    // Pseudo elements from the spec
    "::after": [
        "terminal",
        "jumpable"
    ],
    "::backdrop": [
        "terminal",
        "jumpable"
    ],
    "::before": [
        "terminal",
        "jumpable"
    ],
    "::cue": [
        "terminal"
    ],
    "::cue-region": [
        "terminal"
    ],
    "::first-letter": [
        "terminal",
        "jumpable"
    ],
    "::first-line": [
        "terminal",
        "jumpable"
    ],
    "::grammar-error": [
        "terminal"
    ],
    "::marker": [
        "terminal",
        "jumpable"
    ],
    "::part": [
        "terminal",
        "actionable"
    ],
    "::placeholder": [
        "terminal",
        "jumpable"
    ],
    "::selection": [
        "terminal",
        "jumpable"
    ],
    "::slotted": [
        "terminal"
    ],
    "::spelling-error": [
        "terminal"
    ],
    "::target-text": [
        "terminal"
    ],
    // Pseudo elements from the spec with special rules
    "::file-selector-button": [
        "terminal",
        "actionable"
    ],
    // Library-specific pseudo elements used by component libraries
    // These are Shadow DOM-like
    "::deep": [
        "actionable"
    ],
    "::v-deep": [
        "actionable"
    ],
    "::ng-deep": [
        "actionable"
    ],
    // Note: As a rule, double colons (::) should be used instead of a single colon
    // (:). This distinguishes pseudo-classes from pseudo-elements. However, since
    // this distinction was not present in older versions of the W3C spec, most
    // browsers support both syntaxes for the original pseudo-elements.
    ":after": [
        "terminal",
        "jumpable"
    ],
    ":before": [
        "terminal",
        "jumpable"
    ],
    ":first-letter": [
        "terminal",
        "jumpable"
    ],
    ":first-line": [
        "terminal",
        "jumpable"
    ],
    ":where": [],
    ":is": [],
    ":has": [],
    // The default value is used when the pseudo-element is not recognized
    // Because it's not recognized, we don't know if it's terminal or not
    // So we assume it can be moved AND can have user-action pseudo classes attached to it
    __default__: [
        "terminal",
        "actionable"
    ]
};
function movePseudos(sel) {
    let [pseudos] = movablePseudos(sel);
    // Remove all pseudo elements from their respective selectors
    pseudos.forEach(([sel, pseudo])=>sel.removeChild(pseudo));
    // Re-add them to the end of the selector in the correct order.
    // This moves terminal pseudo elements to the end of the
    // selector otherwise the selector will not be valid.
    //
    // Examples:
    //  - `before:hover:text-center` would result in `.before\:hover\:text-center:hover::before`
    //  - `hover:before:text-center` would result in `.hover\:before\:text-center:hover::before`
    //
    // The selector `::before:hover` does not work but we
    // can make it work for you by flipping the order.
    sel.nodes.push(...pseudos.map(([, pseudo])=>pseudo));
    return sel;
}
/** @typedef {[sel: Selector, pseudo: Pseudo, attachedTo: Pseudo | null]} MovablePseudo */ /** @typedef {[pseudos: MovablePseudo[], lastSeenElement: Pseudo | null]} MovablePseudosResult */ /**
 * @param {Selector} sel
 * @returns {MovablePseudosResult}
 */ function movablePseudos(sel) {
    /** @type {MovablePseudo[]} */ let buffer = [];
    /** @type {Pseudo | null} */ let lastSeenElement = null;
    for (let node of sel.nodes){
        if (node.type === "combinator") {
            buffer = buffer.filter(([, node])=>propertiesForPseudo(node).includes("jumpable"));
            lastSeenElement = null;
        } else if (node.type === "pseudo") {
            if (isMovablePseudoElement(node)) {
                lastSeenElement = node;
                buffer.push([
                    sel,
                    node,
                    null
                ]);
            } else if (lastSeenElement && isAttachablePseudoClass(node, lastSeenElement)) {
                buffer.push([
                    sel,
                    node,
                    lastSeenElement
                ]);
            } else {
                lastSeenElement = null;
            }
            var _node_nodes;
            for (let sub of (_node_nodes = node.nodes) !== null && _node_nodes !== void 0 ? _node_nodes : []){
                let [movable, lastSeenElementInSub] = movablePseudos(sub);
                lastSeenElement = lastSeenElementInSub || lastSeenElement;
                buffer.push(...movable);
            }
        }
    }
    return [
        buffer,
        lastSeenElement
    ];
}
/**
 * @param {Node} node
 * @returns {boolean}
 */ function isPseudoElement(node) {
    return node.value.startsWith("::") || elementProperties[node.value] !== undefined;
}
/**
 * @param {Node} node
 * @returns {boolean}
 */ function isMovablePseudoElement(node) {
    return isPseudoElement(node) && propertiesForPseudo(node).includes("terminal");
}
/**
 * @param {Node} node
 * @param {Pseudo} pseudo
 * @returns {boolean}
 */ function isAttachablePseudoClass(node, pseudo) {
    if (node.type !== "pseudo") return false;
    if (isPseudoElement(node)) return false;
    return propertiesForPseudo(pseudo).includes("actionable");
}
/**
 * @param {Pseudo} pseudo
 * @returns {PseudoProperty[]}
 */ function propertiesForPseudo(pseudo) {
    var _elementProperties_pseudo_value;
    return (_elementProperties_pseudo_value = elementProperties[pseudo.value]) !== null && _elementProperties_pseudo_value !== void 0 ? _elementProperties_pseudo_value : elementProperties.__default__;
}
