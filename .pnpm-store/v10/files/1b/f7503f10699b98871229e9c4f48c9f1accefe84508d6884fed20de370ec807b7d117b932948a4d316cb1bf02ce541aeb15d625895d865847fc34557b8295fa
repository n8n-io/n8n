import { createRule } from '../utils/index.js';
function getEmptyBlockRange(tokens, index) {
    const token = tokens[index];
    const nextToken = tokens[index + 1];
    const prevToken = tokens[index - 1];
    let start = token.range[0];
    const end = nextToken.range[1];
    if (prevToken.value === ',' ||
        prevToken.value === 'type' ||
        prevToken.value === 'typeof') {
        start = prevToken.range[0];
    }
    return [start, end];
}
export default createRule({
    name: 'no-empty-named-blocks',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Helpful warnings',
            description: 'Forbid empty named import blocks.',
        },
        fixable: 'code',
        hasSuggestions: true,
        schema: [],
        messages: {
            emptyNamed: 'Unexpected empty named import block',
            unused: 'Remove unused import',
            emptyImport: 'Remove empty import block',
        },
    },
    defaultOptions: [],
    create(context) {
        const importsWithoutNameds = [];
        return {
            ImportDeclaration(node) {
                if (!node.specifiers.some(x => x.type === 'ImportSpecifier')) {
                    importsWithoutNameds.push(node);
                }
            },
            'Program:exit'(program) {
                const importsTokens = importsWithoutNameds.map(node => [
                    node,
                    program.tokens.filter(x => x.range[0] >= node.range[0] && x.range[1] <= node.range[1]),
                ]);
                const pTokens = program.tokens || [];
                for (const [node, tokens] of importsTokens) {
                    for (const token of tokens) {
                        const idx = pTokens.indexOf(token);
                        const nextToken = pTokens[idx + 1];
                        if (nextToken && token.value === '{' && nextToken.value === '}') {
                            const hasOtherIdentifiers = tokens.some(token => token.type === 'Identifier' &&
                                token.value !== 'from' &&
                                token.value !== 'type' &&
                                token.value !== 'typeof');
                            if (hasOtherIdentifiers) {
                                context.report({
                                    node,
                                    messageId: 'emptyNamed',
                                    fix(fixer) {
                                        return fixer.removeRange(getEmptyBlockRange(pTokens, idx));
                                    },
                                });
                            }
                            else {
                                context.report({
                                    node,
                                    messageId: 'emptyNamed',
                                    suggest: [
                                        {
                                            messageId: 'unused',
                                            fix(fixer) {
                                                return fixer.remove(node);
                                            },
                                        },
                                        {
                                            messageId: 'emptyImport',
                                            fix(fixer) {
                                                const { sourceCode } = context;
                                                const fromToken = pTokens.find(t => t.value === 'from');
                                                const importToken = pTokens.find(t => t.value === 'import');
                                                const hasSpaceAfterFrom = sourceCode.isSpaceBetween(fromToken, sourceCode.getTokenAfter(fromToken));
                                                const hasSpaceAfterImport = sourceCode.isSpaceBetween(importToken, sourceCode.getTokenAfter(fromToken));
                                                const [start] = getEmptyBlockRange(pTokens, idx);
                                                const [, end] = fromToken.range;
                                                const range = [
                                                    start,
                                                    hasSpaceAfterFrom ? end + 1 : end,
                                                ];
                                                return fixer.replaceTextRange(range, hasSpaceAfterImport ? '' : ' ');
                                            },
                                        },
                                    ],
                                });
                            }
                        }
                    }
                }
            },
        };
    },
});
//# sourceMappingURL=no-empty-named-blocks.js.map