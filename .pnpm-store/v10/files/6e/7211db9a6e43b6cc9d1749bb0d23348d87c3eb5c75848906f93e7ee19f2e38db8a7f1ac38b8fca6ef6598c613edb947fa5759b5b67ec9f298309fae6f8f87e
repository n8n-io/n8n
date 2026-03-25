import { createRule, getValue, sourceType } from '../utils/index.js';
export default createRule({
    name: 'no-named-export',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid named exports.',
        },
        schema: [],
        messages: {
            noAllowed: 'Named exports are not allowed.',
        },
    },
    defaultOptions: [],
    create(context) {
        if (sourceType(context) !== 'module') {
            return {};
        }
        return {
            ExportAllDeclaration(node) {
                context.report({ node, messageId: 'noAllowed' });
            },
            ExportNamedDeclaration(node) {
                if (node.specifiers.length === 0) {
                    return context.report({ node, messageId: 'noAllowed' });
                }
                const someNamed = node.specifiers.some(specifier => getValue(specifier.exported) !== 'default');
                if (someNamed) {
                    context.report({ node, messageId: 'noAllowed' });
                }
            },
        };
    },
});
//# sourceMappingURL=no-named-export.js.map