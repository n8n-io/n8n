import { EndpointError } from "../types";
import { customEndpointFunctions } from "./customEndpointFunctions";
import { endpointFunctions } from "./endpointFunctions";
import { evaluateTemplate } from "./evaluateTemplate";
import { getReferenceValue } from "./getReferenceValue";
export const evaluateExpression = (obj, keyName, options) => {
    if (typeof obj === "string") {
        return evaluateTemplate(obj, options);
    }
    else if (obj["fn"]) {
        return group.callFunction(obj, options);
    }
    else if (obj["ref"]) {
        return getReferenceValue(obj, options);
    }
    throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
};
export const callFunction = ({ fn, argv }, options) => {
    const evaluatedArgs = argv.map((arg) => ["boolean", "number"].includes(typeof arg) ? arg : group.evaluateExpression(arg, "arg", options));
    const fnSegments = fn.split(".");
    if (fnSegments[0] in customEndpointFunctions && fnSegments[1] != null) {
        return customEndpointFunctions[fnSegments[0]][fnSegments[1]](...evaluatedArgs);
    }
    return endpointFunctions[fn](...evaluatedArgs);
};
export const group = {
    evaluateExpression,
    callFunction,
};
