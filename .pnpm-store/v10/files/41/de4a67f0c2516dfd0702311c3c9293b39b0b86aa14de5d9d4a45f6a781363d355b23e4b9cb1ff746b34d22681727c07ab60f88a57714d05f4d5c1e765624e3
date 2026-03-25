"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeprecationWarningHook = void 0;
const HEADER_MODEL_DEPRECATION_TIMESTAMP = "x-model-deprecation-timestamp";
class DeprecationWarningHook {
    afterSuccess(_, response) {
        if (response.headers.has(HEADER_MODEL_DEPRECATION_TIMESTAMP)) {
            response.clone().json().then((body) => {
                const model = body.model;
                console.warn(`WARNING: The model ${model} is deprecated and will be removed on ${response.headers.get(HEADER_MODEL_DEPRECATION_TIMESTAMP)}. Please refer to https://docs.mistral.ai/getting-started/models/#api-versioning for more information.`);
            });
        }
        return response;
    }
}
exports.DeprecationWarningHook = DeprecationWarningHook;
//# sourceMappingURL=deprecation_warning.js.map