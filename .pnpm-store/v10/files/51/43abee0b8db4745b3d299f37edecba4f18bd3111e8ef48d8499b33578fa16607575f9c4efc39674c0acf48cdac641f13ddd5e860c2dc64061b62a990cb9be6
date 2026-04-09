"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveReusableObjectReference = resolveReusableObjectReference;
const get_value_from_context_1 = require("./get-value-from-context");
const VALID_COMPONENTS = ['parameters', 'failureActions', 'successActions'];
function resolveReusableObjectReference(reusableObject, ctx) {
    const { reference, value: valueOverride } = reusableObject;
    if (!VALID_COMPONENTS.some((component) => reference.includes(`$components.${component}`))) {
        throw new Error('Invalid reference: available components are $components.parameters, $components.failureActions, or $components.successActions');
    }
    const component = (0, get_value_from_context_1.getValueFromContext)(reference, ctx);
    if ('value' in component && valueOverride) {
        return {
            ...component,
            value: valueOverride,
        };
    }
    return component;
}
//# sourceMappingURL=resolve-reusable-object-reference.js.map