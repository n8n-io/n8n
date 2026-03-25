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
Object.defineProperty(exports, "__esModule", { value: true });
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
function ignore() {
    return false;
}
function resolveIdentifier(ast, path) {
    if (!bt.isIdentifier(path.node)) {
        return path;
    }
    var varName = path.node.name;
    var comp = null;
    (0, recast_1.visit)(ast.program, {
        // to look only at the root we ignore all traversing
        visitFunctionDeclaration: ignore,
        visitFunctionExpression: ignore,
        visitClassExpression: ignore,
        visitIfStatement: ignore,
        visitWithStatement: ignore,
        visitSwitchStatement: ignore,
        visitWhileStatement: ignore,
        visitDoWhileStatement: ignore,
        visitForStatement: ignore,
        visitForInStatement: ignore,
        visitVariableDeclaration: function (variablePath) {
            if (!bt.isVariableDeclaration(variablePath.node)) {
                return false;
            }
            var varID = variablePath.node.declarations[0].id;
            if (!varID || !bt.isIdentifier(varID) || varID.name !== varName) {
                return false;
            }
            comp = variablePath.get('declarations', 0).get('init');
            return false;
        },
        visitClassDeclaration: function (classPath) {
            var classID = classPath.node.id;
            if (!classID || !bt.isIdentifier(classID) || classID.name !== varName) {
                return false;
            }
            comp = classPath;
            return false;
        }
    });
    return comp;
}
exports.default = resolveIdentifier;
