import path from 'node:path';
import { importType, createRule, moduleVisitor, makeOptionsSchema, resolve, } from '../utils/index.js';
export default createRule({
    name: 'no-relative-parent-imports',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Static analysis',
            description: 'Forbid importing modules from parent directories.',
        },
        schema: [makeOptionsSchema()],
        messages: {
            noAllowed: "Relative imports from parent directories are not allowed. Please either pass what you're importing through at runtime (dependency injection), move `{{filename}}` to same directory as `{{depPath}}` or consider making `{{depPath}}` a package.",
        },
    },
    defaultOptions: [],
    create(context) {
        const filename = context.physicalFilename;
        if (filename === '<text>') {
            return {};
        }
        return moduleVisitor(sourceNode => {
            const depPath = sourceNode.value;
            if (importType(depPath, context) === 'external') {
                return;
            }
            const absDepPath = resolve(depPath, context);
            if (!absDepPath) {
                return;
            }
            const relDepPath = path.relative(path.dirname(filename), absDepPath);
            if (importType(relDepPath, context) === 'parent') {
                context.report({
                    node: sourceNode,
                    messageId: 'noAllowed',
                    data: {
                        filename: path.basename(filename),
                        depPath,
                    },
                });
            }
        }, context.options[0]);
    },
});
//# sourceMappingURL=no-relative-parent-imports.js.map