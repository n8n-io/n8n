"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'method-signature-style',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Enforce using a particular method signature syntax',
        },
        fixable: 'code',
        messages: {
            errorMethod: 'Shorthand method signature is forbidden. Use a function property instead.',
            errorProperty: 'Function property signature is forbidden. Use a method shorthand instead.',
        },
        schema: [
            {
                type: 'string',
                enum: ['property', 'method'],
            },
        ],
    },
    defaultOptions: ['property'],
    create(context, [mode]) {
        function getMethodKey(node) {
            let key = context.sourceCode.getText(node.key);
            if (node.computed) {
                key = `[${key}]`;
            }
            if (node.optional) {
                key = `${key}?`;
            }
            if (node.readonly) {
                key = `readonly ${key}`;
            }
            return key;
        }
        function getMethodParams(node) {
            let params = '()';
            if (node.params.length > 0) {
                const openingParen = (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(node.params[0], util_1.isOpeningParenToken), 'Missing opening paren before first parameter');
                const closingParen = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(node.params[node.params.length - 1], util_1.isClosingParenToken), 'Missing closing paren after last parameter');
                params = context.sourceCode.text.substring(openingParen.range[0], closingParen.range[1]);
            }
            if (node.typeParameters != null) {
                const typeParams = context.sourceCode.getText(node.typeParameters);
                params = `${typeParams}${params}`;
            }
            return params;
        }
        function getMethodReturnType(node) {
            return node.returnType == null
                ? // if the method has no return type, it implicitly has an `any` return type
                    // we just make it explicit here so we can do the fix
                    'any'
                : context.sourceCode.getText(node.returnType.typeAnnotation);
        }
        function getDelimiter(node) {
            const lastToken = context.sourceCode.getLastToken(node);
            if (lastToken &&
                ((0, util_1.isSemicolonToken)(lastToken) || (0, util_1.isCommaToken)(lastToken))) {
                return lastToken.value;
            }
            return '';
        }
        function isNodeParentModuleDeclaration(node) {
            if (!node.parent) {
                return false;
            }
            if (node.parent.type === utils_1.AST_NODE_TYPES.TSModuleDeclaration) {
                return true;
            }
            if (node.parent.type === utils_1.AST_NODE_TYPES.Program) {
                return false;
            }
            return isNodeParentModuleDeclaration(node.parent);
        }
        return {
            ...(mode === 'property' && {
                TSMethodSignature(methodNode) {
                    if (methodNode.kind !== 'method') {
                        return;
                    }
                    const parent = methodNode.parent;
                    const members = parent.type === utils_1.AST_NODE_TYPES.TSInterfaceBody
                        ? parent.body
                        : parent.members;
                    const duplicatedKeyMethodNodes = members.filter((element) => element.type === utils_1.AST_NODE_TYPES.TSMethodSignature &&
                        element !== methodNode &&
                        getMethodKey(element) === getMethodKey(methodNode));
                    const isParentModule = isNodeParentModuleDeclaration(methodNode);
                    if (duplicatedKeyMethodNodes.length > 0) {
                        if (isParentModule) {
                            context.report({
                                node: methodNode,
                                messageId: 'errorMethod',
                            });
                        }
                        else {
                            context.report({
                                node: methodNode,
                                messageId: 'errorMethod',
                                *fix(fixer) {
                                    const methodNodes = [
                                        methodNode,
                                        ...duplicatedKeyMethodNodes,
                                    ].sort((a, b) => (a.range[0] < b.range[0] ? -1 : 1));
                                    const typeString = methodNodes
                                        .map(node => {
                                        const params = getMethodParams(node);
                                        const returnType = getMethodReturnType(node);
                                        return `(${params} => ${returnType})`;
                                    })
                                        .join(' & ');
                                    const key = getMethodKey(methodNode);
                                    const delimiter = getDelimiter(methodNode);
                                    yield fixer.replaceText(methodNode, `${key}: ${typeString}${delimiter}`);
                                    for (const node of duplicatedKeyMethodNodes) {
                                        const lastToken = context.sourceCode.getLastToken(node);
                                        if (lastToken) {
                                            const nextToken = context.sourceCode.getTokenAfter(lastToken);
                                            if (nextToken) {
                                                yield fixer.remove(node);
                                                yield fixer.replaceTextRange([lastToken.range[1], nextToken.range[0]], '');
                                            }
                                        }
                                    }
                                },
                            });
                        }
                        return;
                    }
                    if (isParentModule) {
                        context.report({
                            node: methodNode,
                            messageId: 'errorMethod',
                        });
                    }
                    else {
                        context.report({
                            node: methodNode,
                            messageId: 'errorMethod',
                            fix: fixer => {
                                const key = getMethodKey(methodNode);
                                const params = getMethodParams(methodNode);
                                const returnType = getMethodReturnType(methodNode);
                                const delimiter = getDelimiter(methodNode);
                                return fixer.replaceText(methodNode, `${key}: ${params} => ${returnType}${delimiter}`);
                            },
                        });
                    }
                },
            }),
            ...(mode === 'method' && {
                TSPropertySignature(propertyNode) {
                    const typeNode = propertyNode.typeAnnotation?.typeAnnotation;
                    if (typeNode?.type !== utils_1.AST_NODE_TYPES.TSFunctionType) {
                        return;
                    }
                    context.report({
                        node: propertyNode,
                        messageId: 'errorProperty',
                        fix: fixer => {
                            const key = getMethodKey(propertyNode);
                            const params = getMethodParams(typeNode);
                            const returnType = getMethodReturnType(typeNode);
                            const delimiter = getDelimiter(propertyNode);
                            return fixer.replaceText(propertyNode, `${key}${params}: ${returnType}${delimiter}`);
                        },
                    });
                },
            }),
        };
    },
});
