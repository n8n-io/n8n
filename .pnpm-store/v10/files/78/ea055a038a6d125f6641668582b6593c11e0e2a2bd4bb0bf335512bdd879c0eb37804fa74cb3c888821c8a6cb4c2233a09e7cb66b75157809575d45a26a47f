"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preHandlers = exports.slotHandlerLitteral = exports.slotHandlerFunctional = exports.slotHandler = exports.propHandler = exports.mixinsHandler = exports.methodHandler = exports.extendsHandler = exports.eventHandler = exports.displayNameHandler = exports.componentHandler = exports.classEventHandler = exports.classPropHandler = exports.classMethodHandler = exports.classDisplayNameHandler = void 0;
var classDisplayNameHandler_1 = __importDefault(require("./classDisplayNameHandler"));
exports.classDisplayNameHandler = classDisplayNameHandler_1.default;
var classMethodHandler_1 = __importDefault(require("./classMethodHandler"));
exports.classMethodHandler = classMethodHandler_1.default;
var classPropHandler_1 = __importDefault(require("./classPropHandler"));
exports.classPropHandler = classPropHandler_1.default;
var classEventHandler_1 = __importDefault(require("./classEventHandler"));
exports.classEventHandler = classEventHandler_1.default;
var componentHandler_1 = __importDefault(require("./componentHandler"));
exports.componentHandler = componentHandler_1.default;
var displayNameHandler_1 = __importDefault(require("./displayNameHandler"));
exports.displayNameHandler = displayNameHandler_1.default;
var eventHandler_1 = __importDefault(require("./eventHandler"));
exports.eventHandler = eventHandler_1.default;
var extendsHandler_1 = __importDefault(require("./extendsHandler"));
exports.extendsHandler = extendsHandler_1.default;
var methodHandler_1 = __importDefault(require("./methodHandler"));
exports.methodHandler = methodHandler_1.default;
var mixinsHandler_1 = __importDefault(require("./mixinsHandler"));
exports.mixinsHandler = mixinsHandler_1.default;
var propHandler_1 = __importDefault(require("./propHandler"));
exports.propHandler = propHandler_1.default;
var slotHandler_1 = __importDefault(require("./slotHandler"));
exports.slotHandler = slotHandler_1.default;
var slotHandlerFunctional_1 = __importDefault(require("./slotHandlerFunctional"));
exports.slotHandlerFunctional = slotHandlerFunctional_1.default;
var slotHandlerLiteral_1 = __importDefault(require("./slotHandlerLiteral"));
exports.slotHandlerLitteral = slotHandlerLiteral_1.default;
var defaultHandlers = [
    displayNameHandler_1.default,
    componentHandler_1.default,
    methodHandler_1.default,
    propHandler_1.default,
    eventHandler_1.default,
    slotHandler_1.default,
    slotHandlerFunctional_1.default,
    slotHandlerLiteral_1.default,
    classDisplayNameHandler_1.default,
    classMethodHandler_1.default,
    classPropHandler_1.default,
    classEventHandler_1.default
];
exports.preHandlers = [
    // have to be first if they can be overridden
    extendsHandler_1.default,
    // have to be second as they can be overridden too
    mixinsHandler_1.default
];
exports.default = defaultHandlers;
