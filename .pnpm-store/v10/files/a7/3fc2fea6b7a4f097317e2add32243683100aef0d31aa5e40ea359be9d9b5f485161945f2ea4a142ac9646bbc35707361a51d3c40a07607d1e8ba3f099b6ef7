import { ExportMap, createRule } from '../utils/index.js';
export default createRule({
    name: 'default',
    meta: {
        type: 'problem',
        docs: {
            category: 'Static analysis',
            description: 'Ensure a default export is present, given a default import.',
        },
        schema: [],
        messages: {
            noDefaultExport: 'No default export found in imported module "{{module}}".',
        },
    },
    defaultOptions: [],
    create(context) {
        function checkDefault(specifierType, node) {
            const defaultSpecifier = node.specifiers.find(specifier => specifier.type === specifierType);
            if (!defaultSpecifier) {
                return;
            }
            const imports = ExportMap.get(node.source.value, context);
            if (imports == null) {
                return;
            }
            if (imports.errors.length > 0) {
                imports.reportErrors(context, node);
            }
            else if (imports.get('default') === undefined) {
                context.report({
                    node: defaultSpecifier,
                    messageId: 'noDefaultExport',
                    data: {
                        module: node.source.value,
                    },
                });
            }
        }
        return {
            ImportDeclaration: checkDefault.bind(null, 'ImportDefaultSpecifier'),
            ExportNamedDeclaration: checkDefault.bind(null, 'ExportDefaultSpecifier'),
        };
    },
});
//# sourceMappingURL=default.js.map