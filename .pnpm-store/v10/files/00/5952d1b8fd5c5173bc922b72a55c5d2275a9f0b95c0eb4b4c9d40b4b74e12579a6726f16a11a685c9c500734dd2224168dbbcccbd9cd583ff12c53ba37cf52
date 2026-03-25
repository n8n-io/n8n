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
function resolveExportDeclaration(path) {
    var definitions = new ts_map_1.default();
    if (bt.isExportDefaultDeclaration(path.node)) {
        var defaultPath = path;
        definitions.set('default', defaultPath.get('declaration'));
    }
    else if (bt.isExportNamedDeclaration(path.node)) {
        var declaration = path.get('declaration');
        // export const example = {}
        if (declaration && bt.isVariableDeclaration(declaration.node)) {
            declaration.get('declarations').each(function (declarator) {
                var nodeId = declarator.node.id;
                if (bt.isIdentifier(nodeId)) {
                    definitions.set(nodeId.name, declarator);
                }
            });
        }
        else if (declaration && bt.isClassDeclaration(declaration.node)) {
            var nodeId = declaration.node.id;
            if (bt.isIdentifier(nodeId)) {
                definitions.set(nodeId.name, declaration);
            }
        }
        else {
            // const example = {}
            // export { example }
            getDefinitionsFromPathSpecifiers(path, definitions);
        }
    }
    else if (bt.isExportDeclaration(path.node)) {
        getDefinitionsFromPathSpecifiers(path, definitions);
    }
    return definitions;
}
exports.default = resolveExportDeclaration;
function getDefinitionsFromPathSpecifiers(path, defs) {
    var specifiersPath = path.get('specifiers');
    specifiersPath.each(function (specifier) {
        if (bt.isIdentifier(specifier.node.exported)) {
            defs.set(specifier.node.exported.name, bt.isExportSpecifier(specifier.node) ? specifier.get('local') : specifier.get('exported'));
        }
    });
}
