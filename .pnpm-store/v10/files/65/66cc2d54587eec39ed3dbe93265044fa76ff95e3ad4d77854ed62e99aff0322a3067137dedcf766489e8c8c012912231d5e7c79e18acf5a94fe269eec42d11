"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
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
            if (obj && args && obj.type === 'Identifier' && obj.name === '$emit' && args.length) {
                var evtName = args[0].type === 'StringLiteral' ? args[0].value : '<undefined>';
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
