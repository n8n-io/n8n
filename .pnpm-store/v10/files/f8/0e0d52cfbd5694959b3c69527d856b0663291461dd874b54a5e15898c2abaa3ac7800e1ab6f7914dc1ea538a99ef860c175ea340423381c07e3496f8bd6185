"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getTypeDefinitionFromIdentifier = exports.defineHandler = void 0;
var fs_1 = __importDefault(require("fs"));
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var path_1 = require("path");
var babel_parser_1 = __importDefault(require("../../babel-parser"));
var makePathResolver_1 = __importDefault(require("../../utils/makePathResolver"));
function defineHandler(handler) {
    return handler;
}
exports.defineHandler = defineHandler;
var getTypeDefinitionFromIdentifierFromModule = function (module, typeName, opt, pathResolver) {
    var parser = (0, babel_parser_1.default)({ plugins: ['typescript'] });
    var filePath = pathResolver(module);
    if (!filePath) {
        return undefined;
    }
    return getTypeDefinitionFromIdentifier(parser.parse(fs_1.default.readFileSync(filePath, {
        encoding: 'utf-8'
    })), typeName, __assign(__assign({}, opt), { filePath: filePath }));
};
function getTypeDefinitionFromIdentifier(astPath, typeName, opt, importName) {
    var typeBody = undefined;
    var pathResolver = (0, makePathResolver_1.default)((0, path_1.dirname)(opt.filePath), opt.alias, opt.modules);
    (0, recast_1.visit)(astPath.program, {
        visitExportAllDeclaration: function (nodePath) {
            typeBody =
                typeBody !== null && typeBody !== void 0 ? typeBody : getTypeDefinitionFromIdentifierFromModule(nodePath.value.source.value, typeName, opt, pathResolver);
            return false;
        },
        visitExportSpecifier: function (nodePath) {
            if (!typeBody && nodePath.value.exported.name === typeName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(nodePath.parent.value.source.value, nodePath.value.local.name, opt, pathResolver);
            }
            return false;
        },
        visitImportSpecifier: function (nodePath) {
            if (!typeBody && nodePath.value.imported.name === typeName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(nodePath.parent.value.source.value, typeName, opt, pathResolver);
            }
            return false;
        },
        visitImportNamespaceSpecifier: function (path) {
            if (!typeBody && path.value.local.name === importName) {
                typeBody = getTypeDefinitionFromIdentifierFromModule(path.parent.value.source.value, typeName, opt, pathResolver);
            }
            return false;
        },
        visitTSInterfaceDeclaration: function (nodePath) {
            if (bt.isIdentifier(nodePath.node.id) && nodePath.node.id.name === typeName) {
                var interfaceBody_1 = nodePath.get('body', 'body');
                if (!interfaceBody_1) {
                    return;
                }
                // If the interface extends from other interfaces, look these up and insert their properties
                // into the just resolved interface. If the inheriting interface already has such a property
                // defined, to not add it, as the inheriting interface overwrites it.
                if (nodePath.value.extends) {
                    var parentInterfaces = nodePath.value.extends;
                    parentInterfaces.forEach(function (parentInterface) {
                        if (!bt.isIdentifier(parentInterface.expression)) {
                            return;
                        }
                        var parentInterfaceBody = getTypeDefinitionFromIdentifier(astPath, parentInterface.expression.name, opt);
                        parentInterfaceBody === null || parentInterfaceBody === void 0 ? void 0 : parentInterfaceBody.value.forEach(function (parentInterfaceProp) {
                            if (!interfaceBody_1.value.find(function (prop) {
                                return bt.isIdentifier(prop.key) &&
                                    bt.isIdentifier(parentInterfaceProp.key) &&
                                    prop.key.name === parentInterfaceProp.key.name;
                            })) {
                                interfaceBody_1.value.splice(0, 0, parentInterfaceProp);
                            }
                        });
                    });
                }
                typeBody = interfaceBody_1;
            }
            return false;
        },
        visitTSTypeAliasDeclaration: function (nodePath) {
            if (bt.isIdentifier(nodePath.node.id) && nodePath.node.id.name === typeName) {
                var typeAnnotation = nodePath.get('typeAnnotation');
                if (bt.isTSTypeLiteral(typeAnnotation.node)) {
                    typeBody = typeAnnotation.get('members');
                }
                else if (bt.isTSTypeReference(typeAnnotation.node)) {
                    typeBody = getTypeDefinitionFromIdentifier(astPath, typeAnnotation.node.typeName.name, opt);
                }
            }
            return false;
        }
    });
    return typeBody;
}
exports.getTypeDefinitionFromIdentifier = getTypeDefinitionFromIdentifier;
exports.default = {};
