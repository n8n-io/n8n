import { ExportMap, createRule, declaredScope, getValue, } from '../utils/index.js';
function message(deprecation) {
    if (deprecation.description) {
        return {
            messageId: 'deprecatedDesc',
            data: { description: deprecation.description },
        };
    }
    return { messageId: 'deprecated' };
}
function getDeprecation(metadata) {
    if (!metadata || !metadata.doc) {
        return;
    }
    return metadata.doc.tags.find(t => t.tag === 'deprecated');
}
export default createRule({
    name: 'no-deprecated',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Helpful warnings',
            description: 'Forbid imported names marked with `@deprecated` documentation tag.',
        },
        schema: [],
        messages: {
            deprecatedDesc: 'Deprecated: {{description}}',
            deprecated: 'Deprecated: consider to find an alternative.',
        },
    },
    defaultOptions: [],
    create(context) {
        const deprecated = new Map();
        const namespaces = new Map();
        return {
            Program({ body }) {
                for (const node of body) {
                    if (node.type !== 'ImportDeclaration') {
                        continue;
                    }
                    if (node.source == null) {
                        continue;
                    }
                    const imports = ExportMap.get(node.source.value, context);
                    if (imports == null) {
                        continue;
                    }
                    const moduleDeprecation = imports.doc?.tags.find(t => t.tag === 'deprecated');
                    if (moduleDeprecation) {
                        context.report({
                            node,
                            ...message(moduleDeprecation),
                        });
                    }
                    if (imports.errors.length > 0) {
                        imports.reportErrors(context, node);
                        continue;
                    }
                    for (const im of node.specifiers) {
                        let imported;
                        let local;
                        switch (im.type) {
                            case 'ImportNamespaceSpecifier': {
                                if (imports.size === 0) {
                                    continue;
                                }
                                namespaces.set(im.local.name, imports);
                                continue;
                            }
                            case 'ImportDefaultSpecifier': {
                                imported = 'default';
                                local = im.local.name;
                                break;
                            }
                            case 'ImportSpecifier': {
                                imported = getValue(im.imported);
                                local = im.local.name;
                                break;
                            }
                            default: {
                                continue;
                            }
                        }
                        const exported = imports.get(imported);
                        if (exported == null) {
                            continue;
                        }
                        if (exported.namespace) {
                            namespaces.set(local, exported.namespace);
                        }
                        const deprecation = getDeprecation(imports.get(imported));
                        if (!deprecation) {
                            continue;
                        }
                        context.report({
                            node: im,
                            ...message(deprecation),
                        });
                        deprecated.set(local, deprecation);
                    }
                }
            },
            Identifier(node) {
                if (!node.parent ||
                    (node.parent.type === 'MemberExpression' &&
                        node.parent.property === node)) {
                    return;
                }
                if (node.parent.type.slice(0, 6) === 'Import') {
                    return;
                }
                if (!deprecated.has(node.name)) {
                    return;
                }
                if (declaredScope(context, node, node.name) !== 'module') {
                    return;
                }
                context.report({
                    node,
                    ...message(deprecated.get(node.name)),
                });
            },
            MemberExpression(dereference) {
                if (dereference.object.type !== 'Identifier') {
                    return;
                }
                if (!namespaces.has(dereference.object.name)) {
                    return;
                }
                if (declaredScope(context, dereference, dereference.object.name) !==
                    'module') {
                    return;
                }
                let namespace = namespaces.get(dereference.object.name);
                const namepath = [dereference.object.name];
                let node = dereference;
                while (namespace instanceof ExportMap &&
                    node?.type === 'MemberExpression') {
                    if (node.computed) {
                        return;
                    }
                    const metadata = namespace.get(node.property.name);
                    if (!metadata) {
                        break;
                    }
                    const deprecation = getDeprecation(metadata);
                    if (deprecation) {
                        context.report({
                            node: node.property,
                            ...message(deprecation),
                        });
                    }
                    namepath.push(node.property.name);
                    namespace = metadata.namespace;
                    node = node.parent;
                }
            },
        };
    },
});
//# sourceMappingURL=no-deprecated.js.map