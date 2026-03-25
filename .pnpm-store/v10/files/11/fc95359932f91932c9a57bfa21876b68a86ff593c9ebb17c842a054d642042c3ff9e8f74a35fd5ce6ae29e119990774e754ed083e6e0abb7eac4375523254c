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
var babel_parser_1 = __importDefault(require("../babel-parser"));
var extractLeadingComment_1 = __importDefault(require("../utils/extractLeadingComment"));
var slotHandler_1 = require("../script-handlers/slotHandler");
var guards_1 = require("../utils/guards");
var parser = (0, babel_parser_1.default)({ plugins: ['typescript'] });
function slotHandler(documentation, templateAst, siblings) {
    var _a;
    if ((0, guards_1.isBaseElementNode)(templateAst) && templateAst.tag === 'slot') {
        var nameProp = templateAst.props.filter(guards_1.isAttributeNode).find(function (b) { return b.name === 'name'; });
        var slotName = nameProp && nameProp.value ? nameProp.value.content : undefined;
        if (!slotName) {
            var dynExpr = templateAst.props
                .filter(guards_1.isDirectiveNode)
                .find(function (b) { return b.name === 'bind' && (0, guards_1.isSimpleExpressionNode)(b.arg) && b.arg.content === 'name'; });
            if (dynExpr && (0, guards_1.isSimpleExpressionNode)(dynExpr.exp) && dynExpr.exp) {
                slotName = dynExpr.exp.content;
            }
            else {
                slotName = 'default';
            }
        }
        var bindings = templateAst.props.filter(
        // only keep simple binds and static attributes
        function (b) { return b.name !== 'name' && (b.name === 'bind' || (0, guards_1.isAttributeNode)(b)); });
        var slotDescriptor_1 = documentation.getSlotDescriptor(slotName);
        if (bindings.length) {
            slotDescriptor_1.scoped = true;
        }
        var comments = (0, extractLeadingComment_1.default)(siblings, templateAst);
        var bindingDescriptors_1 = [];
        comments.forEach(function (comment) {
            // if a comment contains @slot,
            // use it to determine bindings and tags
            // if multiple @slot, use the last one
            if (comment.length) {
                var doclets = (0, slotHandler_1.parseSlotDocBlock)(comment, slotDescriptor_1);
                if (doclets && doclets.bindings) {
                    bindingDescriptors_1 = doclets.bindings;
                }
            }
        });
        var simpleBindings_1 = [];
        // deal with v-bind="" props
        var simpleVBind = bindings.find(function (b) { return (0, guards_1.isDirectiveNode)(b) && !b.arg; });
        var rawVBind_1 = false;
        if (simpleVBind && (0, guards_1.isSimpleExpressionNode)(simpleVBind.exp)) {
            var ast = parser.parse("() => (".concat(simpleVBind.exp.content, ")"));
            (0, recast_1.visit)(ast.program, {
                visitObjectExpression: function (path) {
                    path.get('properties').each(function (property) {
                        var node = property.node;
                        if (bt.isProperty(node) || bt.isObjectProperty(node)) {
                            var name_1 = (0, recast_1.print)(property.get('key')).code;
                            var bindingDesc = bindingDescriptors_1.filter(function (t) { return t.name === name_1; })[0];
                            simpleBindings_1.push(bindingDesc
                                ? bindingDesc
                                : {
                                    name: name_1,
                                    title: 'binding'
                                });
                        }
                        else {
                            rawVBind_1 = true;
                        }
                    });
                    return false;
                }
            });
        }
        if (bindings.length) {
            slotDescriptor_1.bindings = simpleBindings_1.concat(bindings.reduce(function (acc, b) {
                if (!rawVBind_1 && (0, guards_1.isDirectiveNode)(b) && !b.arg) {
                    return acc;
                }
                // resolve name of binding
                var name = (0, guards_1.isDirectiveNode)(b) && b.arg && (0, guards_1.isSimpleExpressionNode)(b.arg)
                    ? b.arg.content
                    : "".concat((0, guards_1.isDirectiveNode)(b) ? 'v-' : '').concat(b.name);
                var bindingDesc = bindingDescriptors_1.filter(function (t) { return t.name === name; })[0];
                acc.push(bindingDesc ? bindingDesc : { name: name, title: 'binding' });
                return acc;
            }, []));
        }
        var restOfBindings = bindingDescriptors_1.filter(function (bindFromComment) { var _a; return !((_a = slotDescriptor_1.bindings) === null || _a === void 0 ? void 0 : _a.some(function (bindFromData) { return bindFromData.title === bindFromComment.title; })); });
        if (restOfBindings.length) {
            slotDescriptor_1.bindings = (_a = slotDescriptor_1.bindings) === null || _a === void 0 ? void 0 : _a.concat(restOfBindings);
        }
    }
}
exports.default = slotHandler;
