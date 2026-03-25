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
function default_1(ast, variableFilter) {
    var variables = {};
    var importedVariablePaths = {};
    var exportAllFiles = [];
    // get imported variable names and filepath
    (0, recast_1.visit)(ast.program, {
        visitImportDeclaration: function (astPath) {
            if (!astPath.node.source) {
                return false;
            }
            var filePath = astPath.node.source.value;
            if (typeof filePath !== 'string') {
                return false;
            }
            var specifiers = astPath.get('specifiers');
            specifiers.each(function (s) {
                var varName = s.node.local.name;
                var exportName = bt.isImportSpecifier(s.node) && bt.isIdentifier(s.node.imported)
                    ? s.node.imported.name
                    : 'default';
                importedVariablePaths[varName] = { filePath: [filePath], exportName: exportName };
            });
            return false;
        }
    });
    (0, recast_1.visit)(ast.program, {
        visitExportNamedDeclaration: function (astPath) {
            var specifiers = astPath.get('specifiers');
            if (astPath.node.source) {
                var filePath_1 = astPath.node.source.value;
                if (typeof filePath_1 !== 'string') {
                    return false;
                }
                specifiers.each(function (s) {
                    if (bt.isIdentifier(s.node.exported)) {
                        var varName = s.node.exported.name;
                        var exportName = s.node.local ? s.node.local.name : varName;
                        if (variableFilter.indexOf(varName) > -1) {
                            variables[varName] = { filePath: [filePath_1], exportName: exportName };
                        }
                    }
                });
            }
            else {
                specifiers.each(function (s) {
                    if (bt.isIdentifier(s.node.exported)) {
                        var varName = s.node.exported.name;
                        var middleName = s.node.local.name;
                        var importedVar = importedVariablePaths[middleName];
                        if (importedVar && variableFilter.indexOf(varName) > -1) {
                            variables[varName] = importedVar;
                        }
                    }
                });
            }
            return false;
        },
        visitExportDefaultDeclaration: function (astPath) {
            if (variableFilter.indexOf('default') > -1) {
                var middleNameDeclaration = astPath.node.declaration;
                if (bt.isIdentifier(middleNameDeclaration)) {
                    var middleName = middleNameDeclaration.name;
                    var importedVar = importedVariablePaths[middleName];
                    if (importedVar) {
                        variables.default = importedVar;
                    }
                }
            }
            return false;
        },
        visitExportAllDeclaration: function (astPath) {
            var newFilePath = astPath.get('source').node.value;
            exportAllFiles.push(newFilePath);
            return false;
        }
    });
    if (exportAllFiles.length) {
        variableFilter
            .filter(function (v) { return !variables[v]; })
            .forEach(function (exportName) {
            variables[exportName] = { filePath: exportAllFiles, exportName: exportName };
        });
    }
    return { variables: variables, exportAll: exportAllFiles.length > 0 };
}
exports.default = default_1;
