import { applyDefault } from './apply-default.js';
import { docsUrl } from './docs-url.js';
export function RuleCreator(urlCreator) {
    return function createNamedRule({ meta, name, ...rule }) {
        return createRule_({
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
function createRule_({ create, defaultOptions, meta, }) {
    return {
        create(context) {
            const optionsWithDefault = applyDefault(defaultOptions, context.options);
            return create(context, optionsWithDefault);
        },
        defaultOptions,
        meta,
    };
}
export const createRule = RuleCreator(docsUrl);
//# sourceMappingURL=create-rule.js.map