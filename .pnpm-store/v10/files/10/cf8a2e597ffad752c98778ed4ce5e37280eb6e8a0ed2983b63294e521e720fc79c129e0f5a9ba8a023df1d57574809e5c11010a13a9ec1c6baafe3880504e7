"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTraversal = isTraversal;
exports.sortRules = sortRules;
exports.getQuality = getQuality;
exports.includesScopePseudo = includesScopePseudo;
var css_what_1 = require("css-what");
function isTraversal(token) {
    return token.type === "_flexibleDescendant" || (0, css_what_1.isTraversal)(token);
}
/**
 * Sort the parts of the passed selector, as there is potential for
 * optimization (some types of selectors are faster than others).
 *
 * @param arr Selector to sort
 */
function sortRules(arr) {
    var ratings = arr.map(getQuality);
    for (var i = 1; i < arr.length; i++) {
        var procNew = ratings[i];
        if (procNew < 0)
            continue;
        // Use insertion sort to move the token to the correct position.
        for (var j = i; j > 0 && procNew < ratings[j - 1]; j--) {
            var token = arr[j];
            arr[j] = arr[j - 1];
            arr[j - 1] = token;
            ratings[j] = ratings[j - 1];
            ratings[j - 1] = procNew;
        }
    }
}
function getAttributeQuality(token) {
    switch (token.action) {
        case css_what_1.AttributeAction.Exists: {
            return 10;
        }
        case css_what_1.AttributeAction.Equals: {
            // Prefer ID selectors (eg. #ID)
            return token.name === "id" ? 9 : 8;
        }
        case css_what_1.AttributeAction.Not: {
            return 7;
        }
        case css_what_1.AttributeAction.Start: {
            return 6;
        }
        case css_what_1.AttributeAction.End: {
            return 6;
        }
        case css_what_1.AttributeAction.Any: {
            return 5;
        }
        case css_what_1.AttributeAction.Hyphen: {
            return 4;
        }
        case css_what_1.AttributeAction.Element: {
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
function getQuality(token) {
    // eslint-disable-next-line @typescript-eslint/switch-exhaustiveness-check
    switch (token.type) {
        case css_what_1.SelectorType.Universal: {
            return 50;
        }
        case css_what_1.SelectorType.Tag: {
            return 30;
        }
        case css_what_1.SelectorType.Attribute: {
            return Math.floor(getAttributeQuality(token) /
                // `ignoreCase` adds some overhead, half the result if applicable.
                (token.ignoreCase ? 2 : 1));
        }
        case css_what_1.SelectorType.Pseudo: {
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
                            0, Math.min.apply(Math, token.data.map(function (d) {
                                return Math.min.apply(Math, d.map(getQuality));
                            })))
                        : 2;
        }
        default: {
            return -1;
        }
    }
}
function includesScopePseudo(t) {
    return (t.type === css_what_1.SelectorType.Pseudo &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some(function (data) { return data.some(includesScopePseudo); }))));
}
//# sourceMappingURL=selectors.js.map