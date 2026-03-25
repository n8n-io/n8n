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
exports.setEventDescriptor = exports.eventHandlerMethods = exports.eventHandlerEmits = void 0;
var bt = __importStar(require("@babel/types"));
var recast_1 = require("recast");
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var resolveIdentifier_1 = __importDefault(require("../utils/resolveIdentifier"));
var getPropsFilter_1 = __importDefault(require("../utils/getPropsFilter"));
function getCommentBlockAndTags(p, _a) {
    var _b = _a === void 0 ? { commentIndex: 1 } : _a, commentIndex = _b.commentIndex;
    var docBlock = (0, getDocblock_1.default)(p, { commentIndex: commentIndex });
    return docBlock ? (0, getDoclets_1.default)(docBlock) : null;
}
/**
 * Extracts events information from a VueJs component
 * wether it's a class based component or an option based one
 *
 * @param documentation
 * @param path
 * @param astPath
 */
function eventHandler(documentation, path, astPath) {
    if (bt.isObjectExpression(path.node)) {
        eventHandlerMethods(documentation, path);
        eventHandlerEmits(documentation, path);
    }
    // browse the entirety of the code inside the component to look for this.$emit
    (0, recast_1.visit)(path.node, {
        visitCallExpression: function (pathExpression) {
            if (bt.isMemberExpression(pathExpression.node.callee) &&
                bt.isThisExpression(pathExpression.node.callee.object) &&
                bt.isIdentifier(pathExpression.node.callee.property) &&
                pathExpression.node.callee.property.name === '$emit') {
                var args = pathExpression.node.arguments;
                if (!args.length) {
                    return false;
                }
                // fetch the leading comments on the wrapping expression
                var docblock = (0, getDocblock_1.default)(pathExpression.parentPath);
                var doclets = (0, getDoclets_1.default)(docblock || '');
                var eventName = void 0;
                var eventTags = doclets.tags ? doclets.tags.filter(function (d) { return d.title === 'event'; }) : [];
                // if someone wants to document it with anything else, they can force it
                if (eventTags.length) {
                    eventName = eventTags[0].content;
                }
                else {
                    var firstArg = pathExpression.get('arguments', 0);
                    if (bt.isIdentifier(firstArg.node)) {
                        firstArg = (0, resolveIdentifier_1.default)(astPath, firstArg);
                    }
                    if (!firstArg || !bt.isStringLiteral(firstArg.node)) {
                        return false;
                    }
                    eventName = firstArg.node.value;
                }
                // if this event is documented somewhere else leave it alone
                var evtDescriptor = documentation.getEventDescriptor(eventName);
                setEventDescriptor(evtDescriptor, doclets);
                if (args.length > 1 && !evtDescriptor.type) {
                    evtDescriptor.type = {
                        names: ['undefined']
                    };
                }
                if (args.length > 2 && !evtDescriptor.properties) {
                    evtDescriptor.properties = [];
                }
                if (evtDescriptor.properties && evtDescriptor.properties.length < args.length - 2) {
                    var i = args.length - 2 - evtDescriptor.properties.length;
                    while (i--) {
                        evtDescriptor.properties.push({
                            type: { names: ['undefined'] },
                            name: "<anonymous".concat(args.length - i - 2, ">")
                        });
                    }
                }
                return false;
            }
            this.traverse(pathExpression);
            return undefined;
        }
    });
    return Promise.resolve();
}
exports.default = eventHandler;
/**
 * Extracts events information from an
 * object-style VueJs component `emits` option
 *
 * @param documentation
 * @param path
 */
