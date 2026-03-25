import { createRule } from '../utils/index.js';
const { hasOwnProperty } = Object.prototype;
const hasOwn = (object, key) => hasOwnProperty.call(object, key);
const defs = {
    ArrayExpression: {
        option: 'allowArray',
        description: 'If `false`, will report default export of an array',
        messageId: 'assign',
        data: {
            type: 'array',
        },
    },
    ArrowFunctionExpression: {
        option: 'allowArrowFunction',
        description: 'If `false`, will report default export of an arrow function',
        messageId: 'assign',
        data: {
            type: 'arrow function',
        },
    },
    CallExpression: {
        option: 'allowCallExpression',
        description: 'If `false`, will report default export of a function call',
        messageId: 'assign',
        data: {
            type: 'call result',
        },
        default: true,
    },
    ClassDeclaration: {
        option: 'allowAnonymousClass',
        description: 'If `false`, will report default export of an anonymous class',
        messageId: 'anonymous',
        data: {
            type: 'class',
        },
        forbid: (node) => !('id' in node.declaration) || !node.declaration.id,
    },
    FunctionDeclaration: {
        option: 'allowAnonymousFunction',
        description: 'If `false`, will report default export of an anonymous function',
        messageId: 'anonymous',
        data: {
            type: 'function',
        },
        forbid: (node) => !('id' in node.declaration) || !node.declaration.id,
    },
    Literal: {
        option: 'allowLiteral',
        description: 'If `false`, will report default export of a literal',
        messageId: 'assign',
        data: {
            type: 'literal',
        },
    },
    ObjectExpression: {
        option: 'allowObject',
        description: 'If `false`, will report default export of an object expression',
        messageId: 'assign',
        data: {
            type: 'object',
        },
    },
    TemplateLiteral: {
        option: 'allowLiteral',
        description: 'If `false`, will report default export of a literal',
        messageId: 'assign',
        data: {
            type: 'literal',
        },
    },
    NewExpression: {
        option: 'allowNew',
        description: 'If `false`, will report default export of a class instantiation',
        messageId: 'assign',
        data: {
            type: 'instance',
        },
    },
};
const schemaProperties = Object.fromEntries(Object.values(defs).map(def => [
    def.option,
    {
        description: def.description,
        type: 'boolean',
    },
]));
const defaults = Object.fromEntries(Object.values(defs).map(def => [
    def.option,
    hasOwn(def, 'default') ? def.default : false,
]));
export default createRule({
    name: 'no-anonymous-default-export',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Forbid anonymous values as default exports.',
        },
        schema: [
            {
                type: 'object',
                properties: schemaProperties,
                additionalProperties: false,
            },
        ],
        messages: {
            assign: 'Assign {{type}} to a variable before exporting as module default',
            anonymous: 'Unexpected default export of anonymous {{type}}',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = { ...defaults, ...context.options[0] };
        return {
            ExportDefaultDeclaration(node) {
                const type = node.declaration
                    .type;
                if (!(type in defs)) {
                    return;
                }
                const def = defs[type];
                if (!options[def.option] && (!('forbid' in def) || def.forbid(node))) {
                    context.report({
                        node,
                        messageId: def.messageId,
                        data: def.data,
                    });
                }
            },
        };
    },
});
//# sourceMappingURL=no-anonymous-default-export.js.map