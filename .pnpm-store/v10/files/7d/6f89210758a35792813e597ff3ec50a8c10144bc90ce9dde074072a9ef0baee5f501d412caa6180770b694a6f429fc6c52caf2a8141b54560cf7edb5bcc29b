"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'consistent-indexed-object-style',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Require or disallow the `Record` type',
            recommended: 'stylistic',
        },
        fixable: 'code',
        // eslint-disable-next-line eslint-plugin/require-meta-has-suggestions -- suggestions are exposed through a helper.
        hasSuggestions: true,
        messages: {
            preferIndexSignature: 'An index signature is preferred over a record.',
            preferIndexSignatureSuggestion: 'Change into an index signature instead of a record.',
            preferRecord: 'A record is preferred over an index signature.',
        },
        schema: [
            {
                type: 'string',
                description: 'Which indexed object syntax to prefer.',
                enum: ['record', 'index-signature'],
            },
        ],
    },
    defaultOptions: ['record'],
    create(context, [mode]) {
        function checkMembers(members, node, parentId, prefix, postfix, safeFix = true) {
            if (members.length !== 1) {
                return;
            }
            const [member] = members;
            if (member.type !== utils_1.AST_NODE_TYPES.TSIndexSignature) {
                return;
            }
            const parameter = member.parameters.at(0);
            if (parameter?.type !== utils_1.AST_NODE_TYPES.Identifier) {
                return;
            }
            const keyType = parameter.typeAnnotation;
            if (!keyType) {
                return;
            }
            const valueType = member.typeAnnotation;
            if (!valueType) {
                return;
            }
            if (parentId) {
                const scope = context.sourceCode.getScope(parentId);
                const superVar = utils_1.ASTUtils.findVariable(scope, parentId.name);
                if (superVar &&
                    isDeeplyReferencingType(node, superVar, new Set([parentId]))) {
                    return;
                }
            }
            context.report({
                node,
                messageId: 'preferRecord',
                fix: safeFix
                    ? (fixer) => {
                        const key = context.sourceCode.getText(keyType.typeAnnotation);
                        const value = context.sourceCode.getText(valueType.typeAnnotation);
                        const record = member.readonly
                            ? `Readonly<Record<${key}, ${value}>>`
                            : `Record<${key}, ${value}>`;
                        return fixer.replaceText(node, `${prefix}${record}${postfix}`);
                    }
                    : null,
            });
        }
        return {
            ...(mode === 'index-signature' && {
                TSTypeReference(node) {
                    const typeName = node.typeName;
                    if (typeName.type !== utils_1.AST_NODE_TYPES.Identifier) {
                        return;
                    }
                    if (typeName.name !== 'Record') {
                        return;
                    }
                    const params = node.typeArguments?.params;
                    if (params?.length !== 2) {
                        return;
                    }
                    const indexParam = params[0];
                    const shouldFix = indexParam.type === utils_1.AST_NODE_TYPES.TSStringKeyword ||
                        indexParam.type === utils_1.AST_NODE_TYPES.TSNumberKeyword ||
                        indexParam.type === utils_1.AST_NODE_TYPES.TSSymbolKeyword;
                    context.report({
                        node,
                        messageId: 'preferIndexSignature',
                        ...(0, util_1.getFixOrSuggest)({
                            fixOrSuggest: shouldFix ? 'fix' : 'suggest',
                            suggestion: {
                                messageId: 'preferIndexSignatureSuggestion',
                                fix: fixer => {
                                    const key = context.sourceCode.getText(params[0]);
                                    const type = context.sourceCode.getText(params[1]);
                                    return fixer.replaceText(node, `{ [key: ${key}]: ${type} }`);
                                },
                            },
                        }),
                    });
                },
            }),
            ...(mode === 'record' && {
                TSInterfaceDeclaration(node) {
                    let genericTypes = '';
                    if (node.typeParameters?.params.length) {
                        genericTypes = `<${node.typeParameters.params
                            .map(p => context.sourceCode.getText(p))
                            .join(', ')}>`;
                    }
                    checkMembers(node.body.body, node, node.id, `type ${node.id.name}${genericTypes} = `, ';', !node.extends.length);
                },
                TSMappedType(node) {
                    const key = node.key;
                    const scope = context.sourceCode.getScope(key);
                    const scopeManagerKey = (0, util_1.nullThrows)(scope.variables.find(value => value.name === key.name && value.isTypeVariable), 'key type parameter must be a defined type variable in its scope');
                    // If the key is used to compute the value, we can't convert to a Record.
                    if (scopeManagerKey.references.some(reference => reference.isTypeReference)) {
                        return;
                    }
                    const constraint = node.constraint;
                    if (constraint.type === utils_1.AST_NODE_TYPES.TSTypeOperator &&
                        constraint.operator === 'keyof' &&
                        !(0, util_1.isParenthesized)(constraint, context.sourceCode)) {
                        // This is a weird special case, since modifiers are preserved by
                        // the mapped type, but not by the Record type. So this type is not,
                        // in general, equivalent to a Record type.
                        return;
                    }
                    // If the mapped type is circular, we can't convert it to a Record.
                    const parentId = findParentDeclaration(node)?.id;
                    if (parentId) {
                        const scope = context.sourceCode.getScope(key);
                        const superVar = utils_1.ASTUtils.findVariable(scope, parentId.name);
                        if (superVar) {
                            const isCircular = isDeeplyReferencingType(node.parent, superVar, new Set([parentId]));
                            if (isCircular) {
                                return;
                            }
                        }
                    }
                    // There's no builtin Mutable<T> type, so we can't autofix it really.
                    const canFix = node.readonly !== '-';
                    context.report({
                        node,
                        messageId: 'preferRecord',
                        ...(canFix && {
                            fix: (fixer) => {
                                const keyType = context.sourceCode.getText(constraint);
                                const valueType = node.typeAnnotation
                                    ? context.sourceCode.getText(node.typeAnnotation)
                                    : 'any';
                                let recordText = `Record<${keyType}, ${valueType}>`;
                                if (node.optional === '+' || node.optional === true) {
                                    recordText = `Partial<${recordText}>`;
                                }
                                else if (node.optional === '-') {
                                    recordText = `Required<${recordText}>`;
                                }
                                if (node.readonly === '+' || node.readonly === true) {
                                    recordText = `Readonly<${recordText}>`;
                                }
                                return fixer.replaceText(node, recordText);
                            },
                        }),
                    });
                },
                TSTypeLiteral(node) {
                    const parent = findParentDeclaration(node);
                    checkMembers(node.members, node, parent?.id, '', '');
                },
            }),
        };
    },
});
function findParentDeclaration(node) {
    if (node.parent && node.parent.type !== utils_1.AST_NODE_TYPES.TSTypeAnnotation) {
        if (node.parent.type === utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration) {
            return node.parent;
        }
        return findParentDeclaration(node.parent);
    }
    return undefined;
}
function isDeeplyReferencingType(node, superVar, visited) {
    if (visited.has(node)) {
        // something on the chain is circular but it's not the reference being checked
        return false;
    }
    visited.add(node);
    switch (node.type) {
        case utils_1.AST_NODE_TYPES.TSTypeLiteral:
            return node.members.some(member => isDeeplyReferencingType(member, superVar, visited));
        case utils_1.AST_NODE_TYPES.TSTypeAliasDeclaration:
            return isDeeplyReferencingType(node.typeAnnotation, superVar, visited);
        case utils_1.AST_NODE_TYPES.TSIndexedAccessType:
            return [node.indexType, node.objectType].some(type => isDeeplyReferencingType(type, superVar, visited));
        case utils_1.AST_NODE_TYPES.TSMappedType:
            if (node.typeAnnotation) {
                return isDeeplyReferencingType(node.typeAnnotation, superVar, visited);
            }
            break;
        case utils_1.AST_NODE_TYPES.TSConditionalType:
            return [
                node.checkType,
                node.extendsType,
                node.falseType,
                node.trueType,
            ].some(type => isDeeplyReferencingType(type, superVar, visited));
        case utils_1.AST_NODE_TYPES.TSUnionType:
        case utils_1.AST_NODE_TYPES.TSIntersectionType:
            return node.types.some(type => isDeeplyReferencingType(type, superVar, visited));
        case utils_1.AST_NODE_TYPES.TSInterfaceDeclaration:
            return node.body.body.some(type => isDeeplyReferencingType(type, superVar, visited));
        case utils_1.AST_NODE_TYPES.TSTypeAnnotation:
            return isDeeplyReferencingType(node.typeAnnotation, superVar, visited);
        case utils_1.AST_NODE_TYPES.TSIndexSignature: {
            if (node.typeAnnotation) {
                return isDeeplyReferencingType(node.typeAnnotation, superVar, visited);
            }
            break;
        }
        case utils_1.AST_NODE_TYPES.TSTypeParameterInstantiation: {
            return node.params.some(param => isDeeplyReferencingType(param, superVar, visited));
        }
        case utils_1.AST_NODE_TYPES.TSTypeReference: {
            if (isDeeplyReferencingType(node.typeName, superVar, visited)) {
                return true;
            }
            if (node.typeArguments &&
                isDeeplyReferencingType(node.typeArguments, superVar, visited)) {
                return true;
            }
            break;
        }
        case utils_1.AST_NODE_TYPES.Identifier: {
            // check if the identifier is a reference of the type being checked
            if (superVar.references.some(ref => (0, util_1.isNodeEqual)(ref.identifier, node))) {
                return true;
            }
            // otherwise, follow its definition(s)
            const refVar = utils_1.ASTUtils.findVariable(superVar.scope, node.name);
            if (refVar) {
                return refVar.defs.some(def => isDeeplyReferencingType(def.node, superVar, visited));
            }
        }
    }
    return false;
}
