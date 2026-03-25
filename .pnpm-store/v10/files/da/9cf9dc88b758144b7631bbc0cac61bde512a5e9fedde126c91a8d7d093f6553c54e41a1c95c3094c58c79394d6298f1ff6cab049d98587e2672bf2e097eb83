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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var ts_map_1 = __importDefault(require("ts-map"));
var isExportedAssignment_1 = __importDefault(require("./isExportedAssignment"));
var resolveExportDeclaration_1 = __importDefault(require("./resolveExportDeclaration"));
var resolveIdentifier_1 = __importDefault(require("./resolveIdentifier"));
var resolveRequired_1 = __importDefault(require("./resolveRequired"));
function ignore() {
    return false;
}
/**
 * List of all keys that could contain documentation
 */
var VUE_COMPONENTS_KEYS = ['data', 'props', 'methods', 'computed', 'emits'];
function isObjectExpressionComponentDefinition(node) {
    return (
    // export const test = {}
    node.properties.length === 0 ||
        // export const compo = {data(){ return {cpm:"Button"}}
        node.properties.some(function (p) {
            return (bt.isObjectMethod(p) || bt.isObjectProperty(p)) &&
                bt.isIdentifier(p.key) &&
                VUE_COMPONENTS_KEYS.includes(p.key.name);
        }));
}
function isComponentDefinition(path) {
    var node = path.node;
    return (
    // export default {} (always exported even when empty)
    bt.isObjectExpression(node) ||
        // export const myComp = {} (exported only when there is a componente definition or if empty)
        (bt.isVariableDeclarator(node) &&
            node.init &&
            bt.isObjectExpression(node.init) &&
            isObjectExpressionComponentDefinition(node.init)) ||
        // export default class MyComp extends VueComp
        bt.isClassDeclaration(node) ||
        // export default whatever.extend({})
        (bt.isCallExpression(node) && bt.isObjectExpression(node.arguments[0])) ||
        // export const myComp = whatever.extend({})
        (bt.isVariableDeclarator(node) &&
            node.init &&
            bt.isCallExpression(node.init) &&
            bt.isObjectExpression(node.init.arguments[0])) ||
        false);
}
function getReturnStatementObject(realDef) {
    var returnedObjectPath;
    (0, recast_1.visit)(realDef.get('body'), {
        visitReturnStatement: function (rPath) {
            var returnArg = rPath.get('argument');
            if (bt.isObjectExpression(returnArg.node)) {
                returnedObjectPath = returnArg;
            }
            return false;
        }
    });
    return returnedObjectPath;
}
function getReturnedObject(realDef) {
    var node = realDef.node;
    if (bt.isArrowFunctionExpression(node)) {
        if (bt.isObjectExpression(realDef.get('body').node)) {
            return realDef.get('body');
        }
        return getReturnStatementObject(realDef);
    }
    if (bt.isFunctionDeclaration(node) || bt.isFunctionExpression(node)) {
        return getReturnStatementObject(realDef);
    }
    return undefined;
}
/**
 * Given an AST, this function tries to find the exported component definitions.
 *
 * If a definition is part of the following statements, it is considered to be
 * exported:
 *
 * modules.exports = Definition;
 * exports.foo = Definition;
 * export default Definition;
 * export var Definition = ...;
 */
function resolveExportedComponent(ast) {
    var components = new ts_map_1.default();
    var ievPureExports = {};
    var nonComponentsIdentifiers = [];
    function setComponent(exportName, definition) {
        if (definition && !components.get(exportName)) {
            components.set(exportName, normalizeComponentPath(definition));
        }
    }
    // function run for every non "assignment" export declaration
    // in extenso export default or export myvar
    function exportDeclaration(path) {
        var _a;
        var definitions = (0, resolveExportDeclaration_1.default)(path);
        // if it is a pure export { compo } from "./compo" load the source here
        var sourcePath = (_a = path.get('source').value) === null || _a === void 0 ? void 0 : _a.value;
        definitions.forEach(function (definition, name) {
            if (sourcePath) {
                ievPureExports[name] = {
                    exportName: definition.value.name,
                    filePath: [sourcePath]
                };
            }
            else {
                // if we look at a TS "as" expression the variable is "contained"
                // in its expression member. In this case, resolve the expression member
                if (bt.isTSAsExpression(definition.node)) {
                    definition = definition.get('expression');
                }
                var realDef = (0, resolveIdentifier_1.default)(ast, definition);
                if (realDef) {
                    if (isComponentDefinition(realDef)) {
                        setComponent(name, realDef);
                    }
                    else {
                        var returnedObject = getReturnedObject(realDef);
                        if (returnedObject && isObjectExpressionComponentDefinition(returnedObject.node)) {
                            setComponent(name, returnedObject);
                        }
                    }
                }
                else {
                    nonComponentsIdentifiers.push(definition.value.name);
                }
            }
        });
        return false;
    }
    (0, recast_1.visit)(ast.program, {
        // for perf resons,
        // look only at the root,
        // ignore all traversing except for if
        visitFunctionDeclaration: ignore,
        visitFunctionExpression: ignore,
        visitClassDeclaration: ignore,
        visitClassExpression: ignore,
        visitWithStatement: ignore,
        visitSwitchStatement: ignore,
        visitWhileStatement: ignore,
        visitDoWhileStatement: ignore,
        visitForStatement: ignore,
        visitForInStatement: ignore,
        visitDeclareExportDeclaration: exportDeclaration,
        visitExportNamedDeclaration: exportDeclaration,
        visitExportDefaultDeclaration: exportDeclaration,
        visitAssignmentExpression: function (path) {
            // function run on every assignments (with an =)
            // Ignore anything that is not `exports.X = ...;` or
            // `module.exports = ...;`
            if (!(0, isExportedAssignment_1.default)(path)) {
                return false;
            }
            // Resolve the value of the right hand side. It should resolve to a call
            // expression, something like Vue.extend({})
            var pathRight = path.get('right');
            var pathLeft = path.get('left');
            var realComp = (0, resolveIdentifier_1.default)(ast, pathRight);
            var name = bt.isMemberExpression(pathLeft.node) &&
                bt.isIdentifier(pathLeft.node.property) &&
                pathLeft.node.property.name !== 'exports'
                ? pathLeft.node.property.name
                : 'default';
            if (realComp) {
                if (isComponentDefinition(realComp)) {
                    setComponent(name, realComp);
                }
                else {
                    var returnedObject = getReturnedObject(realComp);
                    if (returnedObject && isObjectExpressionComponentDefinition(returnedObject.node)) {
                        setComponent(name, returnedObject);
                    }
                }
            }
            else {
                nonComponentsIdentifiers.push(name);
            }
            return false;
        }
    });
    var requiredValues = Object.assign(ievPureExports, (0, resolveRequired_1.default)(ast, nonComponentsIdentifiers));
    return [components, requiredValues];
}
exports.default = resolveExportedComponent;
function normalizeComponentPath(path) {
    if (bt.isVariableDeclarator(path.node)) {
        path = path.get('init');
    }
    if (bt.isObjectExpression(path.node)) {
        return path;
    }
    else if (bt.isCallExpression(path.node)) {
        return path.get('arguments', 0);
    }
    return path;
}
