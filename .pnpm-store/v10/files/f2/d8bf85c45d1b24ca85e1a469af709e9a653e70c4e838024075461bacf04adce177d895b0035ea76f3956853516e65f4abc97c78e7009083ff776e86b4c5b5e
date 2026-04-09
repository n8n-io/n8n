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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
const ts_jest_transformer_1 = require("./legacy/ts-jest-transformer");
__exportStar(require("./config"), exports);
__exportStar(require("./constants"), exports);
__exportStar(require("./legacy/compiler"), exports);
__exportStar(require("./legacy/ts-jest-transformer"), exports);
__exportStar(require("./legacy/config/config-set"), exports);
__exportStar(require("./presets/create-jest-preset"), exports);
__exportStar(require("./raw-compiler-options"), exports);
__exportStar(require("./utils"), exports);
__exportStar(require("./types"), exports);
exports.default = {
    createTransformer(tsJestConfig) {
        return new ts_jest_transformer_1.TsJestTransformer(tsJestConfig);
    },
};
