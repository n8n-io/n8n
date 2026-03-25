"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.wrapSDK = exports._wrapClient = void 0;
const traceable_js_1 = require("../traceable.cjs");
const _wrapClient = (sdk, runName, options) => {
    return new Proxy(sdk, {
        get(target, propKey, receiver) {
            const originalValue = target[propKey];
            if (typeof originalValue === "function") {
                return (0, traceable_js_1.traceable)(originalValue.bind(target), {
                    run_type: "llm",
                    ...options,
                    name: [runName, propKey.toString()].join("."),
                });
            }
            else if (originalValue != null &&
                !Array.isArray(originalValue) &&
                // eslint-disable-next-line no-instanceof/no-instanceof
                !(originalValue instanceof Date) &&
                typeof originalValue === "object") {
                return (0, exports._wrapClient)(originalValue, [runName, propKey.toString()].join("."), options);
            }
            else {
                return Reflect.get(target, propKey, receiver);
            }
        },
    });
};
exports._wrapClient = _wrapClient;
/**
 * Wrap an arbitrary SDK, enabling automatic LangSmith tracing.
 * Method signatures are unchanged.
 *
 * Note that this will wrap and trace ALL SDK methods, not just
 * LLM completion methods. If the passed SDK contains other methods,
 * we recommend using the wrapped instance for LLM calls only.
 * @param sdk An arbitrary SDK instance.
 * @param options LangSmith options.
 * @returns
 */
const wrapSDK = (sdk, options) => {
    const traceableOptions = options ? { ...options } : undefined;
    if (traceableOptions != null) {
        delete traceableOptions.runName;
        delete traceableOptions.name;
    }
    return (0, exports._wrapClient)(sdk, options?.name ?? options?.runName ?? sdk.constructor?.name, traceableOptions);
};
exports.wrapSDK = wrapSDK;
