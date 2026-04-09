"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
            if ((obj === null || obj === void 0 ? void 0 : obj.type) === 'Identifier' && obj.name === 'props' && (propName === null || propName === void 0 ? void 0 : propName.type) === 'Identifier') {
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
