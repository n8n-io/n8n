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
var slotHandler_1 = require("./slotHandler");
var getProperties_1 = __importDefault(require("./utils/getProperties"));
/**
 * Extract slots information form the render function of an object-style VueJs component
 * @param documentation
 * @param path
 */
function slotHandler(documentation, path) {
    var _a;
    if (bt.isObjectExpression(path.node)) {
        var functionalPath = (0, getProperties_1.default)(path, 'functional');
        // if no prop return
        if (!functionalPath.length || !functionalPath[0].get('value')) {
            return Promise.resolve();
        }
        var renderPath = (0, getProperties_1.default)(path, 'render');
        if (!renderPath || !renderPath.length) {
            return Promise.resolve();
        }
        var renderValuePath = bt.isObjectProperty(renderPath[0].node)
            ? renderPath[0].get('value')
            : renderPath[0];
        var contextVariable = renderValuePath.get('params', 1);
        if (contextVariable.value) {
            if (bt.isIdentifier(contextVariable.value)) {
                var contextVariableName_1 = contextVariable.value.name;
                (0, recast_1.visit)(renderValuePath.node, {
                    // context.children
                    visitMemberExpression: function (pathMember) {
                        if (bt.isIdentifier(pathMember.node.object) &&
                            pathMember.node.object.name === contextVariableName_1 &&
                            bt.isIdentifier(pathMember.node.property) &&
                            pathMember.node.property.name === 'children') {
                            var doc = documentation.getSlotDescriptor('default');
                            (0, slotHandler_1.getSlotComment)(pathMember, doc);
                            return false;
                        }
                        this.traverse(pathMember);
                        return undefined;
                    }
                });
            }
            else {
                var childrenVarValueName_1 = (_a = contextVariable
                    .get('properties')
                    .value.filter(function (a) { return bt.isIdentifier(a.key) && a.key.name === 'children'; })[0]) === null || _a === void 0 ? void 0 : _a.value.name;
                (0, recast_1.visit)(renderValuePath.node, {
                    // destructured children
                    visitIdentifier: function (pathMember) {
                        if (pathMember.node.name === childrenVarValueName_1) {
                            var doc = documentation.getSlotDescriptor('default');
                            (0, slotHandler_1.getSlotComment)(pathMember, doc);
                            return false;
                        }
                        this.traverse(pathMember);
                        return undefined;
                    }
                });
            }
        }
    }
    return Promise.resolve();
}
exports.default = slotHandler;
