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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.snippets = exports.setLogger = exports.HfInference = exports.InferenceClientEndpoint = exports.InferenceClient = void 0;
var InferenceClient_js_1 = require("./InferenceClient.js");
Object.defineProperty(exports, "InferenceClient", { enumerable: true, get: function () { return InferenceClient_js_1.InferenceClient; } });
Object.defineProperty(exports, "InferenceClientEndpoint", { enumerable: true, get: function () { return InferenceClient_js_1.InferenceClientEndpoint; } });
Object.defineProperty(exports, "HfInference", { enumerable: true, get: function () { return InferenceClient_js_1.HfInference; } });
__exportStar(require("./errors.js"), exports);
__exportStar(require("./types.js"), exports);
__exportStar(require("./tasks/index.js"), exports);
const snippets = __importStar(require("./snippets/index.js"));
exports.snippets = snippets;
__exportStar(require("./lib/getProviderHelper.js"), exports);
__exportStar(require("./lib/makeRequestOptions.js"), exports);
var logger_js_1 = require("./lib/logger.js");
Object.defineProperty(exports, "setLogger", { enumerable: true, get: function () { return logger_js_1.setLogger; } });
