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
var eventHandler_1 = require("../script-handlers/eventHandler");
var getTemplateExpressionAST_1 = __importDefault(require("../utils/getTemplateExpressionAST"));
var guards_1 = require("../utils/guards");
function eventHandler(documentation, templateAst, siblings) {
    if ((0, guards_1.isBaseElementNode)(templateAst)) {
        templateAst.props.forEach(function (prop) {
            if ((0, guards_1.isDirectiveNode)(prop)) {
                if (prop.name === 'on') {
                    // only look at expressions
                    var expression = prop.exp;
                    if ((0, guards_1.isSimpleExpressionNode)(expression)) {
                        getEventsFromExpression(templateAst, expression.content, documentation, siblings);
                    }
                }
            }
        });
    }
}
exports.default = eventHandler;
function getEventsFromExpression(item, expression, documentation, siblings) {
    var ast = (0, getTemplateExpressionAST_1.default)(expression);
    var eventsFound = [];
    (0, recast_1.visit)(ast.program, {
        visitCallExpression: function (path) {
            var obj = path.node ? path.node.callee : undefined;
            var args = path.node ? path.node.arguments : undefined;
            if (obj && args && bt.isIdentifier(obj) && obj.name === '$emit' && args.length) {
                var evtName = bt.isStringLiteral(args[0]) ? args[0].value : '<undefined>';
                documentation.getEventDescriptor(evtName);
                eventsFound.push(evtName);
                return false;
            }
            this.traverse(path);
            return undefined;
        }
    });
    if (eventsFound.length) {
        var leadingComments_1 = (0, extractLeadingComment_1.default)(siblings, item);
        if (leadingComments_1.length) {
            eventsFound.forEach(function (evtName) {
                leadingComments_1.forEach(function (comment) {
                    var doclets = (0, getDoclets_1.default)(comment);
                    var eventTags = doclets.tags && doclets.tags.filter(function (d) { return d.title === 'event'; });
                    if (!(eventTags &&
                        eventTags.length &&
                        eventTags.findIndex(function (et) { return et.content === evtName; }) > -1)) {
                        return;
                    }
                    var e = documentation.getEventDescriptor(evtName);
                    (0, eventHandler_1.setEventDescriptor)(e, doclets);
                });
            });
        }
    }
}
