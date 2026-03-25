import { createRule, getValue, sourceType } from '../utils/index.js';
export default createRule({
    name: 'no-default-export',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid default exports.',
        },
        schema: [],
        messages: {
            preferNamed: 'Prefer named exports.',
            noAliasDefault: 'Do not alias `{{local}}` as `default`. Just export `{{local}}` itself instead.',
        },
    },
    defaultOptions: [],
    create(context) {
        if (sourceType(context) !== 'module') {
            return {};
        }
        const { sourceCode } = context;
        return {
            ExportDefaultDeclaration(node) {
                const { loc } = sourceCode.getFirstTokens(node)[1] || {};
                context.report({
                    node,
                    messageId: 'preferNamed',
                    loc,
                });
            },
            ExportNamedDeclaration(node) {
                for (const specifier of node.specifiers.filter(specifier => getValue(specifier.exported) === 'default')) {
                    const { loc } = sourceCode.getFirstTokens(node)[1] || {};
                    if (specifier.type === 'ExportDefaultSpecifier') {
                        context.report({
                            node,
                            messageId: 'preferNamed',
                            loc,
                        });
                    }
                    else if (specifier.type === 'ExportSpecifier') {
                        context.report({
                            node,
                            messageId: 'noAliasDefault',
                            data: {
                                local: getValue(specifier.local),
                            },
                            loc,
                        });
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=no-default-export.js.map