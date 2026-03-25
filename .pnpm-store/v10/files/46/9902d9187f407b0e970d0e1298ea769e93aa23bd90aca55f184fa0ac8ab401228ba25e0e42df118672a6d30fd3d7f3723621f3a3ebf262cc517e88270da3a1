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
var eventHandler_1 = require("./eventHandler");
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var resolveIdentifier_1 = __importDefault(require("../utils/resolveIdentifier"));
/**
 * Extracts all events from a class-style component code
 * @param documentation
 * @param path
 * @param astPath
 */
function classEventHandler(documentation, path, astPath) {
    if (bt.isClassDeclaration(path.node)) {
        (0, recast_1.visit)(path.node, {
            visitClassMethod: function (nodePath) {
                if (nodePath.node.decorators &&
                    bt.isCallExpression(nodePath.node.decorators[0].expression) &&
                    bt.isIdentifier(nodePath.node.decorators[0].expression.callee) &&
                    nodePath.node.decorators[0].expression.callee.name === 'Emit') {
                    // fetch the leading comments on the wrapping expression
                    var docblock = (0, getDocblock_1.default)(nodePath);
                    var doclets = (0, getDoclets_1.default)(docblock || '');
                    var eventName = void 0;
                    var eventTags = doclets.tags ? doclets.tags.filter(function (d) { return d.title === 'event'; }) : [];
                    var exp = nodePath.get('decorators', 0).get('expression');
                    // if someone wants to document it with anything else, they can force it
                    if (eventTags.length) {
                        eventName = eventTags[0].content;
                    }
                    else if (exp.get('arguments').value.length) {
                        var firstArg = exp.get('arguments', 0);
                        if (bt.isIdentifier(firstArg.node)) {
                            firstArg = (0, resolveIdentifier_1.default)(astPath, firstArg);
                        }
                        if (!bt.isStringLiteral(firstArg.node)) {
                            return false;
                        }
                        eventName = firstArg.node.value;
                    }
                    else if (bt.isIdentifier(nodePath.node.key)) {
                        eventName = nodePath.node.key.name;
                    }
                    else {
                        return false;
                    }
                    var evtDescriptor = documentation.getEventDescriptor(eventName);
                    (0, eventHandler_1.setEventDescriptor)(evtDescriptor, doclets);
                    return false;
                }
                this.traverse(nodePath);
            }
        });
    }
    return Promise.resolve();
}
exports.default = classEventHandler;
