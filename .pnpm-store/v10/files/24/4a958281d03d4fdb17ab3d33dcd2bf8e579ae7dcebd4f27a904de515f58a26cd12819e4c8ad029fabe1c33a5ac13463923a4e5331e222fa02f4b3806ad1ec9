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
const utils_1 = require("@typescript-eslint/utils");
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'no-unnecessary-type-assertion',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow type assertions that do not change the type of an expression',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        messages: {
            contextuallyUnnecessary: 'This assertion is unnecessary since the receiver accepts the original type of the expression.',
            unnecessaryAssertion: 'This assertion is unnecessary since it does not change the type of the expression.',
        },
        schema: [
            {
                type: 'object',
                additionalProperties: false,
                properties: {
                    checkLiteralConstAssertions: {
                        type: 'boolean',
                        description: 'Whether to check literal const assertions.',
                    },
                    typesToIgnore: {
                        type: 'array',
                        description: 'A list of type names to ignore.',
                        items: {
                            type: 'string',
                        },
                    },
                },
            },
        ],
    },
    defaultOptions: [{}],
    create(context, [options]) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        const compilerOptions = services.program.getCompilerOptions();
        /**
         * Returns true if there's a chance the variable has been used before a value has been assigned to it
         */
        function isPossiblyUsedBeforeAssigned(node) {
            const declaration = (0, util_1.getDeclaration)(services, node);
            if (!declaration) {
                // don't know what the declaration is for some reason, so just assume the worst
                return true;
            }
            if (
            // non-strict mode doesn't care about used before assigned errors
            tsutils.isStrictCompilerOptionEnabled(compilerOptions, 'strictNullChecks') &&
                // ignore class properties as they are compile time guarded
                // also ignore function arguments as they can't be used before defined
                ts.isVariableDeclaration(declaration)) {
                // For var declarations, we need to check whether the node
                // is actually in a descendant of its declaration or not. If not,
                // it may be used before defined.
                // eg
                // if (Math.random() < 0.5) {
                //     var x: number  = 2;
                // } else {
                //     x!.toFixed();
                // }
                if (ts.isVariableDeclarationList(declaration.parent) &&
                    // var
                    declaration.parent.flags === ts.NodeFlags.None &&
                    // If they are not in the same file it will not exist.
                    // This situation must not occur using before defined.
                    services.tsNodeToESTreeNodeMap.has(declaration)) {
                    const declaratorNode = services.tsNodeToESTreeNodeMap.get(declaration);
                    const scope = context.sourceCode.getScope(node);
                    const declaratorScope = context.sourceCode.getScope(declaratorNode);
                    let parentScope = declaratorScope;
                    while ((parentScope = parentScope.upper)) {
                        if (parentScope === scope) {
                            return true;
                        }
                    }
                }
                if (
                // is it `const x!: number`
                declaration.initializer == null &&
                    declaration.exclamationToken == null &&
                    declaration.type != null) {
                    // check if the defined variable type has changed since assignment
                    const declarationType = checker.getTypeFromTypeNode(declaration.type);
                    const type = (0, util_1.getConstrainedTypeAtLocation)(services, node);
                    if (declarationType === type &&
                        // `declare`s are never narrowed, so never skip them
                        !(ts.isVariableDeclarationList(declaration.parent) &&
                            ts.isVariableStatement(declaration.parent.parent) &&
                            tsutils.includesModifier((0, util_1.getModifiers)(declaration.parent.parent), ts.SyntaxKind.DeclareKeyword))) {
                        // possibly used before assigned, so just skip it
                        // better to false negative and skip it, than false positive and fix to compile erroring code
                        //
                        // no better way to figure this out right now
                        // https://github.com/Microsoft/TypeScript/issues/31124
                        return true;
                    }
                }
            }
            return false;
        }
        function isConstAssertion(node) {
            return (node.type === utils_1.AST_NODE_TYPES.TSTypeReference &&
                node.typeName.type === utils_1.AST_NODE_TYPES.Identifier &&
                node.typeName.name === 'const');
        }
        function isTemplateLiteralWithExpressions(expression) {
            return (expression.type === utils_1.AST_NODE_TYPES.TemplateLiteral &&
                expression.expressions.length !== 0);
        }
        function isImplicitlyNarrowedLiteralDeclaration({ expression, parent, }) {
            /**
             * Even on `const` variable declarations, template literals with expressions can sometimes be widened without a type assertion.
             * @see https://github.com/typescript-eslint/typescript-eslint/issues/8737
             */
            if (isTemplateLiteralWithExpressions(expression)) {
                return false;
            }
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const maybeDeclarationNode = parent.parent;
            return ((maybeDeclarationNode.type === utils_1.AST_NODE_TYPES.VariableDeclaration &&
                maybeDeclarationNode.kind === 'const') ||
                (parent.type === utils_1.AST_NODE_TYPES.PropertyDefinition && parent.readonly));
        }
        function isTypeUnchanged(uncast, cast) {
            if (uncast === cast) {
                return true;
            }
            if ((0, util_1.isTypeFlagSet)(uncast, ts.TypeFlags.Undefined) &&
                (0, util_1.isTypeFlagSet)(cast, ts.TypeFlags.Undefined) &&
                tsutils.isCompilerOptionEnabled(compilerOptions, 'exactOptionalPropertyTypes')) {
                const uncastParts = tsutils
                    .unionConstituents(uncast)
                    .filter(part => !(0, util_1.isTypeFlagSet)(part, ts.TypeFlags.Undefined));
                const castParts = tsutils
                    .unionConstituents(cast)
                    .filter(part => !(0, util_1.isTypeFlagSet)(part, ts.TypeFlags.Undefined));
                if (uncastParts.length !== castParts.length) {
                    return false;
                }
                const uncastPartsSet = new Set(uncastParts);
                return castParts.every(part => uncastPartsSet.has(part));
            }
            return false;
        }
        function isTypeLiteral(type) {
            return type.isLiteral() || tsutils.isBooleanLiteralType(type);
        }
        function isIIFE(expression) {
            return (expression.type === utils_1.AST_NODE_TYPES.CallExpression &&
                (expression.callee.type === utils_1.AST_NODE_TYPES.ArrowFunctionExpression ||
                    expression.callee.type === utils_1.AST_NODE_TYPES.FunctionExpression));
        }
        function getUncastType(node) {
            // Special handling for IIFE: extract the function's return type
            if (isIIFE(node.expression)) {
                const callee = node.expression.callee;
                const functionType = services.getTypeAtLocation(callee);
                const signatures = functionType.getCallSignatures();
                if (signatures.length > 0) {
                    const returnType = checker.getReturnTypeOfSignature(signatures[0]);
                    // If the function has no explicit return type annotation and returns undefined,
                    // treat it as void (TypeScript infers () => {} as () => undefined, but it should be void)
                    if (callee.returnType == null &&
                        (0, util_1.isTypeFlagSet)(returnType, ts.TypeFlags.Undefined)) {
                        return checker.getVoidType();
                    }
                    return returnType;
                }
            }
            return services.getTypeAtLocation(node.expression);
        }
        return {
            'TSAsExpression, TSTypeAssertion'(node) {
                if (options.typesToIgnore?.includes(context.sourceCode.getText(node.typeAnnotation))) {
                    return;
                }
                const castType = services.getTypeAtLocation(node);
                const castTypeIsLiteral = isTypeLiteral(castType);
                const typeAnnotationIsConstAssertion = isConstAssertion(node.typeAnnotation);
                if (!options.checkLiteralConstAssertions &&
                    castTypeIsLiteral &&
                    typeAnnotationIsConstAssertion) {
                    return;
                }
                const uncastType = getUncastType(node);
                const typeIsUnchanged = isTypeUnchanged(uncastType, castType);
                const wouldSameTypeBeInferred = castTypeIsLiteral
                    ? isImplicitlyNarrowedLiteralDeclaration(node)
                    : !typeAnnotationIsConstAssertion;
                if (typeIsUnchanged && wouldSameTypeBeInferred) {
                    context.report({
                        node,
                        messageId: 'unnecessaryAssertion',
                        fix(fixer) {
                            if (node.type === utils_1.AST_NODE_TYPES.TSTypeAssertion) {
                                const openingAngleBracket = (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(node.typeAnnotation, token => token.type === utils_1.AST_TOKEN_TYPES.Punctuator &&
                                    token.value === '<'), util_1.NullThrowsReasons.MissingToken('<', 'type annotation'));
                                const closingAngleBracket = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(node.typeAnnotation, token => token.type === utils_1.AST_TOKEN_TYPES.Punctuator &&
                                    token.value === '>'), util_1.NullThrowsReasons.MissingToken('>', 'type annotation'));
                                // < ( number ) > ( 3 + 5 )
                                // ^---remove---^
                                return fixer.removeRange([
                                    openingAngleBracket.range[0],
                                    closingAngleBracket.range[1],
                                ]);
                            }
                            // `as` is always present in TSAsExpression
                            const asToken = (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(node.expression, token => token.type === utils_1.AST_TOKEN_TYPES.Identifier &&
                                token.value === 'as'), util_1.NullThrowsReasons.MissingToken('>', 'type annotation'));
                            const tokenBeforeAs = (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(asToken, {
                                includeComments: true,
                            }), util_1.NullThrowsReasons.MissingToken('comment', 'as'));
                            // ( 3 + 5 )  as  number
                            //          ^--remove--^
                            return fixer.removeRange([tokenBeforeAs.range[1], node.range[1]]);
                        },
                    });
                }
                // TODO - add contextually unnecessary check for this
            },
            TSNonNullExpression(node) {
                const removeExclamationFix = fixer => {
                    const exclamationToken = (0, util_1.nullThrows)(context.sourceCode.getLastToken(node, token => token.value === '!'), util_1.NullThrowsReasons.MissingToken('exclamation mark', 'non-null assertion'));
                    return fixer.removeRange(exclamationToken.range);
                };
                if (node.parent.type === utils_1.AST_NODE_TYPES.AssignmentExpression &&
                    node.parent.operator === '=') {
                    if (node.parent.left === node) {
                        context.report({
                            node,
                            messageId: 'contextuallyUnnecessary',
                            fix: removeExclamationFix,
                        });
                    }
                    // for all other = assignments we ignore non-null checks
                    // this is because non-null assertions can change the type-flow of the code
                    // so whilst they might be unnecessary for the assignment - they are necessary
                    // for following code
                    return;
                }
                const originalNode = services.esTreeNodeToTSNodeMap.get(node);
                const constrainedType = (0, util_1.getConstrainedTypeAtLocation)(services, node.expression);
                const actualType = services.getTypeAtLocation(node.expression);
                // Check both the constrained type and the actual type.
                // If either is nullable, we should not report the assertion as unnecessary.
                // This handles cases like generic constraints with `any` where the
                // constrained type is `any` (nullable) but the actual type might be
                // a type parameter that TypeScript treats nominally.
                // See: https://github.com/typescript-eslint/typescript-eslint/issues/11559
                const constrainedTypeIsNullable = (0, util_1.isNullableType)(constrainedType);
                const actualTypeIsNullable = (0, util_1.isNullableType)(actualType);
                if (!constrainedTypeIsNullable && !actualTypeIsNullable) {
                    if (node.expression.type === utils_1.AST_NODE_TYPES.Identifier &&
                        isPossiblyUsedBeforeAssigned(node.expression)) {
                        return;
                    }
                    context.report({
                        node,
                        messageId: 'unnecessaryAssertion',
                        fix: removeExclamationFix,
                    });
                }
                else {
                    // we know it's a nullable type
                    // so figure out if the variable is used in a place that accepts nullable types
                    // If the constrained type differs from the actual type (e.g., when dealing
                    // with unresolved generic type parameters), we should not report the assertion
                    // as contextually unnecessary. TypeScript may still require the assertion
                    // even if the constraint is nullable (like `any`).
                    // See: https://github.com/typescript-eslint/typescript-eslint/issues/11559
                    if (constrainedType !== actualType) {
                        return;
                    }
                    const contextualType = (0, util_1.getContextualType)(checker, originalNode);
                    if (contextualType) {
                        if ((0, util_1.isTypeFlagSet)(constrainedType, ts.TypeFlags.Unknown) &&
                            !(0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Unknown)) {
                            return;
                        }
                        // in strict mode you can't assign null to undefined, so we have to make sure that
                        // the two types share a nullable type
                        const typeIncludesUndefined = (0, util_1.isTypeFlagSet)(constrainedType, ts.TypeFlags.Undefined);
                        const typeIncludesNull = (0, util_1.isTypeFlagSet)(constrainedType, ts.TypeFlags.Null);
                        const typeIncludesVoid = (0, util_1.isTypeFlagSet)(constrainedType, ts.TypeFlags.Void);
                        const contextualTypeIncludesUndefined = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Undefined);
                        const contextualTypeIncludesNull = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Null);
                        const contextualTypeIncludesVoid = (0, util_1.isTypeFlagSet)(contextualType, ts.TypeFlags.Void);
                        // make sure that the parent accepts the same types
                        // i.e. assigning `string | null | undefined` to `string | undefined` is invalid
                        const isValidUndefined = typeIncludesUndefined
                            ? contextualTypeIncludesUndefined
                            : true;
                        const isValidNull = typeIncludesNull
                            ? contextualTypeIncludesNull
                            : true;
                        const isValidVoid = typeIncludesVoid
                            ? contextualTypeIncludesVoid
                            : true;
                        if (isValidUndefined && isValidNull && isValidVoid) {
                            context.report({
                                node,
                                messageId: 'contextuallyUnnecessary',
                                fix: removeExclamationFix,
                            });
                        }
                    }
                }
            },
        };
    },
});
