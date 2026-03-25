import { parse, SelectorType } from "css-what";
import boolbase from "boolbase";
import sortRules, { isTraversal } from "./sort.js";
import { compileGeneralSelector } from "./general.js";
import { ensureIsTag, PLACEHOLDER_ELEMENT, } from "./pseudo-selectors/subselects.js";
/**
 * Compiles a selector to an executable function.
 *
 * @param selector Selector to compile.
 * @param options Compilation options.
 * @param context Optional context for the selector.
 */
export function compile(selector, options, context) {
    const next = compileUnsafe(selector, options, context);
    return ensureIsTag(next, options.adapter);
}
export function compileUnsafe(selector, options, context) {
    const token = typeof selector === "string" ? parse(selector) : selector;
    return compileToken(token, options, context);
}
function includesScopePseudo(t) {
    return (t.type === SelectorType.Pseudo &&
        (t.name === "scope" ||
            (Array.isArray(t.data) &&
                t.data.some((data) => data.some(includesScopePseudo)))));
}
const DESCENDANT_TOKEN = { type: SelectorType.Descendant };
const FLEXIBLE_DESCENDANT_TOKEN = {
    type: "_flexibleDescendant",
};
const SCOPE_TOKEN = {
    type: SelectorType.Pseudo,
    name: "scope",
    data: null,
};
/*
 * CSS 4 Spec (Draft): 3.4.1. Absolutizing a Relative Selector
 * http://www.w3.org/TR/selectors4/#absolutizing
 */
function absolutize(token, { adapter }, context) {
    // TODO Use better check if the context is a document
    const hasContext = !!(context === null || context === void 0 ? void 0 : context.every((e) => {
        const parent = adapter.isTag(e) && adapter.getParent(e);
        return e === PLACEHOLDER_ELEMENT || (parent && adapter.isTag(parent));
    }));
    for (const t of token) {
        if (t.length > 0 &&
            isTraversal(t[0]) &&
            t[0].type !== SelectorType.Descendant) {
            // Don't continue in else branch
        }
        else if (hasContext && !t.some(includesScopePseudo)) {
            t.unshift(DESCENDANT_TOKEN);
        }
        else {
            continue;
        }
        t.unshift(SCOPE_TOKEN);
    }
}
export function compileToken(token, options, context) {
    var _a;
    token.forEach(sortRules);
    context = (_a = options.context) !== null && _a !== void 0 ? _a : context;
    const isArrayContext = Array.isArray(context);
    const finalContext = context && (Array.isArray(context) ? context : [context]);
    // Check if the selector is relative
    if (options.relativeSelector !== false) {
        absolutize(token, options, finalContext);
    }
    else if (token.some((t) => t.length > 0 && isTraversal(t[0]))) {
        throw new Error("Relative selectors are not allowed when the `relativeSelector` option is disabled");
    }
    let shouldTestNextSiblings = false;
    const query = token
        .map((rules) => {
        if (rules.length >= 2) {
            const [first, second] = rules;
            if (first.type !== SelectorType.Pseudo ||
                first.name !== "scope") {
                // Ignore
            }
            else if (isArrayContext &&
                second.type === SelectorType.Descendant) {
                rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
            }
            else if (second.type === SelectorType.Adjacent ||
                second.type === SelectorType.Sibling) {
                shouldTestNextSiblings = true;
            }
        }
        return compileRules(rules, options, finalContext);
    })
        .reduce(reduceRules, boolbase.falseFunc);
    query.shouldTestNextSiblings = shouldTestNextSiblings;
    return query;
}
function compileRules(rules, options, context) {
    var _a;
    return rules.reduce((previous, rule) => previous === boolbase.falseFunc
        ? boolbase.falseFunc
        : compileGeneralSelector(previous, rule, options, context, compileToken), (_a = options.rootFunc) !== null && _a !== void 0 ? _a : boolbase.trueFunc);
}
function reduceRules(a, b) {
    if (b === boolbase.falseFunc || a === boolbase.trueFunc) {
        return a;
    }
    if (a === boolbase.falseFunc || b === boolbase.trueFunc) {
        return b;
    }
    return function combine(elem) {
        return a(elem) || b(elem);
    };
}
//# sourceMappingURL=compile.js.map