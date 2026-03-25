import { AST_NODE_TYPES } from '@typescript-eslint/types';
import { ExportMap, recursivePatternCapture, createRule, getValue, } from '../utils/index.js';
const rootProgram = 'root';
const tsTypePrefix = 'type:';
function removeTypescriptFunctionOverloads(nodes) {
    for (const node of nodes) {
        const declType = node.type === AST_NODE_TYPES.ExportDefaultDeclaration
            ? node.declaration.type
            : node.parent?.type;
        if (declType === AST_NODE_TYPES.TSDeclareFunction) {
            nodes.delete(node);
        }
    }
}
function isTypescriptNamespaceMerging(nodes) {
    const types = new Set(Array.from(nodes, node => `${node.parent.type}`));
    const noNamespaceNodes = [...nodes].filter(node => node.parent.type !== 'TSModuleDeclaration');
    return (types.has('TSModuleDeclaration') &&
        (types.size === 1 ||
            (types.size === 2 &&
                (types.has('FunctionDeclaration') || types.has('TSDeclareFunction'))) ||
            (types.size === 3 &&
                types.has('FunctionDeclaration') &&
                types.has('TSDeclareFunction')) ||
            (types.size === 2 &&
                (types.has('ClassDeclaration') || types.has('TSEnumDeclaration')) &&
                noNamespaceNodes.length === 1)));
}
function shouldSkipTypescriptNamespace(node, nodes) {
    const types = new Set(Array.from(nodes, node => `${node.parent.type}`));
    return (!isTypescriptNamespaceMerging(nodes) &&
        node.parent.type === 'TSModuleDeclaration' &&
        (types.has('TSEnumDeclaration') ||
            types.has('ClassDeclaration') ||
            types.has('FunctionDeclaration') ||
            types.has('TSDeclareFunction')));
}
export default createRule({
    name: 'export',
    meta: {
        type: 'problem',
        docs: {
            category: 'Helpful warnings',
            description: 'Forbid any invalid exports, i.e. re-export of the same name.',
        },
        schema: [],
        messages: {
            noNamed: "No named exports found in module '{{module}}'.",
            multiDefault: 'Multiple default exports.',
            multiNamed: "Multiple exports of name '{{name}}'.",
        },
    },
    defaultOptions: [],
    create(context) {
        const namespace = new Map([[rootProgram, new Map()]]);
        function addNamed(name, node, parent, isType) {
            if (!namespace.has(parent)) {
                namespace.set(parent, new Map());
            }
            const named = namespace.get(parent);
            const key = isType ? `${tsTypePrefix}${name}` : name;
            let nodes = named.get(key);
            if (nodes == null) {
                nodes = new Set();
                named.set(key, nodes);
            }
            nodes.add(node);
        }
        function getParent(node) {
            if (node.parent?.type === 'TSModuleBlock') {
                return node.parent.parent;
            }
            return rootProgram;
        }
        return {
            ExportDefaultDeclaration(node) {
                addNamed('default', node, getParent(node));
            },
            ExportSpecifier(node) {
                addNamed(getValue(node.exported), node.exported, getParent(node.parent));
            },
            ExportNamedDeclaration(node) {
                if (node.declaration == null) {
                    return;
                }
                const parent = getParent(node);
                const isTypeVariableDecl = 'kind' in node.declaration &&
                    node.declaration.kind === 'type';
                if ('id' in node.declaration && node.declaration.id != null) {
                    const id = node.declaration.id;
                    addNamed(id.name, id, parent, ['TSTypeAliasDeclaration', 'TSInterfaceDeclaration'].includes(node.declaration.type) || isTypeVariableDecl);
                }
                if ('declarations' in node.declaration &&
                    node.declaration.declarations != null) {
                    for (const declaration of node.declaration.declarations) {
                        recursivePatternCapture(declaration.id, v => {
                            addNamed(v.name, v, parent, isTypeVariableDecl);
                        });
                    }
                }
            },
            ExportAllDeclaration(node) {
                if (node.source == null) {
                    return;
                }
                if (node.exported && node.exported.name) {
                    return;
                }
                const remoteExports = ExportMap.get(node.source.value, context);
                if (remoteExports == null) {
                    return;
                }
                if (remoteExports.errors.length > 0) {
                    remoteExports.reportErrors(context, node);
                    return;
                }
                const parent = getParent(node);
                let any = false;
                remoteExports.$forEach((_, name) => {
                    if (name !== 'default') {
                        any = true;
                        addNamed(name, node, parent);
                    }
                });
                if (!any) {
                    context.report({
                        node: node.source,
                        messageId: 'noNamed',
                        data: { module: node.source.value },
                    });
                }
            },
            'Program:exit'() {
                for (const [, named] of namespace) {
                    for (const [name, nodes] of named) {
                        if (nodes.size === 0) {
                            continue;
                        }
                        removeTypescriptFunctionOverloads(nodes);
                        if (nodes.size <= 1) {
                            continue;
                        }
                        if (isTypescriptNamespaceMerging(nodes)) {
                            continue;
                        }
                        for (const node of nodes) {
                            if (shouldSkipTypescriptNamespace(node, nodes)) {
                                continue;
                            }
                            if (name === 'default') {
                                context.report({
                                    node,
                                    messageId: 'multiDefault',
                                });
                            }
                            else {
                                context.report({
                                    node,
                                    messageId: 'multiNamed',
                                    data: {
                                        name: name.replace(tsTypePrefix, ''),
                                    },
                                });
                            }
                        }
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=export.js.map