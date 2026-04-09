"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SEVERITY_CONFIGURATION = void 0;
exports.resolveSeverityConfiguration = resolveSeverityConfiguration;
const flow_runner_1 = require("../flow-runner");
exports.DEFAULT_SEVERITY_CONFIGURATION = {
    SUCCESS_CRITERIA_CHECK: 'error',
    STATUS_CODE_CHECK: 'error',
    SCHEMA_CHECK: 'error',
    CONTENT_TYPE_CHECK: 'error',
    UNEXPECTED_ERROR: 'error',
    NETWORK_ERROR: 'error',
    GLOBAL_TIMEOUT_ERROR: 'error',
    MAX_STEPS_REACHED_ERROR: 'error',
};
function resolveSeverityConfiguration(severityArgument) {
    if (!severityArgument) {
        return exports.DEFAULT_SEVERITY_CONFIGURATION;
    }
    const severityConfiguration = (0, flow_runner_1.formatCliInputs)(severityArgument);
    if (Object.keys(severityConfiguration).length === 0) {
        throw new Error(`Failed to parse severity configuration, please check the format ${severityArgument}`);
    }
    return {
        ...exports.DEFAULT_SEVERITY_CONFIGURATION,
        ...severityConfiguration,
        UNEXPECTED_ERROR: 'error',
        NETWORK_ERROR: 'error',
    };
}
//# sourceMappingURL=severity.js.map