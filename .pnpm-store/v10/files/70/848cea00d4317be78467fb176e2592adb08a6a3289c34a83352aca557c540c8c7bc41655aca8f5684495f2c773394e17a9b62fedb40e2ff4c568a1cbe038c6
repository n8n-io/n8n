"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_never_1 = __importDefault(require("assert-never"));
const babel_walk_1 = require("babel-walk");
const t = __importStar(require("@babel/types"));
const reference_1 = __importDefault(require("./reference"));
const isScope = (node) => t.isFunctionParent(node) || t.isProgram(node);
const isBlockScope = (node) => t.isBlockStatement(node) || isScope(node);
const declaresArguments = (node) => t.isFunction(node) && !t.isArrowFunctionExpression(node);
const declaresThis = declaresArguments;
const LOCALS_SYMBOL = Symbol('locals');
const getLocals = (node) => node[LOCALS_SYMBOL];
const declareLocals = (node) => (node[LOCALS_SYMBOL] = node[LOCALS_SYMBOL] || new Set());
const setLocal = (node, name) => declareLocals(node).add(name);
// First pass
function declareFunction(node) {
    for (const param of node.params) {
        declarePattern(param, node);
    }
    const id = node.id;
    if (id) {
        setLocal(node, id.name);
    }
}
function declarePattern(node, parent) {
    switch (node.type) {
        case 'Identifier':
            setLocal(parent, node.name);
            break;
        case 'ObjectPattern':
            for (const prop of node.properties) {
                switch (prop.type) {
                    case 'RestElement':
                        declarePattern(prop.argument, parent);
                        break;
                    case 'ObjectProperty':
                        declarePattern(prop.value, parent);
                        break;
                    default:
                        assert_never_1.default(prop);
                        break;
                }
            }
            break;
        case 'ArrayPattern':
            for (const element of node.elements) {
                if (element)
                    declarePattern(element, parent);
            }
            break;
        case 'RestElement':
            declarePattern(node.argument, parent);
            break;
        case 'AssignmentPattern':
            declarePattern(node.left, parent);
            break;
        // istanbul ignore next
        default:
            throw new Error('Unrecognized pattern type: ' + node.type);
    }
}
function declareModuleSpecifier(node, _state, parents) {
    for (let i = parents.length - 2; i >= 0; i--) {
        if (isScope(parents[i])) {
            setLocal(parents[i], node.local.name);
            return;
        }
    }
}
const firstPass = babel_walk_1.ancestor({
    VariableDeclaration(node, _state, parents) {
        for (let i = parents.length - 2; i >= 0; i--) {
            if (node.kind === 'var'
                ? t.isFunctionParent(parents[i])
                : isBlockScope(parents[i])) {
                for (const declaration of node.declarations) {
                    declarePattern(declaration.id, parents[i]);
                }
                return;
            }
        }
    },
    FunctionDeclaration(node, _state, parents) {
        if (node.id) {
            for (let i = parents.length - 2; i >= 0; i--) {
                if (isScope(parents[i])) {
                    setLocal(parents[i], node.id.name);
                    return;
                }
            }
        }
    },
    Function: declareFunction,
    ClassDeclaration(node, _state, parents) {
        for (let i = parents.length - 2; i >= 0; i--) {
            if (isScope(parents[i])) {
                setLocal(parents[i], node.id.name);
                return;
            }
        }
    },
    TryStatement(node) {
        if (node.handler === null)
            return;
        if (node.handler.param === null)
            return;
        declarePattern(node.handler.param, node.handler);
    },
    ImportDefaultSpecifier: declareModuleSpecifier,
    ImportSpecifier: declareModuleSpecifier,
    ImportNamespaceSpecifier: declareModuleSpecifier,
});
// Second pass
const secondPass = babel_walk_1.ancestor({
    Identifier(node, state, parents) {
        var _a;
        const name = node.name;
        if (name === 'undefined')
            return;
        const lastParent = parents[parents.length - 2];
        if (lastParent) {
            if (!reference_1.default(node, lastParent))
                return;
            for (const parent of parents) {
                if (name === 'arguments' && declaresArguments(parent)) {
                    return;
                }
                if ((_a = getLocals(parent)) === null || _a === void 0 ? void 0 : _a.has(name)) {
                    return;
                }
            }
        }
        state.globals.push(node);
    },
    ThisExpression(node, state, parents) {
        for (const parent of parents) {
            if (declaresThis(parent)) {
                return;
            }
        }
        state.globals.push(node);
    },
});
function findGlobals(ast) {
    const globals = [];
    // istanbul ignore if
    if (!t.isNode(ast)) {
        throw new TypeError('Source must be a Babylon AST');
    }
    firstPass(ast, undefined);
    secondPass(ast, { globals });
    const groupedGlobals = new Map();
    for (const node of globals) {
        const name = node.type === 'ThisExpression' ? 'this' : node.name;
        const existing = groupedGlobals.get(name);
        if (existing) {
            existing.push(node);
        }
        else {
            groupedGlobals.set(name, [node]);
        }
    }
    return [...groupedGlobals]
        .map(([name, nodes]) => ({ name, nodes }))
        .sort((a, b) => (a.name < b.name ? -1 : 1));
}
exports.default = findGlobals;
//# sourceMappingURL=globals.js.map