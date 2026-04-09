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
    name: 'no-unnecessary-type-arguments',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow type arguments that are equal to the default',
            recommended: 'strict',
            requiresTypeChecking: true,
        },
        fixable: 'code',
        messages: {
            canBeInferred: 'This value can be trivially inferred for this type parameter, so it can be omitted.',
            isDefaultParameterValue: 'This is the default value for this type parameter, so it can be omitted.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const checker = services.program.getTypeChecker();
        function isEmptyObjectType(type) {
            if (!tsutils.isTypeFlagSet(type, ts.TypeFlags.Object)) {
                return false;
            }
            if (type.getProperties().length) {
                return false;
            }
            if (type.getStringIndexType() || type.getNumberIndexType()) {
                return false;
            }
            return true;
        }
        function areTypesEquivalent(a, b) {
            // If either type is `any` (including when they're unresolved) or `{}`,
            // they should be considered equivalent if they're explicitly the same reference
            if (tsutils.isTypeFlagSet(a, ts.TypeFlags.Any) ||
                tsutils.isTypeFlagSet(b, ts.TypeFlags.Any) ||
                isEmptyObjectType(a) ||
                isEmptyObjectType(b)) {
                return a === b;
            }
            return (checker.isTypeAssignableTo(a, b) && checker.isTypeAssignableTo(b, a));
        }
        function checkTSArgsAndParameters(typeArguments, typeParameters, tsNode) {
            // Just check the last one. Must specify previous type parameters if the last one is specified.
            const i = typeArguments.params.length - 1;
            const typeArgument = typeArguments.params[i];
            const typeParameter = typeParameters.at(i);
            if (!typeParameter) {
                return;
            }
            const typeArgumentType = services.getTypeAtLocation(typeArgument);
            const parent = typeArguments.parent;
            if (parent.type === utils_1.AST_NODE_TYPES.CallExpression ||
                parent.type === utils_1.AST_NODE_TYPES.NewExpression) {
                const sig = checker.getResolvedSignature(tsNode);
                parent.arguments.forEach((argument, i) => {
                    const parameter = sig?.parameters.at(i);
                    if (!parameter?.valueDeclaration ||
                        !ts.isParameter(parameter.valueDeclaration) ||
                        !parameter.valueDeclaration.type) {
                        return;
                    }
                    const typeParameterType = checker.getTypeAtLocation(typeParameter);
                    const parameterTypeFromDeclaration = checker.getTypeFromTypeNode(parameter.valueDeclaration.type);
                    // TODO: right now we check if the type is declared as `T` or `T | something`;
                    // we should really be checking if `parameterTypeFromDeclaration` depends on `typeParameterType` somehow
                    // (e.g. `NonNullable<T>`, `(arg: T) => void`, etc.)
                    if (!checker.isTypeAssignableTo(typeParameterType, parameterTypeFromDeclaration)) {
                        return;
                    }
                    const argumentType = checker.getBaseTypeOfLiteralType(services.getTypeAtLocation(argument));
                    if (areTypesEquivalent(typeArgumentType, argumentType)) {
                        context.report({
                            node: typeArgument,
                            messageId: 'canBeInferred',
                            fix: fixer => fixer.removeRange(i === 0
                                ? typeArguments.range
                                : [
                                    typeArguments.params[i - 1].range[1],
                                    typeArgument.range[1],
                                ]),
                        });
                    }
                });
            }
            if (!typeParameter.default) {
                return;
            }
            const defaultType = checker.getTypeAtLocation(typeParameter.default);
            if (!areTypesEquivalent(defaultType, typeArgumentType)) {
                return;
            }
            context.report({
                node: typeArgument,
                messageId: 'isDefaultParameterValue',
                fix: fixer => fixer.removeRange(i === 0
                    ? typeArguments.range
                    : [typeArguments.params[i - 1].range[1], typeArgument.range[1]]),
            });
        }
        return {
            TSTypeParameterInstantiation(node) {
                const expression = services.esTreeNodeToTSNodeMap.get(node);
                const typeParameters = getTypeParametersFromNode(node, expression, checker);
                if (typeParameters) {
                    checkTSArgsAndParameters(node, typeParameters, expression);
                }
            },
        };
    },
});
function getTypeParametersFromNode(node, tsNode, checker) {
    if (ts.isExpressionWithTypeArguments(tsNode)) {
        return getTypeParametersFromType(node, tsNode.expression, checker);
    }
    if (ts.isTypeReferenceNode(tsNode)) {
        return getTypeParametersFromType(node, tsNode.typeName, checker);
    }
    if (ts.isCallExpression(tsNode) ||
        ts.isNewExpression(tsNode) ||
        ts.isTaggedTemplateExpression(tsNode) ||
        ts.isJsxOpeningElement(tsNode) ||
        ts.isJsxSelfClosingElement(tsNode)) {
        return getTypeParametersFromCall(node, tsNode, checker);
    }
    return undefined;
}
function getTypeParametersFromType(node, type, checker) {
    const symAtLocation = checker.getSymbolAtLocation(type);
    if (!symAtLocation) {
        return undefined;
    }
    const sym = getAliasedSymbol(symAtLocation, checker);
    const declarations = sym.getDeclarations();
    if (!declarations) {
        return undefined;
    }
    const sortedDeclarations = sortDeclarationsByTypeValueContext(node, declarations);
    return (0, util_1.findFirstResult)(sortedDeclarations, decl => {
        if (ts.isTypeAliasDeclaration(decl) ||
            ts.isInterfaceDeclaration(decl) ||
            ts.isClassLike(decl)) {
            return decl.typeParameters;
        }
        if (ts.isVariableDeclaration(decl)) {
            return getConstructSignatureDeclaration(symAtLocation, checker)
                ?.typeParameters;
        }
        return undefined;
    });
}
function getTypeParametersFromCall(node, tsNode, checker) {
    const sig = checker.getResolvedSignature(tsNode);
    const sigDecl = sig?.getDeclaration();
    if (!sigDecl?.typeParameters) {
        return ts.isNewExpression(tsNode)
            ? getTypeParametersFromType(node, tsNode.expression, checker)
            : undefined;
    }
    return sigDecl.typeParameters;
}
function getAliasedSymbol(symbol, checker) {
    return tsutils.isSymbolFlagSet(symbol, ts.SymbolFlags.Alias)
        ? checker.getAliasedSymbol(symbol)
        : symbol;
}
function isInTypeContext(node) {
    return (node.parent.type === utils_1.AST_NODE_TYPES.TSInterfaceHeritage ||
        node.parent.type === utils_1.AST_NODE_TYPES.TSTypeReference ||
        node.parent.type === utils_1.AST_NODE_TYPES.TSClassImplements);
}
function isTypeContextDeclaration(decl) {
    return ts.isTypeAliasDeclaration(decl) || ts.isInterfaceDeclaration(decl);
}
function typeFirstCompare(declA, declB) {
    const aIsType = isTypeContextDeclaration(declA);
    const bIsType = isTypeContextDeclaration(declB);
    return Number(bIsType) - Number(aIsType);
}
function sortDeclarationsByTypeValueContext(node, declarations) {
    const sorted = [...declarations].sort(typeFirstCompare);
    if (isInTypeContext(node)) {
        return sorted;
    }
    return sorted.reverse();
}
function getConstructSignatureDeclaration(symbol, checker) {
    const type = checker.getTypeOfSymbol(symbol);
    const sig = type.getConstructSignatures();
    return sig.at(0)?.getDeclaration();
}
