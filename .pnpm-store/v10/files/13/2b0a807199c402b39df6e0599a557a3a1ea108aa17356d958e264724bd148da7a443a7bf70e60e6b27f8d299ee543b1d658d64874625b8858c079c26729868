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
var getArgFromDecorator_1 = __importDefault(require("../utils/getArgFromDecorator"));
var getProperties_1 = __importDefault(require("./utils/getProperties"));
/**
 * Extracts the name of the component from a class-style component
 * @param documentation
 * @param path
 */
function classDisplayNameHandler(documentation, path) {
    if (bt.isClassDeclaration(path.node)) {
        var config = (0, getArgFromDecorator_1.default)(path.get('decorators'));
        var displayName_1;
        if (config && bt.isObjectExpression(config.node)) {
            (0, getProperties_1.default)(config, 'name').forEach(function (p) {
                var valuePath = p.get('value');
                if (bt.isStringLiteral(valuePath.node)) {
                    displayName_1 = valuePath.node.value;
                }
            });
        }
        else {
            displayName_1 = path.node.id ? path.node.id.name : undefined;
        }
        if (displayName_1) {
            documentation.set('displayName', displayName_1);
        }
    }
    return Promise.resolve();
}
exports.default = classDisplayNameHandler;
