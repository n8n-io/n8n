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
var getProperties_1 = __importDefault(require("./utils/getProperties"));
/**
 * Extracts component name from an object-style VueJs component
 * @param documentation
 * @param path
 */
function displayNameHandler(documentation, compDef) {
    if (bt.isObjectExpression(compDef.node)) {
        var namePath = (0, getProperties_1.default)(compDef, 'name');
        // if no prop return
        if (!namePath.length) {
            return Promise.resolve();
        }
        var nameValuePath = namePath[0].get('value');
        var singleNameValuePath = !Array.isArray(nameValuePath) ? nameValuePath : null;
        var displayName = null;
        if (singleNameValuePath) {
            if (bt.isStringLiteral(singleNameValuePath.node)) {
                displayName = singleNameValuePath.node.value;
            }
            else if (bt.isIdentifier(singleNameValuePath.node)) {
                var nameConstId = singleNameValuePath.node.name;
                var program = compDef.parentPath.parentPath;
                if (program.name === 'body') {
                    displayName = getDeclaredConstantValue(program, nameConstId);
                }
            }
        }
        documentation.set('displayName', displayName);
    }
    return Promise.resolve();
}
exports.default = displayNameHandler;
function getDeclaredConstantValue(prog, nameConstId) {
    var body = prog.node.body;
    var globalVariableDeclarations = body.filter(function (node) {
        return bt.isVariableDeclaration(node);
    });
    var globalVariableExports = body
        .filter(function (node) {
        return bt.isExportNamedDeclaration(node) && bt.isVariableDeclaration(node.declaration);
    })
        .map(function (node) { return node.declaration; });
    var declarations = globalVariableDeclarations
        .concat(globalVariableExports)
        .reduce(function (a, declPath) { return a.concat(declPath.declarations); }, []);
    var nodeDeclaratorArray = declarations.filter(function (d) { return bt.isIdentifier(d.id) && d.id.name === nameConstId; });
    var nodeDeclarator = nodeDeclaratorArray.length ? nodeDeclaratorArray[0] : undefined;
    return nodeDeclarator && nodeDeclarator.init && bt.isStringLiteral(nodeDeclarator.init)
        ? nodeDeclarator.init.value
        : null;
}
