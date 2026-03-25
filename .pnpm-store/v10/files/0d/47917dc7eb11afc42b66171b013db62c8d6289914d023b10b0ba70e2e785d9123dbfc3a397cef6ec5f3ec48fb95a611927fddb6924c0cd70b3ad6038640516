import { createRule } from '../utils/index.js';
export default createRule({
    name: 'no-amd',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Module systems',
            description: 'Forbid AMD `require` and `define` calls.',
        },
        schema: [],
        messages: {
            amd: 'Expected imports instead of AMD {{type}}().',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            CallExpression(node) {
                if (context.sourceCode.getScope(node).type !== 'module') {
                    return;
                }
                if (node.callee.type !== 'Identifier') {
                    return;
                }
                if (node.callee.name !== 'require' && node.callee.name !== 'define') {
                    return;
                }
                if (node.arguments.length !== 2) {
                    return;
                }
                const modules = node.arguments[0];
                if (modules.type !== 'ArrayExpression') {
                    return;
                }
                context.report({
                    node,
                    messageId: 'amd',
                    data: {
                        type: node.callee.name,
                    },
                });
            },
        };
    },
});
//# sourceMappingURL=no-amd.js.map