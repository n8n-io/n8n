import vm from 'node:vm';
import { createRule } from '../utils/index.js';
export default createRule({
    name: 'dynamic-import-chunkname',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Enforce a leading comment with the webpackChunkName for dynamic imports.',
        },
        hasSuggestions: true,
        schema: [
            {
                type: 'object',
                properties: {
                    importFunctions: {
                        type: 'array',
                        uniqueItems: true,
                        items: {
                            type: 'string',
                        },
                    },
                    allowEmpty: {
                        type: 'boolean',
                    },
                    webpackChunknameFormat: {
                        type: 'string',
                    },
                },
            },
        ],
        messages: {
            leadingComment: 'dynamic imports require a leading comment with the webpack chunkname',
            blockComment: 'dynamic imports require a /* foo */ style comment, not a // foo comment',
            paddedSpaces: 'dynamic imports require a block comment padded with spaces - /* foo */',
            webpackComment: 'dynamic imports require a "webpack" comment with valid syntax',
            chunknameFormat: 'dynamic imports require a leading comment in the form /* {{format}} */',
            webpackEagerModeNoChunkName: 'dynamic imports using eager mode do not need a webpackChunkName',
            webpackRemoveEagerMode: 'Remove webpackMode',
            webpackRemoveChunkName: 'Remove webpackChunkName',
        },
    },
    defaultOptions: [],
    create(context) {
        const { importFunctions = [], allowEmpty = false, webpackChunknameFormat = String.raw `([0-9a-zA-Z-_/.]|\[(request|index)\])+`, } = context.options[0] || {};
        const paddedCommentRegex = /^ (\S[\S\s]+\S) $/;
        const commentStyleRegex = /^( (((webpackChunkName|webpackFetchPriority): .+)|((webpackPrefetch|webpackPreload): (true|false|-?\d+))|(webpackIgnore: (true|false))|((webpackInclude|webpackExclude): \/.+\/)|(webpackMode: ["'](lazy|lazy-once|eager|weak)["'])|(webpackExports: (["']\w+["']|\[(["']\w+["'], *)+(["']\w+["']*)]))),?)+ $/;
        const chunkSubstrFormat = `webpackChunkName: ["']${webpackChunknameFormat}["'],?`;
        const chunkSubstrRegex = new RegExp(chunkSubstrFormat);
        const eagerModeFormat = `webpackMode: ["']eager["'],?`;
        const eagerModeRegex = new RegExp(eagerModeFormat);
        function run(node, arg) {
            const { sourceCode } = context;
            const leadingComments = sourceCode.getCommentsBefore(arg);
            if ((!leadingComments || leadingComments.length === 0) && !allowEmpty) {
                context.report({
                    node,
                    messageId: 'leadingComment',
                });
                return;
            }
            let isChunknamePresent = false;
            let isEagerModePresent = false;
            for (const comment of leadingComments) {
                if (comment.type !== 'Block') {
                    context.report({
                        node,
                        messageId: 'blockComment',
                    });
                    return;
                }
                if (!paddedCommentRegex.test(comment.value)) {
                    context.report({
                        node,
                        messageId: 'paddedSpaces',
                    });
                    return;
                }
                try {
                    vm.runInNewContext(`(function() {return {${comment.value}}})()`);
                }
                catch {
                    context.report({
                        node,
                        messageId: 'webpackComment',
                    });
                    return;
                }
                if (!commentStyleRegex.test(comment.value)) {
                    context.report({
                        node,
                        messageId: 'webpackComment',
                    });
                    return;
                }
                if (eagerModeRegex.test(comment.value)) {
                    isEagerModePresent = true;
                }
                if (chunkSubstrRegex.test(comment.value)) {
                    isChunknamePresent = true;
                }
            }
            const removeCommentsAndLeadingSpaces = (fixer, comment) => {
                const leftToken = sourceCode.getTokenBefore(comment);
                const leftComments = sourceCode.getCommentsBefore(comment);
                if (leftToken) {
                    if (leftComments.length > 0) {
                        return fixer.removeRange([
                            Math.max(leftToken.range[1], leftComments[leftComments.length - 1].range[1]),
                            comment.range[1],
                        ]);
                    }
                    return fixer.removeRange([leftToken.range[1], comment.range[1]]);
                }
                return fixer.remove(comment);
            };
            if (isChunknamePresent && isEagerModePresent) {
                context.report({
                    node,
                    messageId: 'webpackEagerModeNoChunkName',
                    suggest: [
                        {
                            messageId: 'webpackRemoveChunkName',
                            fix(fixer) {
                                for (const comment of leadingComments) {
                                    if (chunkSubstrRegex.test(comment.value)) {
                                        const replacement = comment.value
                                            .replace(chunkSubstrRegex, '')
                                            .trim()
                                            .replace(/,$/, '');
                                        return replacement === ''
                                            ? removeCommentsAndLeadingSpaces(fixer, comment)
                                            : fixer.replaceText(comment, `/* ${replacement} */`);
                                    }
                                }
                                return null;
                            },
                        },
                        {
                            messageId: 'webpackRemoveEagerMode',
                            fix(fixer) {
                                for (const comment of leadingComments) {
                                    if (eagerModeRegex.test(comment.value)) {
                                        const replacement = comment.value
                                            .replace(eagerModeRegex, '')
                                            .trim()
                                            .replace(/,$/, '');
                                        return replacement === ''
                                            ? removeCommentsAndLeadingSpaces(fixer, comment)
                                            : fixer.replaceText(comment, `/* ${replacement} */`);
                                    }
                                }
                                return null;
                            },
                        },
                    ],
                });
            }
            if (!isChunknamePresent && !allowEmpty && !isEagerModePresent) {
                context.report({
                    node,
                    messageId: 'chunknameFormat',
                    data: {
                        format: chunkSubstrFormat,
                    },
                });
            }
        }
        return {
            ImportExpression(node) {
                run(node, node.source);
            },
            CallExpression(node) {
                if (node.callee.type !== 'Import' &&
                    (!('name' in node.callee) ||
                        !importFunctions.includes(node.callee.name))) {
                    return;
                }
                run(node, node.arguments[0]);
            },
        };
    },
});
//# sourceMappingURL=dynamic-import-chunkname.js.map