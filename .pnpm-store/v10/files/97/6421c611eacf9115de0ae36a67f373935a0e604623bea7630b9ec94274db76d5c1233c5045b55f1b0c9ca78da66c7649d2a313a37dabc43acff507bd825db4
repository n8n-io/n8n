import { createRule } from '../utils/index.js';
function isRequire(node) {
    return (node.callee?.type === 'Identifier' &&
        node.callee.name === 'require' &&
        node.arguments.length > 0);
}
function isDynamicImport(node) {
    return (node?.callee &&
        node.callee.type === 'Import');
}
function isStaticValue(node) {
    return (node.type === 'Literal' ||
        (node.type === 'TemplateLiteral' && node.expressions.length === 0));
}
export default createRule({
    name: 'no-dynamic-require',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid `require()` calls with expressions.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    esmodule: {
                        type: 'boolean',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            import: 'Calls to import() should use string literals',
            require: 'Calls to require() should use string literals',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        return {
            CallExpression(node) {
                if (!node.arguments[0] || isStaticValue(node.arguments[0])) {
                    return;
                }
                if (isRequire(node)) {
                    return context.report({
                        node,
                        messageId: 'require',
                    });
                }
                if (options.esmodule && isDynamicImport(node)) {
                    return context.report({
                        node,
                        messageId: 'import',
                    });
                }
            },
            ImportExpression(node) {
                if (!options.esmodule || isStaticValue(node.source)) {
                    return;
                }
                return context.report({
                    node,
                    messageId: 'import',
                });
            },
        };
    },
});
//# sourceMappingURL=no-dynamic-require.js.map