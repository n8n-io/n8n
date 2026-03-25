import { isFilter } from "./positionals.js";
export function getDocumentRoot(node) {
    while (node.parent)
        node = node.parent;
    return node;
}
export function groupSelectors(selectors) {
    const filteredSelectors = [];
    const plainSelectors = [];
    for (const selector of selectors) {
        if (selector.some(isFilter)) {
            filteredSelectors.push(selector);
        }
        else {
            plainSelectors.push(selector);
        }
    }
    return [plainSelectors, filteredSelectors];
}
//# sourceMappingURL=helpers.js.map