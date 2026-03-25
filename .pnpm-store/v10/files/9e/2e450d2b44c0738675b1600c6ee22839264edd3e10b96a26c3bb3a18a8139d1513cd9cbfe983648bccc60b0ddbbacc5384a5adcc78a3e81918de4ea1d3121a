"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "default", {
    enumerable: true,
    get: function() {
        return collapseAdjacentRules;
    }
});
let comparisonMap = {
    atrule: [
        "name",
        "params"
    ],
    rule: [
        "selector"
    ]
};
let types = new Set(Object.keys(comparisonMap));
function collapseAdjacentRules() {
    function collapseRulesIn(root) {
        let currentRule = null;
        root.each((node)=>{
            if (!types.has(node.type)) {
                currentRule = null;
                return;
            }
            if (currentRule === null) {
                currentRule = node;
                return;
            }
            let properties = comparisonMap[node.type];
            var _node_property, _currentRule_property;
            if (node.type === "atrule" && node.name === "font-face") {
                currentRule = node;
            } else if (properties.every((property)=>((_node_property = node[property]) !== null && _node_property !== void 0 ? _node_property : "").replace(/\s+/g, " ") === ((_currentRule_property = currentRule[property]) !== null && _currentRule_property !== void 0 ? _currentRule_property : "").replace(/\s+/g, " "))) {
                // An AtRule may not have children (for example if we encounter duplicate @import url(…) rules)
                if (node.nodes) {
                    currentRule.append(node.nodes);
                }
                node.remove();
            } else {
                currentRule = node;
            }
        });
        // After we've collapsed adjacent rules & at-rules, we need to collapse
        // adjacent rules & at-rules that are children of at-rules.
        // We do not care about nesting rules because Tailwind CSS
        // explicitly does not handle rule nesting on its own as
        // the user is expected to use a nesting plugin
        root.each((node)=>{
            if (node.type === "atrule") {
                collapseRulesIn(node);
            }
        });
    }
    return (root)=>{
        collapseRulesIn(root);
    };
}
