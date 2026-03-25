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
const util_1 = require("../util");
var State;
(function (State) {
    State[State["Unsafe"] = 1] = "Unsafe";
    State[State["Safe"] = 2] = "Safe";
})(State || (State = {}));
function createDataType(type) {
    const isErrorType = tsutils.isIntrinsicErrorType(type);
    return isErrorType ? '`error` typed' : '`any`';
}
exports.default = (0, util_1.createRule)({
    name: 'no-unsafe-member-access',
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow member access on a value with type `any`',
            recommended: 'recommended',
            requiresTypeChecking: true,
        },
        messages: {
            unsafeComputedMemberAccess: 'Computed name {{property}} resolves to an {{type}} value.',
            unsafeMemberExpression: 'Unsafe member access {{property}} on an {{type}} value.',
            unsafeThisMemberExpression: [
                'Unsafe member access {{property}} on an `any` value. `this` is typed as `any`.',
                'You can try to fix this by turning on the `noImplicitThis` compiler option, or adding a `this` parameter to the function.',
            ].join('\n'),
        },
        schema: [],
    },
    defaultOptions: [],
    create(context) {
        const services = (0, util_1.getParserServices)(context);
        const compilerOptions = services.program.getCompilerOptions();
        const isNoImplicitThis = tsutils.isStrictCompilerOptionEnabled(compilerOptions, 'noImplicitThis');
        const stateCache = new Map();
        function checkMemberExpression(node) {
            const cachedState = stateCache.get(node);
            if (cachedState) {
                return cachedState;
            }
            if (node.object.type === utils_1.AST_NODE_TYPES.MemberExpression) {
                const objectState = checkMemberExpression(node.object);
                if (objectState === State.Unsafe) {
                    // if the object is unsafe, we know this will be unsafe as well
                    // we don't need to report, as we have already reported on the inner member expr
                    stateCache.set(node, objectState);
                    return objectState;
                }
            }
            const type = services.getTypeAtLocation(node.object);
            const state = (0, util_1.isTypeAnyType)(type) ? State.Unsafe : State.Safe;
            stateCache.set(node, state);
            if (state === State.Unsafe) {
                const propertyName = context.sourceCode.getText(node.property);
                let messageId = 'unsafeMemberExpression';
                if (!isNoImplicitThis) {
                    // `this.foo` or `this.foo[bar]`
                    const thisExpression = (0, util_1.getThisExpression)(node);
                    if (thisExpression &&
                        (0, util_1.isTypeAnyType)((0, util_1.getConstrainedTypeAtLocation)(services, thisExpression))) {
                        messageId = 'unsafeThisMemberExpression';
                    }
                }
                context.report({
                    node: node.property,
                    messageId,
                    data: {
                        type: createDataType(type),
                        property: node.computed ? `[${propertyName}]` : `.${propertyName}`,
                    },
                });
            }
            return state;
        }
        return {
            // ignore MemberExpressions with ancestors of type `TSClassImplements` or `TSInterfaceHeritage`
            'MemberExpression:not(TSClassImplements MemberExpression, TSInterfaceHeritage MemberExpression)': checkMemberExpression,
            'MemberExpression[computed = true] > *.property'(node) {
                if (
                // x[1]
                node.type === utils_1.AST_NODE_TYPES.Literal ||
                    // x[1++] x[++x] etc
                    // FUN FACT - **all** update expressions return type number, regardless of the argument's type,
                    // because JS engines return NaN if there the argument is not a number.
                    node.type === utils_1.AST_NODE_TYPES.UpdateExpression) {
                    // perf optimizations - literals can obviously never be `any`
                    return;
                }
                const type = services.getTypeAtLocation(node);
                if ((0, util_1.isTypeAnyType)(type)) {
                    const propertyName = context.sourceCode.getText(node);
                    context.report({
                        node,
                        messageId: 'unsafeComputedMemberAccess',
                        data: {
                            type: createDataType(type),
                            property: `[${propertyName}]`,
                        },
                    });
                }
            },
        };
    },
});
