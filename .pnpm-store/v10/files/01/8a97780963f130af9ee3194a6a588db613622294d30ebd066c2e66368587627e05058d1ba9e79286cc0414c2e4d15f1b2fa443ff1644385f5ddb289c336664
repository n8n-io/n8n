"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("@typescript-eslint/utils");
const util_1 = require("../util");
exports.default = (0, util_1.createRule)({
    name: 'no-dynamic-delete',
    meta: {
        type: 'suggestion',
        docs: {
            description: 'Disallow using the `delete` operator on computed key expressions',
            recommended: 'strict',
        },
        fixable: 'code',
        messages: {
            dynamicDelete: 'Do not delete dynamically computed property keys.',
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        function createFixer(member) {
            if (member.property.type === utils_1.AST_NODE_TYPES.Literal &&
                typeof member.property.value === 'string') {
                return createPropertyReplacement(member.property, `.${member.property.value}`);
            }
            return undefined;
        }
        return {
            'UnaryExpression[operator=delete]'(node) {
                if (node.argument.type !== utils_1.AST_NODE_TYPES.MemberExpression ||
                    !node.argument.computed ||
                    isAcceptableIndexExpression(node.argument.property)) {
                    return;
                }
                context.report({
                    node: node.argument.property,
                    messageId: 'dynamicDelete',
                    fix: createFixer(node.argument),
                });
            },
        };
        function createPropertyReplacement(property, replacement) {
            return (fixer) => fixer.replaceTextRange(getTokenRange(property), replacement);
        }
        function getTokenRange(property) {
            return [
                (0, util_1.nullThrows)(context.sourceCode.getTokenBefore(property), util_1.NullThrowsReasons.MissingToken('token before', 'property')).range[0],
                (0, util_1.nullThrows)(context.sourceCode.getTokenAfter(property), util_1.NullThrowsReasons.MissingToken('token after', 'property')).range[1],
            ];
        }
    },
});
function isAcceptableIndexExpression(property) {
    return ((property.type === utils_1.AST_NODE_TYPES.Literal &&
        ['number', 'string'].includes(typeof property.value)) ||
        (property.type === utils_1.AST_NODE_TYPES.UnaryExpression &&
            property.operator === '-' &&
            property.argument.type === utils_1.AST_NODE_TYPES.Literal &&
            typeof property.argument.value === 'number'));
}
