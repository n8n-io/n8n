import { createRule, moduleVisitor, resolve } from '../utils/index.js';
function isImportingSelf(context, node, requireName) {
    const filename = context.physicalFilename;
    if (filename !== '<text>' && filename === resolve(requireName, context)) {
        context.report({
            node,
            messageId: 'self',
        });
    }
}
export default createRule({
    name: 'no-self-import',
    meta: {
        type: 'problem',
        docs: {
            category: 'Static analysis',
            description: 'Forbid a module from importing itself.',
            recommended: true,
        },
        schema: [],
        messages: {
            self: 'Module imports itself.',
        },
    },
    defaultOptions: [],
    create(context) {
        return moduleVisitor((source, node) => {
            isImportingSelf(context, node, source.value);
        }, { commonjs: true });
    },
});
//# sourceMappingURL=no-self-import.js.map