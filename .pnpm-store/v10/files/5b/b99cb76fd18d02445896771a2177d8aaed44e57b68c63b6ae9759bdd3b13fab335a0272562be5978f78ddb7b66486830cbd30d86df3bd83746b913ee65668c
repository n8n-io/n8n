"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jsVariablePolyfill = exports.globalIdentifier = void 0;
const recast_1 = require("recast");
const ast_types_1 = require("ast-types");
const Constants_1 = require("./Constants");
function assertNever(value) {
    return true;
}
exports.globalIdentifier = ast_types_1.builders.identifier(typeof window !== 'object' ? 'global' : 'window');
const buildGlobalSwitch = (node, dataNode) => {
    return ast_types_1.builders.memberExpression(ast_types_1.builders.conditionalExpression(ast_types_1.builders.binaryExpression('in', ast_types_1.builders.literal(node.name), dataNode), dataNode, exports.globalIdentifier), ast_types_1.builders.identifier(node.name));
};
const isInScope = (path) => {
    let scope = path.scope;
    while (scope !== null) {
        if (scope.declares(path.node.name)) {
            return true;
        }
        scope = scope.parent;
    }
    return false;
};
const polyfillExceptions = ['this', 'window', 'global'];
const polyfillVar = (path, dataNode, force = false) => {
    if (!force) {
        if (isInScope(path)) {
            return;
        }
    }
    if (polyfillExceptions.includes(path.node.name)) {
        return;
    }
    path.replace(buildGlobalSwitch(path.node, dataNode));
};
const customPatches = {
    MemberExpression(path, parent, dataNode) {
        if (parent.object === path.node || parent.computed) {
            polyfillVar(path, dataNode);
        }
    },
    OptionalMemberExpression(path, parent, dataNode) {
        if (parent.object === path.node) {
            polyfillVar(path, dataNode);
        }
    },
    Property(path, parent, dataNode) {
        var _a, _b, _c;
        if (path.node !== parent.value) {
            return;
        }
        const objPattern = (_b = (_a = path.parent) === null || _a === void 0 ? void 0 : _a.parent) === null || _b === void 0 ? void 0 : _b.node;
        if (!objPattern) {
            return;
        }
        const objParent = (_c = path.parent.parent.parent) === null || _c === void 0 ? void 0 : _c.node;
        if (!objParent) {
            return;
        }
        if (objParent.type === 'VariableDeclarator' && objParent.id === objPattern) {
            return;
        }
        parent.shorthand = false;
        polyfillVar(path, dataNode);
    },
    AssignmentPattern(path, parent, dataNode) {
        if (parent.right === path.node) {
            polyfillVar(path, dataNode);
        }
    },
    VariableDeclarator(path, parent, dataNode) {
        if (parent.init === path.node) {
            polyfillVar(path, dataNode);
        }
    },
};
const jsVariablePolyfill = (ast, dataNode) => {
    (0, recast_1.visit)(ast, {
        visitImportExpression(_path) {
            throw new Error('Imports are not supported');
        },
        visitIdentifier(path) {
            this.traverse(path);
            const parent = path.parent.node;
            if (Constants_1.EXEMPT_IDENTIFIER_LIST.includes(path.node.name)) {
                return;
            }
            switch (parent.type) {
                case 'AssignmentPattern':
                case 'Property':
                case 'MemberExpression':
                case 'OptionalMemberExpression':
                case 'VariableDeclarator':
                    if (!customPatches[parent.type]) {
                        throw new Error(`Couldn\'t find custom patcher for parent type: ${parent.type}`);
                    }
                    customPatches[parent.type](path, parent, dataNode);
                    break;
                case 'BinaryExpression':
                case 'UnaryExpression':
                case 'ArrayExpression':
                case 'AssignmentExpression':
                case 'SequenceExpression':
                case 'YieldExpression':
                case 'UpdateExpression':
                case 'LogicalExpression':
                case 'ConditionalExpression':
                case 'NewExpression':
                case 'CallExpression':
                case 'OptionalCallExpression':
                case 'TaggedTemplateExpression':
                case 'TemplateLiteral':
                case 'AwaitExpression':
                case 'ImportExpression':
                case 'ForStatement':
                case 'IfStatement':
                case 'WhileStatement':
                case 'ForInStatement':
                case 'ForOfStatement':
                case 'SwitchStatement':
                case 'ReturnStatement':
                case 'DoWhileStatement':
                case 'ExpressionStatement':
                case 'ForAwaitStatement':
                case 'ThrowStatement':
                case 'WithStatement':
                case 'TupleExpression':
                    polyfillVar(path, dataNode);
                    break;
                case 'Super':
                case 'Identifier':
                case 'ArrowFunctionExpression':
                case 'FunctionDeclaration':
                case 'FunctionExpression':
                case 'ThisExpression':
                case 'ObjectExpression':
                case 'MetaProperty':
                case 'ChainExpression':
                case 'PrivateName':
                case 'ParenthesizedExpression':
                case 'Import':
                case 'VariableDeclaration':
                case 'CatchClause':
                case 'BlockStatement':
                case 'TryStatement':
                case 'EmptyStatement':
                case 'LabeledStatement':
                case 'BreakStatement':
                case 'ContinueStatement':
                case 'DebuggerStatement':
                case 'ImportDeclaration':
                case 'ExportDeclaration':
                case 'ExportAllDeclaration':
                case 'ExportDefaultDeclaration':
                case 'Noop':
                case 'ClassMethod':
                case 'ClassPrivateMethod':
                case 'RestElement':
                case 'ArrayPattern':
                case 'ObjectPattern':
                case 'ClassExpression':
                case 'RecordExpression':
                case 'V8IntrinsicIdentifier':
                case 'TopicReference':
                case 'MethodDefinition':
                case 'ClassDeclaration':
                case 'ClassProperty':
                case 'StaticBlock':
                case 'ClassBody':
                case 'ExportNamedDeclaration':
                case 'ClassPrivateProperty':
                case 'ClassAccessorProperty':
                case 'PropertyPattern':
                    break;
                case 'SpreadElementPattern':
                case 'SpreadPropertyPattern':
                case 'ClassPropertyDefinition':
                    break;
                case 'DeclareClass':
                case 'DeclareModule':
                case 'DeclareVariable':
                case 'DeclareFunction':
                case 'DeclareInterface':
                case 'DeclareTypeAlias':
                case 'DeclareOpaqueType':
                case 'DeclareModuleExports':
                case 'DeclareExportDeclaration':
                case 'DeclareExportAllDeclaration':
                case 'InterfaceDeclaration':
                case 'TypeAlias':
                case 'OpaqueType':
                case 'EnumDeclaration':
                case 'TypeCastExpression':
                    break;
                case 'TSAsExpression':
                case 'TSTypeParameter':
                case 'TSTypeAssertion':
                case 'TSDeclareMethod':
                case 'TSIndexSignature':
                case 'TSDeclareFunction':
                case 'TSMethodSignature':
                case 'TSEnumDeclaration':
                case 'TSExportAssignment':
                case 'TSNonNullExpression':
                case 'TSPropertySignature':
                case 'TSModuleDeclaration':
                case 'TSParameterProperty':
                case 'TSTypeCastExpression':
                case 'TSSatisfiesExpression':
                case 'TSTypeAliasDeclaration':
                case 'TSInterfaceDeclaration':
                case 'TSImportEqualsDeclaration':
                case 'TSExternalModuleReference':
                case 'TSInstantiationExpression':
                case 'TSTypeParameterDeclaration':
                case 'TSCallSignatureDeclaration':
                case 'TSNamespaceExportDeclaration':
                case 'TSConstructSignatureDeclaration':
                    break;
                case 'DirectiveLiteral':
                case 'StringLiteral':
                case 'NumericLiteral':
                case 'BigIntLiteral':
                case 'NullLiteral':
                case 'Literal':
                case 'RegExpLiteral':
                case 'BooleanLiteral':
                case 'DecimalLiteral':
                    break;
                case 'DoExpression':
                case 'BindExpression':
                    break;
                case 'JSXIdentifier':
                case 'JSXText':
                case 'JSXElement':
                case 'JSXFragment':
                case 'JSXMemberExpression':
                case 'JSXExpressionContainer':
                    break;
                case 'ComprehensionExpression':
                case 'GeneratorExpression':
                    polyfillVar(path, dataNode);
                    break;
                default:
                    assertNever(parent);
                    break;
            }
        },
    });
    return ast.program.body;
};
exports.jsVariablePolyfill = jsVariablePolyfill;
//# sourceMappingURL=VariablePolyfill.js.map