function eventHandlerEmits(documentation, path) {
    var emitsPath = path
        .get('properties')
        .filter(function (p) { return bt.isObjectProperty(p.node) && (0, getPropsFilter_1.default)('emits')(p); });
    // if no emits member return
    if (!emitsPath.length) {
        return;
    }
    var emitsObject = emitsPath[0].get('value');
    if (bt.isArrayExpression(emitsObject.node)) {
        emitsObject.get('elements').value.forEach(function (event, i) {
            if (bt.isStringLiteral(event)) {
                var eventDescriptor = documentation.getEventDescriptor(event.value);
                var eventPath = emitsObject.get('elements', i);
                var docblock = (0, getDocblock_1.default)(eventPath);
                var doclets = (0, getDoclets_1.default)(docblock || '');
                setEventDescriptor(eventDescriptor, doclets);
            }
        });
    }
    else if (bt.isObjectExpression(emitsObject.node)) {
        emitsObject.get('properties').value.forEach(function (event, i) {
            var eventName = bt.isStringLiteral(event.key)
                ? event.key.value
                : bt.isIdentifier(event.key)
                    ? event.key.name
                    : undefined;
            if (eventName) {
                var eventDescriptor = documentation.getEventDescriptor(eventName);
                var eventPath = emitsObject.get('properties', i);
                var docblock = (0, getDocblock_1.default)(eventPath);
                var doclets = (0, getDoclets_1.default)(docblock || '');
                setEventDescriptor(eventDescriptor, doclets);
            }
        });
    }
}
exports.eventHandlerEmits = eventHandlerEmits;
/**
 * Extracts events information from an
 * object-style VueJs component `methods` option
 *
 * @param documentation
 * @param path
 */
function eventHandlerMethods(documentation, path) {
    var methodsPath = path
        .get('properties')
        .filter(function (p) { return bt.isObjectProperty(p.node) && (0, getPropsFilter_1.default)('methods')(p); });
    // if no method return
    if (!methodsPath.length) {
        return;
    }
    var methodsObject = methodsPath[0].get('value');
    if (bt.isObjectExpression(methodsObject.node)) {
        methodsObject.get('properties').each(function (p) {
            var commentedMethod = bt.isObjectMethod(p.node) ? p : p.parentPath;
            var jsDocTags = (getCommentBlockAndTags(commentedMethod) || {}).tags;
            if (!jsDocTags) {
                return;
            }
            var firesTags = jsDocTags.filter(function (tag) { return tag.title === 'fires'; });
            firesTags.forEach(function (tag) {
                var eventName = tag.content;
                var eventDescriptor = documentation.getEventDescriptor(eventName);
                var currentBlock;
                var foundEventDescriptor;
                var commentIndex = 1;
                do {
                    currentBlock = getCommentBlockAndTags(commentedMethod, { commentIndex: ++commentIndex });
                    if (currentBlock &&
                        currentBlock.tags &&
                        currentBlock.tags.some(function (tag) { return tag.title === 'event' && tag.content === eventName; })) {
                        foundEventDescriptor = currentBlock;
                    }
                } while (currentBlock && !foundEventDescriptor);
                if (foundEventDescriptor) {
                    setEventDescriptor(eventDescriptor, foundEventDescriptor);
                }
            });
        });
    }
}
exports.eventHandlerMethods = eventHandlerMethods;
/**
 * Accepted tags for conveying event properties
 */
var PROPERTY_TAGS = ['property', 'arg', 'arguments', 'param'];
function setEventDescriptor(eventDescriptor, jsDoc) {
    if (jsDoc.description && jsDoc.description.length) {
        eventDescriptor.description = jsDoc.description;
    }
    var nonNullTags = jsDoc.tags ? jsDoc.tags : [];
    var typeTags = nonNullTags.filter(function (tg) { return tg.title === 'type'; });
    eventDescriptor.type = typeTags.length
        ? { names: typeTags.map(function (t) { return t.type.name; }) }
        : eventDescriptor.type;
    var propertyTags = nonNullTags.filter(function (tg) { return PROPERTY_TAGS.includes(tg.title); });
    if (propertyTags.length) {
        eventDescriptor.properties = propertyTags.map(function (tg) {
            return { type: { names: [tg.type.name] }, name: tg.name, description: tg.description };
        });
    }
    // remove the property an type tags from the tag array
    var tags = nonNullTags.filter(function (tg) { return tg.title !== 'type' && tg.title !== 'property' && tg.title !== 'event'; });
    if (tags.length) {
        eventDescriptor.tags = tags;
    }
    else {
        delete eventDescriptor.tags;
    }
    return eventDescriptor;
}
exports.setEventDescriptor = setEventDescriptor;
