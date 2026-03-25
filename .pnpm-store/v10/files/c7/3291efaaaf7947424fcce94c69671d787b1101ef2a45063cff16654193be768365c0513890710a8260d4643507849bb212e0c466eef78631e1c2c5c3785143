import { createRule, getValue } from '../utils/index.js';
export default createRule({
    name: 'no-named-default',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid named default exports.',
        },
        schema: [],
        messages: {
            default: `Use default import syntax to import '{{importName}}'.`,
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            ImportDeclaration(node) {
                for (const im of node.specifiers) {
                    if ('importKind' in im &&
                        (im.importKind === 'type' ||
                            im.importKind === 'typeof')) {
                        continue;
                    }
                    if (im.type === 'ImportSpecifier' &&
                        getValue(im.imported) === 'default') {
                        context.report({
                            node: im.local,
                            messageId: 'default',
                            data: {
                                importName: im.local.name,
                            },
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=no-named-default.js.map