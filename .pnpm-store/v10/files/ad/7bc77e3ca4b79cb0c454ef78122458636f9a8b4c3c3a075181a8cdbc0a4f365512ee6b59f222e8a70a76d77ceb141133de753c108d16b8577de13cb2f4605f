"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDefaultProjectName = void 0;
const env_js_1 = require("./env.cjs");
const getDefaultProjectName = () => {
    return ((0, env_js_1.getLangSmithEnvironmentVariable)("PROJECT") ??
        (0, env_js_1.getEnvironmentVariable)("LANGCHAIN_SESSION") ?? // TODO: Deprecate
        "default");
};
exports.getDefaultProjectName = getDefaultProjectName;
