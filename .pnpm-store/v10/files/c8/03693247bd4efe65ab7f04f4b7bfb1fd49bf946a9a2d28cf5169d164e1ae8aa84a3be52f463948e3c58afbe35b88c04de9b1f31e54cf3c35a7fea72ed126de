import debug from 'debug';
import { isStaticRequire, createRule } from '../utils/index.js';
const log = debug('eslint-plugin-import-x:rules:newline-after-import');
function containsNodeOrEqual(outerNode, innerNode) {
    return (outerNode.range[0] <= innerNode.range[0] &&
        outerNode.range[1] >= innerNode.range[1]);
}
function getScopeBody(scope) {
    if (scope.block.type === 'SwitchStatement') {
        log('SwitchStatement scopes not supported');
        return [];
    }
    const body = 'body' in scope.block ? scope.block.body : null;
    if (body && 'type' in body && body.type === 'BlockStatement') {
        return body.body;
    }
    return Array.isArray(body) ? body : [];
}
function findNodeIndexInScopeBody(body, nodeToFind) {
    return body.findIndex(node => containsNodeOrEqual(node, nodeToFind));
}
function getLineDifference(node, nextNode) {
    return nextNode.loc.start.line - node.loc.end.line;
}
function isClassWithDecorator(node) {
    return node.type === 'ClassDeclaration' && !!node.decorators?.length;
}
function isExportDefaultClass(node) {
    return (node.type === 'ExportDefaultDeclaration' &&
        node.declaration.type === 'ClassDeclaration');
}
function isExportNameClass(node) {
    return (node.type === 'ExportNamedDeclaration' &&
        node.declaration?.type === 'ClassDeclaration');
}
export default createRule({
    name: 'newline-after-import',
    meta: {
        type: 'layout',
        docs: {
            category: 'Style guide',
            description: 'Enforce a newline after import statements.',
        },
        fixable: 'whitespace',
        schema: [
            {
                type: 'object',
                properties: {
                    count: {
                        type: 'integer',
                        minimum: 1,
                    },
                    exactCount: { type: 'boolean' },
                    considerComments: { type: 'boolean' },
                },
                additionalProperties: false,
            },
        ],
        messages: {
            newline: 'Expected {{count}} empty line{{lineSuffix}} after {{type}} statement not followed by another {{type}}.',
        },
    },
    defaultOptions: [],
    create(context) {
        let level = 0;
        const requireCalls = [];
        const options = {
            count: 1,
            exactCount: false,
            considerComments: false,
            ...context.options[0],
        };
        function checkForNewLine(node, nextNode, type) {
            if (isExportDefaultClass(nextNode) || isExportNameClass(nextNode)) {
                const classNode = nextNode.declaration;
                if (isClassWithDecorator(classNode)) {
                    nextNode = classNode.decorators[0];
                }
            }
            else if (isClassWithDecorator(nextNode)) {
                nextNode = nextNode.decorators[0];
            }
            const lineDifference = getLineDifference(node, nextNode);
            const EXPECTED_LINE_DIFFERENCE = options.count + 1;
            if (lineDifference < EXPECTED_LINE_DIFFERENCE ||
                (options.exactCount && lineDifference !== EXPECTED_LINE_DIFFERENCE)) {
                let column = node.loc.start.column;
                if (node.loc.start.line !== node.loc.end.line) {
                    column = 0;
                }
                context.report({
                    loc: {
                        line: node.loc.end.line,
                        column,
                    },
                    messageId: 'newline',
                    data: {
                        count: options.count,
                        lineSuffix: options.count > 1 ? 's' : '',
                        type,
                    },
                    fix: options.exactCount && EXPECTED_LINE_DIFFERENCE < lineDifference
                        ? undefined
                        : fixer => fixer.insertTextAfter(node, '\n'.repeat(EXPECTED_LINE_DIFFERENCE - lineDifference)),
                });
            }
        }
        function commentAfterImport(node, nextComment, type) {
            const lineDifference = getLineDifference(node, nextComment);
            const EXPECTED_LINE_DIFFERENCE = options.count + 1;
            if (lineDifference < EXPECTED_LINE_DIFFERENCE) {
                let column = node.loc.start.column;
                if (node.loc.start.line !== node.loc.end.line) {
                    column = 0;
                }
                context.report({
                    loc: {
                        line: node.loc.end.line,
                        column,
                    },
                    messageId: 'newline',
                    data: {
                        count: options.count,
                        lineSuffix: options.count > 1 ? 's' : '',
                        type,
                    },
                    fix: options.exactCount && EXPECTED_LINE_DIFFERENCE < lineDifference
                        ? undefined
                        : fixer => fixer.insertTextAfter(node, '\n'.repeat(EXPECTED_LINE_DIFFERENCE - lineDifference)),
                });
            }
        }
        function incrementLevel() {
            level++;
        }
        function decrementLevel() {
            level--;
        }
        function checkImport(node) {
            const { parent } = node;
            if (!parent || !('body' in parent) || !parent.body) {
                return;
            }
            const root = parent;
            const nodePosition = root.body.indexOf(node);
            const nextNode = root.body[nodePosition + 1];
            const endLine = node.loc.end.line;
            let nextComment;
            if (root.comments !== undefined && options.considerComments) {
                nextComment = root.comments.find(o => o.loc.start.line >= endLine &&
                    o.loc.start.line <= endLine + options.count + 1);
            }
            if (node.type === 'TSImportEqualsDeclaration' &&
                node.isExport) {
                return;
            }
            if (nextComment) {
                commentAfterImport(node, nextComment, 'import');
            }
            else if (nextNode &&
                nextNode.type !== 'ImportDeclaration' &&
                (nextNode.type !== 'TSImportEqualsDeclaration' ||
                    nextNode.isExport)) {
                checkForNewLine(node, nextNode, 'import');
            }
        }
        return {
            ImportDeclaration: checkImport,
            TSImportEqualsDeclaration: checkImport,
            CallExpression(node) {
                if (isStaticRequire(node) && level === 0) {
                    requireCalls.push(node);
                }
            },
            'Program:exit'(node) {
                log('exit processing for', context.physicalFilename);
                const scopeBody = getScopeBody(context.sourceCode.getScope(node));
                log('got scope:', scopeBody);
                for (const [index, node] of requireCalls.entries()) {
                    const nodePosition = findNodeIndexInScopeBody(scopeBody, node);
                    log('node position in scope:', nodePosition);
                    const statementWithRequireCall = scopeBody[nodePosition];
                    const nextStatement = scopeBody[nodePosition + 1];
                    const nextRequireCall = requireCalls[index + 1];
                    if (nextRequireCall &&
                        containsNodeOrEqual(statementWithRequireCall, nextRequireCall)) {
                        continue;
                    }
                    if (nextStatement &&
                        (!nextRequireCall ||
                            !containsNodeOrEqual(nextStatement, nextRequireCall))) {
                        let nextComment;
                        if ('comments' in statementWithRequireCall.parent &&
                            statementWithRequireCall.parent.comments !== undefined &&
                            options.considerComments) {
                            const endLine = node.loc.end.line;
                            nextComment = statementWithRequireCall.parent.comments.find(o => o.loc.start.line >= endLine &&
                                o.loc.start.line <= endLine + options.count + 1);
                        }
                        if (nextComment && nextComment !== undefined) {
                            commentAfterImport(statementWithRequireCall, nextComment, 'require');
                        }
                        else {
                            checkForNewLine(statementWithRequireCall, nextStatement, 'require');
                        }
                    }
                }
            },
            FunctionDeclaration: incrementLevel,
            FunctionExpression: incrementLevel,
            ArrowFunctionExpression: incrementLevel,
            BlockStatement: incrementLevel,
            ObjectExpression: incrementLevel,
            Decorator: incrementLevel,
            'FunctionDeclaration:exit': decrementLevel,
            'FunctionExpression:exit': decrementLevel,
            'ArrowFunctionExpression:exit': decrementLevel,
            'BlockStatement:exit': decrementLevel,
            'ObjectExpression:exit': decrementLevel,
            'Decorator:exit': decrementLevel,
        };
    },
});
//# sourceMappingURL=newline-after-import.js.map