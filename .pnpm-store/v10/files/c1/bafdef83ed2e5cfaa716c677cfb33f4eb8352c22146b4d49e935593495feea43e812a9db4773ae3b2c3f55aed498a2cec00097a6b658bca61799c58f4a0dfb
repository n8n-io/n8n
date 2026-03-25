"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const tsutils = __importStar(require("ts-api-utils"));
const util_1 = require("../util");
const getForStatementHeadLoc_1 = require("../util/getForStatementHeadLoc");
exports.default = (0, util_1.createRule)({
    name: 'await-thenable',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow awaiting a value that is not a Thenable',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        hasSuggestions: true,
        messages: {
            await: 'Unexpected `await` of a non-Promise (non-"Thenable") value.',
            awaitUsingOfNonAsyncDisposable: 'Unexpected `await using` of a value that is not async disposable.',
            convertToOrdinaryFor: 'Convert to an ordinary `for...of` loop.',
            forAwaitOfNonAsyncIterable: 'Unexpected `for await...of` of a value that is not async iterable.',
            removeAwait: 'Remove unnecessary `await`.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        return {
            AwaitExpression(node) {
                const awaitArgumentEsNode = node.argument;
                const awaitArgumentType = services.getTypeAtLocation(awaitArgumentEsNode);
                const awaitArgumentTsNode = services.esTreeNodeToTSNodeMap.get(awaitArgumentEsNode);
                const certainty = (0, util_1.needsToBeAwaited)(checker, awaitArgumentTsNode, awaitArgumentType);
                if (certainty === util_1.Awaitable.Never) {
                    context.report({
                        node,
                        messageId: 'await',
                        suggest: [
                            {
                                messageId: 'removeAwait',
                                fix(fixer) {
                                    const awaitKeyword = (0, util_1.nullThrows)(context.sourceCode.getFirstToken(node, util_1.isAwaitKeyword), util_1.NullThrowsReasons.MissingToken('await', 'await expression'));
                                    return fixer.remove(awaitKeyword);
                                },
                            },
                        ],
                    });
                }
            },
            'ForOfStatement[await=true]'(node) {
                const type = services.getTypeAtLocation(node.right);
                if ((0, util_1.isTypeAnyType)(type)) {
                    return;
                }
                const hasAsyncIteratorSymbol = tsutils
                    .unionConstituents(type)
                    .some(typePart => tsutils.getWellKnownSymbolPropertyOfType(typePart, 'asyncIterator', checker) != null);
                if (!hasAsyncIteratorSymbol) {
                    context.report({
                        loc: (0, getForStatementHeadLoc_1.getForStatementHeadLoc)(context.sourceCode, node),
                        messageId: 'forAwaitOfNonAsyncIterable',
                        suggest: [
                            // Note that this suggestion causes broken code for sync iterables
                            // of promises, since the loop variable is not awaited.
                            {
                                messageId: 'convertToOrdinaryFor',
                                fix(fixer) {
                                    const awaitToken = (0, util_1.nullThrows)(context.sourceCode.getFirstToken(node, util_1.isAwaitKeyword), util_1.NullThrowsReasons.MissingToken('await', 'for await loop'));
                                    return fixer.remove(awaitToken);
                                },
                            },
                        ],
                    });
                }
            },
            'VariableDeclaration[kind="await using"]'(node) {
                for (const declarator of node.declarations) {
                    const init = declarator.init;
                    if (init == null) {
                        continue;
                    }
                    const type = services.getTypeAtLocation(init);
                    if ((0, util_1.isTypeAnyType)(type)) {
                        continue;
                    }
                    const hasAsyncDisposeSymbol = tsutils
                        .unionConstituents(type)
                        .some(typePart => tsutils.getWellKnownSymbolPropertyOfType(typePart, 'asyncDispose', checker) != null);
                    if (!hasAsyncDisposeSymbol) {
                        context.report({
                            node: init,
                            messageId: 'awaitUsingOfNonAsyncDisposable',
                            // let the user figure out what to do if there's
                            // await using a = b, c = d, e = f;
                            // it's rare and not worth the complexity to handle.
                            ...(0, util_1.getFixOrSuggest)({
                                fixOrSuggest: node.declarations.length === 1 ? 'suggest' : 'none',
                                suggestion: {
                                    messageId: 'removeAwait',
                                    fix(fixer) {
                                        const awaitToken = (0, util_1.nullThrows)(context.sourceCode.getFirstToken(node, util_1.isAwaitKeyword), util_1.NullThrowsReasons.MissingToken('await', 'await using'));
                                        return fixer.remove(awaitToken);
                                    },
                                },
                            }),
                        });
                    }
                }
            },
        };
    },
});
