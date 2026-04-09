import { AttributeAction, SelectorType, isTraversal as isTraversalBase, } from "css-what";
export function isTraversal(token) {
    return token.type === "_flexibleDescendant" || isTraversalBase(token);
}
/**
 * Sort the parts of the passed selector, as there is potential for
 * optimization (some types of selectors are faster than others).
 *
 * @param arr Selector to sort
 */
export function sortRules(arr) {
    const ratings = arr.map(getQuality);
    for (let i = 1; i < arr.length; i++) {
        const procNew = ratings[i];
        if (procNew < 0)
            continue;
        // Use insertion sort to move the token to the correct position.
        for (let j = i; j > 0 && procNew < ratings[j - 1]; j--) {
            const token = arr[j];
            arr[j] = arr[j - 1];
            arr[j - 1] = token;
            ratings[j] = ratings[j - 1];
            ratings[j - 1] = procNew;
        }
    }
}
function getAttributeQuality(token) {
    switch (token.action) {
        case AttributeAction.Exists: {
            return 10;
        }
        case AttributeAction.Equals: {
            // Prefer ID selectors (eg. #ID)
            return token.name === "id" ? 9 : 8;
        }
        case AttributeAction.Not: {
            return 7;
        }
        case AttributeAction.Start: {
            return 6;
        }
        case AttributeAction.End: {
            return 6;
        }
        case AttributeAction.Any: {
            return 5;
        }
        case AttributeAction.Hyphen: {
            return 4;
        }
        case AttributeAction.Element: {
            return 3;
        }
    }
}
/**
 * Determine the quality of the passed token. The higher the number, the
 * faster the token is to execute.
 *
 * @param token Token to get the quality of.
 * @returns The token's quality.
 */
export function getQuality(token) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (token.type) {
        case SelectorType.Universal: {
            return 50;
        }
        case SelectorType.Tag: {
            return 30;
        }
        case SelectorType.Attribute: {
            return Math.floor(getAttributeQuality(token) /
                // `ignoreCase` adds some overhead, half the result if applicable.
                (token.ignoreCase ? 2 : 1));
        }
        case SelectorType.Pseudo: {
            return !token.data
                ? 3
                : token.name === "has" ||
                    token.name === "contains" ||
                    token.name === "icontains"
                    ? // Expensive in any case — run as late as possible.
                        0
                    : Array.isArray(token.data)
                        ? // Eg. `:is`, `:not`
                            Math.max(
                            // If we have traversals, try to avoid executing this selector
                            0, Math.min(...token.data.map((d) => Math.min(...d.map(getQuality)))))
                        : 2;
        }
        default: {
            return -1;
        }
    }
}
export function includesScopePseudo(t) {
    return (t.type === SelectorType.Pseudo &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some((data) => data.some(includesScopePseudo)))));
}
//# sourceMappingURL=selectors.js.map