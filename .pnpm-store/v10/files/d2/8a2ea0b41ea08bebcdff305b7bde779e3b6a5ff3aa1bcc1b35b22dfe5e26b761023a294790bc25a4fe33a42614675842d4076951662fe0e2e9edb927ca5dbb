import path from 'node:path';
import { minimatch } from 'minimatch';
import { isStaticRequire, createRule } from '../utils/index.js';
function testIsAllow(globs, context, source) {
    if (!Array.isArray(globs)) {
        return false;
    }
    const filename = context.physicalFilename;
    const filePath = source[0] !== '.' && source[0] !== '/'
        ? source
        : path.resolve(filename, '..', source);
    return globs.some(glob => minimatch(filePath, glob, { nocomment: true }) ||
        minimatch(filePath, path.resolve(context.cwd, glob), {
            nocomment: true,
            windowsPathsNoEscape: true,
        }) ||
        minimatch(filePath, path.resolve(glob), {
            nocomment: true,
            windowsPathsNoEscape: true,
        }));
}
export default createRule({
    name: 'no-unassigned-import',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid unassigned imports.',
        },
        schema: [
            {
                type: 'object',
                properties: {
                    devDependencies: { type: ['boolean', 'array'] },
                    optionalDependencies: { type: ['boolean', 'array'] },
                    peerDependencies: { type: ['boolean', 'array'] },
                    allow: {
                        type: 'array',
                        items: {
                            type: 'string',
                        },
                    },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            unassigned: 'Imported module should be assigned',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        const isAllow = (source) => testIsAllow(options.allow, context, source);
        return {
            ImportDeclaration(node) {
                if (node.specifiers.length === 0 && !isAllow(node.source.value)) {
                    context.report({
                        node,
                        messageId: 'unassigned',
                    });
                }
            },
            ExpressionStatement(node) {
                if (node.expression.type === 'CallExpression' &&
                    isStaticRequire(node.expression) &&
                    'value' in node.expression.arguments[0] &&
                    typeof node.expression.arguments[0].value === 'string' &&
                    !isAllow(node.expression.arguments[0].value)) {
                    context.report({
                        node: node.expression,
                        messageId: 'unassigned',
                    });
                }
            },
        };
    },
});
//# sourceMappingURL=no-unassigned-import.js.map