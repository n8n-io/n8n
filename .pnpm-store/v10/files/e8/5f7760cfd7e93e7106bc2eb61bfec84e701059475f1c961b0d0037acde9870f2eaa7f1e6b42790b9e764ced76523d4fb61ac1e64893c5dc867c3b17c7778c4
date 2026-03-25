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
var getDoclets_1 = __importDefault(require("../utils/getDoclets"));
var getProperties_1 = __importDefault(require("./utils/getProperties"));
var getDocblock_1 = __importDefault(require("../utils/getDocblock"));
/**
 * Extract slots information from the render or setup function of an object-style VueJs component
 * @param documentation
 * @param path
 */
function slotHandler(documentation, path) {
    if (bt.isObjectExpression(path.node)) {
        var renderPath = (0, getProperties_1.default)(path, 'render');
        var setupPath = (0, getProperties_1.default)(path, 'setup');
        if (!renderPath.length && !setupPath.length) {
            return Promise.resolve();
        }
        var functionPath = renderPath.length ? renderPath : setupPath;
        var i = 0;
        var docBlock = (0, getDocblock_1.default)(functionPath[0], { commentIndex: i });
        while (docBlock) {
            // if no doc block return
            if (!docBlock || !docBlock.length) {
                return Promise.resolve();
            }
            var jsDoc = (0, getDoclets_1.default)(docBlock);
            if (jsDoc.tags) {
                var slotTag = jsDoc.tags.find(function (a) { return a.title === 'slot'; });
                if (slotTag) {
                    var name_1 = typeof slotTag.content === 'string' ? slotTag.content : 'default';
                    var slotDescriptor = documentation.getSlotDescriptor(name_1);
                    slotDescriptor.description = jsDoc.description;
                    var bindingsTag = jsDoc.tags.filter(function (t) { return t.title === 'binding'; });
                    if (bindingsTag) {
                        slotDescriptor.bindings = bindingsTag;
                    }
                }
            }
            docBlock = (0, getDocblock_1.default)(functionPath[0], { commentIndex: ++i });
        }
    }
    return Promise.resolve();
}
exports.default = slotHandler;
