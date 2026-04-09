"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.printErrors = printErrors;
const better_ajv_errors_1 = __importDefault(require("better-ajv-errors"));
const cli_outputs_1 = require("./cli-outputs");
function printErrors(schema, data, errors) {
    const updatedErrors = errors.map((error) => {
        if (error.keyword === 'unevaluatedProperties' || error.keyword === 'additionalProperties') {
            const failedProp = error.params.unevaluatedProperty || error.params.additionalProperty;
            // Add a custom message with the unevaluated or the additional property information
            return {
                ...error,
                message: `${error.message}: "${failedProp}".`,
            };
        }
        return error;
    });
    // Use betterAjvErrors with the modified errors
    const output = (0, better_ajv_errors_1.default)(schema, data, updatedErrors, {
        format: 'cli',
        indent: 2,
    });
    return `${cli_outputs_1.RESET_ESCAPE_CODE}\n${output}${cli_outputs_1.RESET_ESCAPE_CODE}\n`;
}
//# sourceMappingURL=ajv-errors.js.map