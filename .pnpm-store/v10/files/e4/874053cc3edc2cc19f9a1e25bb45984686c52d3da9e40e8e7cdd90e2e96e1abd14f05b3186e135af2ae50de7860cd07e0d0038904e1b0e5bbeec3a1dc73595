"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRuntimeConfig = void 0;
const sha256_js_1 = require("@aws-crypto/sha256-js");
const invalid_dependency_1 = require("@smithy/invalid-dependency");
const runtimeConfig_browser_1 = require("./runtimeConfig.browser");
const getRuntimeConfig = (config) => {
    const browserDefaults = (0, runtimeConfig_browser_1.getRuntimeConfig)(config);
    return {
        ...browserDefaults,
        ...config,
        runtime: "react-native",
        eventStreamPayloadHandlerProvider: config?.eventStreamPayloadHandlerProvider ?? (() => ({
            handle: (0, invalid_dependency_1.invalidFunction)("event stream request is not supported in ReactNative."),
        })),
        sha256: config?.sha256 ?? sha256_js_1.Sha256,
    };
};
exports.getRuntimeConfig = getRuntimeConfig;
