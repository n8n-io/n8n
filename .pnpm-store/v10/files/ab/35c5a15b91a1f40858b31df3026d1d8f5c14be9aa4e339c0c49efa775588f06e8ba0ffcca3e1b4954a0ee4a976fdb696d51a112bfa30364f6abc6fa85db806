import { createRule } from '../utils/index.js';
const findLastIndex = (array, predicate) => {
    let i = array.length - 1;
    while (i >= 0) {
        if (predicate(array[i])) {
            return i;
        }
        i--;
    }
    return -1;
};
function isNonExportStatement({ type }) {
    return (type !== 'ExportDefaultDeclaration' &&
        type !== 'ExportNamedDeclaration' &&
        type !== 'ExportAllDeclaration');
}
export default createRule({
    name: 'exports-last',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Ensure all exports appear after other statements.',
        },
        schema: [],
        messages: {
            end: 'Export statements should appear at the end of the file',
        },
    },
    defaultOptions: [],
    create(context) {
        return {
            Program({ body }) {
                const lastNonExportStatementIndex = findLastIndex(body, isNonExportStatement);
                if (lastNonExportStatementIndex !== -1) {
                    for (const node of body.slice(0, lastNonExportStatementIndex)) {
                        if (!isNonExportStatement(node)) {
                            context.report({
                                node,
                                messageId: 'end',
                            });
                        }
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=exports-last.js.map