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
var ts_map_1 = __importDefault(require("ts-map"));
var recast_1 = require("recast");
function ignore() {
    return false;
}
function resolveLocal(ast, variableNames) {
    var variablesMap = new ts_map_1.default();
    (0, recast_1.visit)(ast, {
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
        visitVariableDeclaration: function (pathVariable) {
            pathVariable.get('declarations').each(function (declaration) {
                if (bt.isVariableDeclarator(declaration.node) && bt.isIdentifier(declaration.node.id)) {
                    var varName = declaration.node.id.name;
                    if (variableNames.includes(varName) && declaration.get('init', 'callee', 'name').value !== 'require') {
                        variablesMap.set(varName, declaration.get('init'));
                    }
                }
            });
            return false;
        }
    });
    return variablesMap;
}
exports.default = resolveLocal;
