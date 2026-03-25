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
exports.setMethodDescriptor = void 0;
var bt = __importStar(require("@babel/types"));
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var getTypeFromAnnotation_1 = __importDefault(require("../utils/getTypeFromAnnotation"));
var transformTagsIntoObject_1 = __importDefault(require("../utils/transformTagsIntoObject"));
var getProperties_1 = __importDefault(require("./utils/getProperties"));
/**
 * Extracts methods information from an object-style VueJs component
 * @param documentation
 * @param path
 */
function methodHandler(documentation, path) {
    var _a;
    if (bt.isObjectExpression(path.node)) {
        var exposePath = (0, getProperties_1.default)(path, 'expose');
        var exposeArray_1 = ((_a = exposePath[0]) === null || _a === void 0 ? void 0 : _a.get('value', 'elements').map(function (el) { return el.value.value; })) || [];
        var methodsPath = (0, getProperties_1.default)(path, 'methods');
        // if no method return
        if (!methodsPath.length) {
            return Promise.resolve();
        }
        var methodsObject = methodsPath[0].get('value');
        if (bt.isObjectExpression(methodsObject.node)) {
            methodsObject.get('properties').each(function (p) {
                var methodName = '<anonymous>';
                if (bt.isObjectProperty(p.node) && bt.isIdentifier(p.node.key)) {
                    var val = p.get('value');
                    methodName = p.node.key.name;
                    if (!Array.isArray(val)) {
                        p = val;
                    }
                }
                methodName =
                    bt.isObjectMethod(p.node) && bt.isIdentifier(p.node.key) ? p.node.key.name : methodName;
                var docBlock = (0, getDocblock_1.default)(bt.isObjectMethod(p.node) ? p : p.parentPath);
                var jsDoc = docBlock ? (0, getDoclets_1.default)(docBlock) : { description: '', tags: [] };
                var jsDocTags = jsDoc.tags ? jsDoc.tags : [];
                // ignore the method if there is no public tag
                if (!jsDocTags.some(function (t) { return t.title === 'access' && t.content === 'public'; }) &&
                    !exposeArray_1.includes(methodName)) {
                    return;
                }
                var methodDescriptor = documentation.getMethodDescriptor(methodName);
                if (jsDoc.description) {
                    methodDescriptor.description = jsDoc.description;
                }
                setMethodDescriptor(methodDescriptor, p, jsDocTags);
            });
        }
    }
    return Promise.resolve();
}
exports.default = methodHandler;
function setMethodDescriptor(methodDescriptor, method, jsDocTags) {
    // params
    describeParams(method, methodDescriptor, jsDocTags.filter(function (tag) { return ['param', 'arg', 'argument'].indexOf(tag.title) >= 0; }));
    // returns
    describeReturns(method, methodDescriptor, jsDocTags.filter(function (t) { return t.title === 'returns'; }));
    // tags
    methodDescriptor.tags = (0, transformTagsIntoObject_1.default)(jsDocTags);
    return methodDescriptor;
}
exports.setMethodDescriptor = setMethodDescriptor;
function describeParams(methodPath, methodDescriptor, jsDocParamTags) {
    // if there is no parameter no need to parse them
    var fExp = methodPath.node;
    if (!fExp.params || !jsDocParamTags || (!fExp.params.length && !jsDocParamTags.length)) {
        return;
    }
    var params = [];
    fExp.params.forEach(function (par, i) {
        var name;
        if (bt.isIdentifier(par)) {
            // simple params
            name = par.name;
        }
        else if (bt.isIdentifier(par.left)) {
            // es6 default params
            name = par.left.name;
        }
        else {
            // unrecognized pattern
            return;
        }
        var jsDocTags = jsDocParamTags.filter(function (tag) { return tag.name === name; });
        var jsDocTag = jsDocTags.length ? jsDocTags[0] : undefined;
        // if tag is not namely described try finding it by its order
        if (!jsDocTag) {
            if (jsDocParamTags[i] && !jsDocParamTags[i].name) {
                jsDocTag = jsDocParamTags[i];
            }
        }
        var param = { name: name };
        if (jsDocTag) {
            if (jsDocTag.type) {
                param.type = jsDocTag.type;
            }
            if (jsDocTag.description) {
                param.description = jsDocTag.description;
            }
        }
        if (!param.type && par.typeAnnotation) {
            var type = (0, getTypeFromAnnotation_1.default)(par.typeAnnotation);
            if (type) {
                param.type = type;
            }
        }
        params.push(param);
    });
    // in case the arguments are abstracted (using the arguments keyword)
    if (!params.length) {
        jsDocParamTags.forEach(function (doc) {
            params.push(doc);
        });
    }
    if (params.length) {
        methodDescriptor.params = params;
    }
}
function describeReturns(methodPath, methodDescriptor, jsDocReturnTags) {
    if (jsDocReturnTags.length) {
        var ret = jsDocReturnTags[0];
        if (ret.name && ret.description) {
            ret.description = "".concat(ret.name, " ").concat(ret.description);
        }
        methodDescriptor.returns = ret;
    }
    if (!methodDescriptor.returns || !methodDescriptor.returns.type) {
        var methodNode = methodPath.node;
        if (methodNode.returnType) {
            var type = (0, getTypeFromAnnotation_1.default)(methodNode.returnType);
            if (type) {
                methodDescriptor.returns = methodDescriptor.returns || {};
                methodDescriptor.returns.type = type;
            }
        }
    }
}
