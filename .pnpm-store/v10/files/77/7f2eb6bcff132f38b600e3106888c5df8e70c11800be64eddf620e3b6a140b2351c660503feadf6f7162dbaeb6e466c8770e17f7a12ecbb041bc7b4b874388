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
const ts = __importStar(require("typescript"));
const util_1 = require("../util");
const shared_1 = require("./enum-utils/shared");
/**
 * @returns Whether the right type is an unsafe comparison against any left type.
 */
function typeViolates(leftTypeParts, rightType) {
    const leftEnumValueTypes = new Set(leftTypeParts.map(getEnumValueType));
    return ((leftEnumValueTypes.has(ts.TypeFlags.Number) && isNumberLike(rightType)) ||
        (leftEnumValueTypes.has(ts.TypeFlags.String) && isStringLike(rightType)));
}
function isNumberLike(type) {
    const typeParts = tsutils.intersectionConstituents(type);
    return typeParts.some(typePart => {
        return tsutils.isTypeFlagSet(typePart, ts.TypeFlags.Number | ts.TypeFlags.NumberLike);
    });
}
function isStringLike(type) {
    const typeParts = tsutils.intersectionConstituents(type);
    return typeParts.some(typePart => {
        return tsutils.isTypeFlagSet(typePart, ts.TypeFlags.String | ts.TypeFlags.StringLike);
    });
}
/**
 * @returns What type a type's enum value is (number or string), if either.
 */
function getEnumValueType(type) {
    return tsutils.isTypeFlagSet(type, ts.TypeFlags.EnumLike)
        ? tsutils.isTypeFlagSet(type, ts.TypeFlags.NumberLiteral)
            ? ts.TypeFlags.Number
            : ts.TypeFlags.String
        : undefined;
}
exports.default = (0, util_1.createRule)({
    name: 'no-unsafe-enum-comparison',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow comparing an enum value with a non-enum value',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        hasSuggestions: true,
        messages: {
            mismatchedCase: 'The case statement does not have a shared enum type with the switch predicate.',
            mismatchedCondition: 'The two values in this comparison do not have a shared enum type.',
            replaceValueWithEnum: 'Replace with an enum value comparison.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const parserServices = (0, util_1.getParserServices)(context);
        const typeChecker = parserServices.program.getTypeChecker();
        function isMismatchedComparison(leftType, rightType) {
            // Allow comparisons that don't have anything to do with enums:
            //
            // ```ts
            // 1 === 2;
            // ```
            const leftEnumTypes = (0, shared_1.getEnumTypes)(typeChecker, leftType);
            const rightEnumTypes = new Set((0, shared_1.getEnumTypes)(typeChecker, rightType));
            if (leftEnumTypes.length === 0 && rightEnumTypes.size === 0) {
                return false;
            }
            // Allow comparisons that share an enum type:
            //
            // ```ts
            // Fruit.Apple === Fruit.Banana;
            // ```
            for (const leftEnumType of leftEnumTypes) {
                if (rightEnumTypes.has(leftEnumType)) {
                    return false;
                }
            }
            // We need to split the type into the union type parts in order to find
            // valid enum comparisons like:
            //
            // ```ts
            // declare const something: Fruit | Vegetable;
            // something === Fruit.Apple;
            // ```
            const leftTypeParts = tsutils.unionConstituents(leftType);
            const rightTypeParts = tsutils.unionConstituents(rightType);
            // If a type exists in both sides, we consider this comparison safe:
            //
            // ```ts
            // declare const fruit: Fruit.Apple | 0;
            // fruit === 0;
            // ```
            for (const leftTypePart of leftTypeParts) {
                if (rightTypeParts.includes(leftTypePart)) {
                    return false;
                }
            }
            return (typeViolates(leftTypeParts, rightType) ||
                typeViolates(rightTypeParts, leftType));
        }
        return {
            'BinaryExpression[operator=/^[<>!=]?={0,2}$/]'(node) {
                const leftType = parserServices.getTypeAtLocation(node.left);
                const rightType = parserServices.getTypeAtLocation(node.right);
                if (isMismatchedComparison(leftType, rightType)) {
                    context.report({
                        node,
                        messageId: 'mismatchedCondition',
                        suggest: [
                            {
                                messageId: 'replaceValueWithEnum',
                                fix(fixer) {
                                    // Replace the right side with an enum key if possible:
                                    //
                                    // ```ts
                                    // Fruit.Apple === 'apple'; // Fruit.Apple === Fruit.Apple
                                    // ```
                                    const leftEnumKey = (0, shared_1.getEnumKeyForLiteral)((0, shared_1.getEnumLiterals)(leftType), (0, util_1.getStaticValue)(node.right)?.value);
                                    if (leftEnumKey) {
                                        return fixer.replaceText(node.right, leftEnumKey);
                                    }
                                    // Replace the left side with an enum key if possible:
                                    //
                                    // ```ts
                                    // declare const fruit: Fruit;
                                    // 'apple' === Fruit.Apple; // Fruit.Apple === Fruit.Apple
                                    // ```
                                    const rightEnumKey = (0, shared_1.getEnumKeyForLiteral)((0, shared_1.getEnumLiterals)(rightType), (0, util_1.getStaticValue)(node.left)?.value);
                                    if (rightEnumKey) {
                                        return fixer.replaceText(node.left, rightEnumKey);
                                    }
                                    return null;
                                },
                            },
                        ],
                    });
                }
            },
            SwitchCase(node) {
                // Ignore `default` cases.
                if (node.test == null) {
                    return;
                }
                const { parent } = node;
                const leftType = parserServices.getTypeAtLocation(parent.discriminant);
                const rightType = parserServices.getTypeAtLocation(node.test);
                if (isMismatchedComparison(leftType, rightType)) {
                    context.report({
                        node,
                        messageId: 'mismatchedCase',
                    });
                }
            },
        };
    },
});
