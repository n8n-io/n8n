import path from 'node:path';
import { ExportMap, createRule } from '../utils/index.js';
export default createRule({
    name: 'named',
    meta: {
        type: 'problem',
        docs: {
            category: 'Static analysis',
            description: 'Ensure named imports correspond to a named export in the remote file.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    commonjs: {
                        type: 'boolean',
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            notFound: "{{name}} not found in '{{path}}'",
            notFoundDeep: '{{name}} not found via {{deepPath}}',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        function checkSpecifiers(key, type, node) {
            if (node.source == null ||
                ('importKind' in node &&
                    (node.importKind === 'type' ||
                        node.importKind === 'typeof')) ||
                ('exportKind' in node && node.exportKind === 'type')) {
                return;
            }
            if (!node.specifiers.some(im => im.type === type)) {
                return;
            }
            const imports = ExportMap.get(node.source.value, context);
            if (imports == null || imports.parseGoal === 'ambiguous') {
                return;
            }
            if (imports.errors.length > 0) {
                imports.reportErrors(context, node);
                return;
            }
            for (const im of node.specifiers) {
                if (im.type !== type ||
                    ('importKind' in im &&
                        (im.importKind === 'type' ||
                            im.importKind === 'typeof'))) {
                    continue;
                }
                const imNode = im[key];
                const name = imNode.name ||
                    imNode.value;
                const deepLookup = imports.hasDeep(name);
                if (!deepLookup.found) {
                    if (deepLookup.path.length > 1) {
                        const deepPath = deepLookup.path
                            .map(i => path.relative(path.dirname(context.physicalFilename), i.path))
                            .join(' -> ');
                        context.report({
                            node: imNode,
                            messageId: 'notFoundDeep',
                            data: {
                                name,
                                deepPath,
                            },
                        });
                    }
                    else {
                        context.report({
                            node: imNode,
                            messageId: 'notFound',
                            data: {
                                name,
                                path: node.source.value,
                            },
                        });
                    }
                }
            }
        }
        return {
            ImportDeclaration: checkSpecifiers.bind(null, 'imported', 'ImportSpecifier'),
            ExportNamedDeclaration: checkSpecifiers.bind(null, 'local', 'ExportSpecifier'),
            VariableDeclarator(node) {
                if (!options.commonjs ||
                    node.type !== 'VariableDeclarator' ||
                    !node.id ||
                    node.id.type !== 'ObjectPattern' ||
                    node.id.properties.length === 0 ||
                    !node.init ||
                    node.init.type !== 'CallExpression') {
                    return;
                }
                const call = node.init;
                const source = call.arguments[0];
                const variableImports = node.id.properties;
                const variableExports = ExportMap.get(source.value, context);
                if (call.callee.type !== 'Identifier' ||
                    call.callee.name !== 'require' ||
                    call.arguments.length !== 1 ||
                    source.type !== 'Literal' ||
                    variableExports == null ||
                    variableExports.parseGoal === 'ambiguous') {
                    return;
                }
                if (variableExports.errors.length > 0) {
                    variableExports.reportErrors(context, node);
                    return;
                }
                for (const im of variableImports) {
                    if (im.type !== 'Property' ||
                        !im.key ||
                        im.key.type !== 'Identifier') {
                        continue;
                    }
                    const deepLookup = variableExports.hasDeep(im.key.name);
                    if (!deepLookup.found) {
                        if (deepLookup.path.length > 1) {
                            const deepPath = deepLookup.path
                                .map(i => path.relative(path.dirname(context.filename), i.path))
                                .join(' -> ');
                            context.report({
                                node: im.key,
                                messageId: 'notFoundDeep',
                                data: {
                                    name: im.key.name,
                                    deepPath,
                                },
                            });
                        }
                        else {
                            context.report({
                                node: im.key,
                                messageId: 'notFound',
                                data: {
                                    name: im.key.name,
                                    path: source.value,
                                },
                            });
                        }
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=named.js.map