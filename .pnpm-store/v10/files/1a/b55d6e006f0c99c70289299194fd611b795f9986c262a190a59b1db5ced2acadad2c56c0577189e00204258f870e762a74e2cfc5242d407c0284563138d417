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
var extractLeadingComment_1 = __importDefault(require("../utils/extractLeadingComment"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var getTemplateExpressionAST_1 = __importDefault(require("../utils/getTemplateExpressionAST"));
var guards_1 = require("../utils/guards");
function propTemplateHandler(documentation, templateAst, siblings, options) {
    if (options.functional) {
        propsInAttributes(documentation, templateAst, siblings);
        propsInInterpolation(documentation, templateAst, siblings);
    }
}
exports.default = propTemplateHandler;
function propsInAttributes(documentation, templateAst, siblings) {
    if ((0, guards_1.isBaseElementNode)(templateAst)) {
        templateAst.props.forEach(function (prop) {
            if ((0, guards_1.isDirectiveNode)(prop) && (0, guards_1.isSimpleExpressionNode)(prop.exp)) {
                getPropsFromExpression(documentation, templateAst, prop.exp, siblings);
            }
        });
    }
}
function propsInInterpolation(documentation, templateAst, siblings) {
    if ((0, guards_1.isInterpolationNode)(templateAst) && (0, guards_1.isSimpleExpressionNode)(templateAst.content)) {
        getPropsFromExpression(documentation, templateAst, templateAst.content, siblings);
    }
}
function getPropsFromExpression(documentation, item, exp, siblings) {
    var expression = exp.content;
    var ast = (0, getTemplateExpressionAST_1.default)(expression);
    var propsFound = [];
    (0, recast_1.visit)(ast.program, {
        visitMemberExpression: function (path) {
            var obj = path.node ? path.node.object : undefined;
            var propName = path.node ? path.node.property : undefined;
            if (obj &&
                propName &&
                bt.isIdentifier(obj) &&
                obj.name === 'props' &&
                bt.isIdentifier(propName)) {
                var pName = propName.name;
                var p = documentation.getPropDescriptor(pName);
                propsFound.push(pName);
                p.type = { name: 'undefined' };
            }
            return false;
        }
    });
    if (propsFound.length) {
        var comments = (0, extractLeadingComment_1.default)(siblings, item);
        comments.forEach(function (comment) {
            var doclets = (0, getDoclets_1.default)(comment);
            var propTags = doclets.tags && doclets.tags.filter(function (d) { return d.title === 'prop'; });
            if (propTags && propTags.length) {
                propsFound.forEach(function (pName) {
                    var propTag = propTags.filter(function (pt) { return pt.name === pName; });
                    if (propTag.length) {
                        var p = documentation.getPropDescriptor(pName);
                        p.type = propTag[0].type;
                        if (typeof propTag[0].description === 'string') {
                            p.description = propTag[0].description;
                        }
                    }
                });
            }
        });
    }
}
