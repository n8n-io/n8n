"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'no-duplicate-enum-values',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow duplicate enum member values',
            recommended: 'recommended',
        },
        hasSuggestions: false,
        messages: {
            duplicateValue: 'Duplicate enum member value {{value}}.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function isStringLiteral(node) {
            return (node.type === utils_1.AST_NODE_TYPES.Literal && typeof node.value === 'string');
        }
        function isNumberLiteral(node) {
            return (node.type === utils_1.AST_NODE_TYPES.Literal && typeof node.value === 'number');
        }
        function isStaticTemplateLiteral(node) {
            return (node.type === utils_1.AST_NODE_TYPES.TemplateLiteral &&
                node.expressions.length === 0 &&
                node.quasis.length === 1);
        }
        return {
            TSEnumDeclaration(node) {
                const enumMembers = node.body.members;
                const seenValues = new Set();
                enumMembers.forEach(member => {
                    if (member.initializer == null) {
                        return;
                    }
                    let value;
                    if (isStringLiteral(member.initializer)) {
                        value = member.initializer.value;
                    }
                    else if (isNumberLiteral(member.initializer)) {
                        value = member.initializer.value;
                    }
                    else if (isStaticTemplateLiteral(member.initializer)) {
                        value = member.initializer.quasis[0].value.cooked;
                    }
                    if (value == null) {
                        return;
                    }
                    if (seenValues.has(value)) {
                        context.report({
                            node: member,
                            messageId: 'duplicateValue',
                            data: {
                                value,
                            },
                        });
                    }
                    else {
                        seenValues.add(value);
                    }
                });
            },
        };
    },
});
