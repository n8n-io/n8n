import { createRule } from '../utils/index.js';
function accessorChain(node) {
    const chain = [];
    let exp = node;
    do {
        if ('name' in exp.property) {
            chain.unshift(exp.property.name);
        }
        else if ('value' in exp.property) {
            chain.unshift(exp.property.value);
        }
        if (exp.object.type === 'Identifier') {
            chain.unshift(exp.object.name);
            break;
        }
        exp = exp.object;
    } while (exp.type === 'MemberExpression');
    return chain;
}
export default createRule({
    name: 'group-exports',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Prefer named exports to be grouped together in a single export declaration.',
        },
        schema: [],
        messages: {
            ExportNamedDeclaration: 'Multiple named export declarations; consolidate all named exports into a single export declaration',
            AssignmentExpression: 'Multiple CommonJS exports; consolidate all exports into a single assignment to `module.exports`',
        },
    },
    defaultOptions: [],
    create(context) {
        const nodes = {
            modules: {
                set: new Set(),
                sources: {},
            },
            types: {
                set: new Set(),
                sources: {},
            },
            commonjs: {
                set: new Set(),
            },
        };
        return {
            ExportNamedDeclaration(node) {
                const target = node.exportKind === 'type' ? nodes.types : nodes.modules;
                if (!node.source) {
                    target.set.add(node);
                }
                else if (Array.isArray(target.sources[node.source.value])) {
                    target.sources[node.source.value].push(node);
                }
                else {
                    target.sources[node.source.value] = [node];
                }
            },
            AssignmentExpression(node) {
                if (node.left.type !== 'MemberExpression') {
                    return;
                }
                const chain = accessorChain(node.left);
                if (chain[0] === 'module' &&
                    chain[1] === 'exports' &&
                    chain.length <= 3) {
                    nodes.commonjs.set.add(node);
                    return;
                }
                if (chain[0] === 'exports' && chain.length === 2) {
                    nodes.commonjs.set.add(node);
                    return;
                }
            },
            'Program:exit'() {
                if (nodes.modules.set.size > 1) {
                    for (const node of nodes.modules.set) {
                        context.report({
                            node,
                            messageId: node.type,
                        });
                    }
                }
                for (const node of Object.values(nodes.modules.sources)
                    .filter(nodesWithSource => Array.isArray(nodesWithSource) && nodesWithSource.length > 1)
                    .flat()) {
                    context.report({
                        node,
                        messageId: node.type,
                    });
                }
                if (nodes.types.set.size > 1) {
                    for (const node of nodes.types.set) {
                        context.report({
                            node,
                            messageId: node.type,
                        });
                    }
                }
                for (const node of Object.values(nodes.types.sources)
                    .filter(nodesWithSource => Array.isArray(nodesWithSource) && nodesWithSource.length > 1)
                    .flat()) {
                    context.report({
                        node,
                        messageId: node.type,
                    });
                }
                if (nodes.commonjs.set.size > 1) {
                    for (const node of nodes.commonjs.set) {
                        context.report({
                            node,
                            messageId: node.type,
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=group-exports.js.map