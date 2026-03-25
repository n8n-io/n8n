import { ExportMap, isExternalModule, createRule, moduleVisitor, makeOptionsSchema, resolve, } from '../utils/index.js';
const traversed = new Set();
export default createRule({
    name: 'no-cycle',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid a module from importing a module with a dependency path back to itself.',
        },
        schema: [
            makeOptionsSchema({
                maxDepth: {
                    anyOf: [
                        {
                            description: 'maximum dependency depth to traverse',
                            type: 'integer',
                            minimum: 1,
                        },
                        {
                            enum: ['∞'],
                            type: 'string',
                        },
                    ],
                },
                ignoreExternal: {
                    description: 'ignore external modules',
                    type: 'boolean',
                    default: false,
                },
                allowUnsafeDynamicCyclicDependency: {
                    description: 'Allow cyclic dependency if there is at least one dynamic import in the chain',
                    type: 'boolean',
                    default: false,
                },
            }),
        ],
        messages: {
            cycle: 'Dependency cycle detected',
            cycleSource: 'Dependency cycle via "{{source}}"',
        },
    },
    defaultOptions: [],
    create(context) {
        const filename = context.physicalFilename;
        if (filename === '<text>') {
            return {};
        }
        const options = context.options[0] || {};
        const maxDepth = typeof options.maxDepth === 'number'
            ? options.maxDepth
            : Number.POSITIVE_INFINITY;
        const ignoreModule = options.ignoreExternal
            ? (name) => isExternalModule(name, resolve(name, context), context)
            : () => false;
        return {
            ...moduleVisitor(function checkSourceValue(sourceNode, importer) {
                if (ignoreModule(sourceNode.value)) {
                    return;
                }
                if (options.allowUnsafeDynamicCyclicDependency &&
                    (importer.type === 'ImportExpression' ||
                        (importer.type === 'CallExpression' &&
                            'name' in importer.callee &&
                            importer.callee.name !== 'require'))) {
                    return;
                }
                if (importer.type === 'ImportDeclaration' &&
                    (importer.importKind === 'type' ||
                        importer.specifiers.every(s => 'importKind' in s && s.importKind === 'type'))) {
                    return;
                }
                const imported = ExportMap.get(sourceNode.value, context);
                if (imported == null) {
                    return;
                }
                if (imported.path === filename) {
                    return;
                }
                const untraversed = [{ mget: () => imported, route: [] }];
                function detectCycle({ mget, route }) {
                    const m = mget();
                    if (m == null) {
                        return;
                    }
                    if (traversed.has(m.path)) {
                        return;
                    }
                    traversed.add(m.path);
                    for (const [path, { getter, declarations }] of m.imports) {
                        if (traversed.has(path)) {
                            continue;
                        }
                        const toTraverse = [...declarations].filter(({ source, isOnlyImportingTypes }) => !ignoreModule(source.value) &&
                            !isOnlyImportingTypes);
                        if (options.allowUnsafeDynamicCyclicDependency &&
                            toTraverse.some(d => d.dynamic)) {
                            return;
                        }
                        if (path === filename && toTraverse.length > 0) {
                            return true;
                        }
                        if (route.length + 1 < maxDepth) {
                            for (const { source } of toTraverse) {
                                untraversed.push({ mget: getter, route: [...route, source] });
                            }
                        }
                    }
                }
                while (untraversed.length > 0) {
                    const next = untraversed.shift();
                    if (detectCycle(next)) {
                        if (next.route.length > 0) {
                            context.report({
                                node: importer,
                                messageId: 'cycleSource',
                                data: {
                                    source: routeString(next.route),
                                },
                            });
                        }
                        else {
                            context.report({
                                node: importer,
                                messageId: 'cycle',
                            });
                        }
                        return;
                    }
                }
            }, context.options[0]),
            'Program:exit'() {
                traversed.clear();
            },
        };
    },
});
function routeString(route) {
    return route.map(s => `${s.value}:${s.loc.start.line}`).join('=>');
}
//# sourceMappingURL=no-cycle.js.map