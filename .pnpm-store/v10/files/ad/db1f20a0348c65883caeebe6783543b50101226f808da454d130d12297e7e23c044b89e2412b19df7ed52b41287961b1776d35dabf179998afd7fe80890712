"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuleCreator = RuleCreator;
const applyDefault_1 = require("./applyDefault");
/**
 * Creates reusable function to create rules with default options and docs URLs.
 *
 * @param urlCreator Creates a documentation URL for a given rule name.
 * @returns Function to create a rule with the docs URL format.
 */
function RuleCreator(urlCreator) {
    // This function will get much easier to call when this is merged https://github.com/Microsoft/TypeScript/pull/26349
    // TODO - when the above PR lands; add type checking for the context.report `data` property
    return function createNamedRule({ meta, name, ...rule }) {
        return createRule({
            meta: {
                ...meta,
                docs: {
                    ...meta.docs,
                    url: urlCreator(name),
                },
            },
            ...rule,
        });
    };
}
function createRule({ create, defaultOptions, meta, }) {
    return {
        create(context) {
            const optionsWithDefault = (0, applyDefault_1.applyDefault)(defaultOptions, context.options);
            return create(context, optionsWithDefault);
        },
        defaultOptions,
        meta,
    };
}
/**
 * Creates a well-typed TSESLint custom ESLint rule without a docs URL.
 *
 * @returns Well-typed TSESLint custom ESLint rule.
 * @remarks It is generally better to provide a docs URL function to RuleCreator.
 */
RuleCreator.withoutDocs = function withoutDocs(args) {
    return createRule(args);
};
