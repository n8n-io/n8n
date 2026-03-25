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
const scope_manager_1 = require("@typescript-eslint/scope-manager");
const utils_1 = require("@typescript-eslint/utils");
const tsutils = __importStar(require("ts-api-utils"));
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
var AllowedType;
(function (AllowedType) {
    AllowedType[AllowedType["Number"] = 0] = "Number";
    AllowedType[AllowedType["String"] = 1] = "String";
    AllowedType[AllowedType["Unknown"] = 2] = "Unknown";
})(AllowedType || (AllowedType = {}));
exports.default = (0, util_1.createRule)({
    name: 'no-mixed-enums',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow enums from having both number and string members',
            recommended: 'strict',
            requiresTypeChecking: true,
        },
        messages: {
            mixed: `Mixing number and string enums can be confusing.`,
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const parserServices = (0, util_1.getParserServices)(context);
        const typeChecker = parserServices.program.getTypeChecker();
        function collectNodeDefinitions(node) {
            const { name } = node.id;
            const found = {
                imports: [],
                previousSibling: undefined,
            };
            let scope = context.sourceCode.getScope(node);
            for (const definition of scope.upper?.set.get(name)?.defs ?? []) {
                if (definition.node.type === utils_1.AST_NODE_TYPES.TSEnumDeclaration &&
                    definition.node.range[0] < node.range[0] &&
                    definition.node.body.members.length > 0) {
                    found.previousSibling = definition.node;
                    break;
                }
            }
            while (scope) {
                scope.set.get(name)?.defs.forEach(definition => {
                    if (definition.type === scope_manager_1.DefinitionType.ImportBinding) {
                        found.imports.push(definition.node);
                    }
                });
                scope = scope.upper;
            }
            return found;
        }
        function getAllowedTypeForNode(node) {
            return tsutils.isTypeFlagSet(typeChecker.getTypeAtLocation(node), ts.TypeFlags.StringLike)
                ? AllowedType.String
                : AllowedType.Number;
        }
        function getTypeFromImported(imported) {
            const type = typeChecker.getTypeAtLocation(parserServices.esTreeNodeToTSNodeMap.get(imported));
            const valueDeclaration = type.getSymbol()?.valueDeclaration;
            if (!valueDeclaration ||
                !ts.isEnumDeclaration(valueDeclaration) ||
                valueDeclaration.members.length === 0) {
                return undefined;
            }
            return getAllowedTypeForNode(valueDeclaration.members[0]);
        }
        function getMemberType(member) {
            if (!member.initializer) {
                return AllowedType.Number;
            }
            switch (member.initializer.type) {
                case utils_1.AST_NODE_TYPES.Literal:
                    switch (typeof member.initializer.value) {
                        case 'number':
                            return AllowedType.Number;
                        case 'string':
                            return AllowedType.String;
                        default:
                            return AllowedType.Unknown;
                    }
                case utils_1.AST_NODE_TYPES.TemplateLiteral:
                    return AllowedType.String;
                default:
                    return getAllowedTypeForNode(parserServices.esTreeNodeToTSNodeMap.get(member.initializer));
            }
        }
        function getDesiredTypeForDefinition(node) {
            const { imports, previousSibling } = collectNodeDefinitions(node);
            // Case: Merged ambiently via module augmentation
            // import { MyEnum } from 'other-module';
            // declare module 'other-module' {
            //   enum MyEnum { A }
            // }
            for (const imported of imports) {
                const typeFromImported = getTypeFromImported(imported);
                if (typeFromImported != null) {
                    return typeFromImported;
                }
            }
            // Case: Multiple enum declarations in the same file
            // enum MyEnum { A }
            // enum MyEnum { B }
            if (previousSibling) {
                return getMemberType(previousSibling.body.members[0]);
            }
            // Case: Namespace declaration merging
            // namespace MyNamespace {
            //   export enum MyEnum { A }
            // }
            // namespace MyNamespace {
            //   export enum MyEnum { B }
            // }
            if (node.parent.type === utils_1.AST_NODE_TYPES.ExportNamedDeclaration &&
                node.parent.parent.type === utils_1.AST_NODE_TYPES.TSModuleBlock) {
                // https://github.com/typescript-eslint/typescript-eslint/issues/8352
                // TODO: We don't need to dip into the TypeScript type checker here!
                // Merged namespaces must all exist in the same file.
                // We could instead compare this file's nodes to find the merges.
                const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node.id);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const declarations = typeChecker
                    .getSymbolAtLocation(tsNode)
                    .getDeclarations();
                const [{ initializer }] = declarations[0]
                    .members;
                return initializer &&
                    tsutils.isTypeFlagSet(typeChecker.getTypeAtLocation(initializer), ts.TypeFlags.StringLike)
                    ? AllowedType.String
                    : AllowedType.Number;
            }
            // Finally, we default to the type of the first enum member
            return getMemberType(node.body.members[0]);
        }
        return {
            TSEnumDeclaration(node) {
                if (!node.body.members.length) {
                    return;
                }
                let desiredType = getDesiredTypeForDefinition(node);
                if (desiredType === ts.TypeFlags.Unknown) {
                    return;
                }
                for (const member of node.body.members) {
                    const currentType = getMemberType(member);
                    if (currentType === AllowedType.Unknown) {
                        return;
                    }
                    if (currentType === AllowedType.Number) {
                        desiredType ??= currentType;
                    }
                    if (currentType !== desiredType) {
                        context.report({
                            node: member.initializer ?? member,
                            messageId: 'mixed',
                        });
                        return;
                    }
                }
            },
        };
    },
});
