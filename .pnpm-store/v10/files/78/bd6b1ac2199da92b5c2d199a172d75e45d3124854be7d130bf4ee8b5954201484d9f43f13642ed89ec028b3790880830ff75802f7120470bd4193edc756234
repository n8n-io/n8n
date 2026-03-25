import boolbase from "boolbase";
import { isTraversal } from "../sort.js";
/** Used as a placeholder for :has. Will be replaced with the actual element. */
export const PLACEHOLDER_ELEMENT = {};
export function ensureIsTag(next, adapter) {
    if (next === boolbase.falseFunc)
        return boolbase.falseFunc;
    return (elem) => adapter.isTag(elem) && next(elem);
}
export function getNextSiblings(elem, adapter) {
    const siblings = adapter.getSiblings(elem);
    if (siblings.length <= 1)
        return [];
    const elemIndex = siblings.indexOf(elem);
    if (elemIndex < 0 || elemIndex === siblings.length - 1)
        return [];
    return siblings.slice(elemIndex + 1).filter(adapter.isTag);
}
function copyOptions(options) {
    // Not copied: context, rootFunc
    return {
        xmlMode: !!options.xmlMode,
        lowerCaseAttributeNames: !!options.lowerCaseAttributeNames,
        lowerCaseTags: !!options.lowerCaseTags,
        quirksMode: !!options.quirksMode,
        cacheResults: !!options.cacheResults,
        pseudos: options.pseudos,
        adapter: options.adapter,
        equals: options.equals,
    };
}
const is = (next, token, options, context, compileToken) => {
    const func = compileToken(token, copyOptions(options), context);
    return func === boolbase.trueFunc
        ? next
        : func === boolbase.falseFunc
            ? boolbase.falseFunc
            : (elem) => func(elem) && next(elem);
};
/*
 * :not, :has, :is, :matches and :where have to compile selectors
 * doing this in src/pseudos.ts would lead to circular dependencies,
 * so we add them here
 */
export const subselects = {
    is,
    /**
     * `:matches` and `:where` are aliases for `:is`.
     */
    matches: is,
    where: is,
    not(next, token, options, context, compileToken) {
        const func = compileToken(token, copyOptions(options), context);
        return func === boolbase.falseFunc
            ? next
            : func === boolbase.trueFunc
                ? boolbase.falseFunc
                : (elem) => !func(elem) && next(elem);
    },
    has(next, subselect, options, _context, compileToken) {
        const { adapter } = options;
        const opts = copyOptions(options);
        opts.relativeSelector = true;
        const context = subselect.some((s) => s.some(isTraversal))
            ? // Used as a placeholder. Will be replaced with the actual element.
                [PLACEHOLDER_ELEMENT]
            : undefined;
        const compiled = compileToken(subselect, opts, context);
        if (compiled === boolbase.falseFunc)
            return boolbase.falseFunc;
        const hasElement = ensureIsTag(compiled, adapter);
        // If `compiled` is `trueFunc`, we can skip this.
        if (context && compiled !== boolbase.trueFunc) {
            /*
             * `shouldTestNextSiblings` will only be true if the query starts with
             * a traversal (sibling or adjacent). That means we will always have a context.
             */
            const { shouldTestNextSiblings = false } = compiled;
            return (elem) => {
                if (!next(elem))
                    return false;
                context[0] = elem;
                const childs = adapter.getChildren(elem);
                const nextElements = shouldTestNextSiblings
                    ? [...childs, ...getNextSiblings(elem, adapter)]
                    : childs;
                return adapter.existsOne(hasElement, nextElements);
            };
        }
        return (elem) => next(elem) &&
            adapter.existsOne(hasElement, adapter.getChildren(elem));
    },
};
//# sourceMappingURL=subselects.js.map