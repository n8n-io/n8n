"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isTracingEnabled = void 0;
const env_js_1 = require("./utils/env.cjs");
const isTracingEnabled = (tracingEnabled) => {
    if (tracingEnabled !== undefined) {
        return tracingEnabled;
    }
    const envVars = ["TRACING_V2", "TRACING"];
    return !!envVars.find((envVar) => (0, env_js_1.getLangSmithEnvironmentVariable)(envVar) === "true");
};
exports.isTracingEnabled = isTracingEnabled;
