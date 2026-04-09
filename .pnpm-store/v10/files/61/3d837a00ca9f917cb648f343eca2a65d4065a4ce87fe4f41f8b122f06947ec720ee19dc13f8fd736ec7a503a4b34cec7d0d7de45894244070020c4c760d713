"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePayloadReplacements = handlePayloadReplacements;
const runtime_expressions_1 = require("../runtime-expressions");
const JsonPointerLib = require('json-pointer');
function handlePayloadReplacements(payload, replacements, expressionContext) {
    for (const replacement of replacements) {
        const { target, value } = replacement;
        if (typeof target !== 'string') {
            throw new Error(`Invalid JSON Pointer: ${target}`);
        }
        try {
            // Get the current value using JSON Pointer
            const currentValue = JsonPointerLib.get(payload, target);
            const evaluatedValue = (0, runtime_expressions_1.evaluateRuntimeExpressionPayload)({
                payload: value,
                context: expressionContext,
            });
            if (currentValue !== undefined) {
                // Replace the value using JSON Pointer
                JsonPointerLib.set(payload, target, evaluatedValue);
            }
        }
        catch {
            throw new Error(`Invalid JSON Pointer: ${target}`);
        }
    }
}
//# sourceMappingURL=handle-request-body-replacements.js.map