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
exports.InferenceClientEndpoint = exports.HfInference = exports.InferenceClient = void 0;
const tasks = __importStar(require("./tasks/index.js"));
const omit_js_1 = require("./utils/omit.js");
const typedEntries_js_1 = require("./utils/typedEntries.js");
class InferenceClient {
    accessToken;
    defaultOptions;
    constructor(accessToken = "", defaultOptions = {}) {
        this.accessToken = accessToken;
        this.defaultOptions = defaultOptions;
        for (const [name, fn] of (0, typedEntries_js_1.typedEntries)(tasks)) {
            Object.defineProperty(this, name, {
                enumerable: false,
                value: (params, options) => 
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                fn(
                /// ^ The cast of fn to any is necessary, otherwise TS can't compile because the generated union type is too complex
                { endpointUrl: defaultOptions.endpointUrl, accessToken, ...params }, {
                    ...(0, omit_js_1.omit)(defaultOptions, ["endpointUrl"]),
                    ...options,
                }),
            });
        }
    }
    /**
     * Returns a new instance of InferenceClient tied to a specified endpoint.
     *
     * For backward compatibility mostly.
     */
    endpoint(endpointUrl) {
        return new InferenceClient(this.accessToken, { ...this.defaultOptions, endpointUrl });
    }
}
exports.InferenceClient = InferenceClient;
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
class HfInference extends InferenceClient {
}
exports.HfInference = HfInference;
/**
 * For backward compatibility only, will remove soon.
 * @deprecated replace with InferenceClient
 */
class InferenceClientEndpoint extends InferenceClient {
}
exports.InferenceClientEndpoint = InferenceClientEndpoint;
