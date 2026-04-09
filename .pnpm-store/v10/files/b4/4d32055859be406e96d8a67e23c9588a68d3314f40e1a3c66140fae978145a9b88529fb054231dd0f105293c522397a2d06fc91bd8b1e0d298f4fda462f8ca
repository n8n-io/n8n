"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkflowSecurityInputs = generateWorkflowSecurityInputs;
function generateWorkflowSecurityInputs(inputsComponents, security) {
    if (!security?.length) {
        return undefined;
    }
    for (const securityRequirement of security) {
        for (const securityName of Object.keys(securityRequirement)) {
            if (inputsComponents?.inputs?.[securityName]) {
                return {
                    $ref: `#/components/inputs/${securityName}`,
                };
            }
        }
    }
    return undefined;
}
//# sourceMappingURL=generate-workflow-security-inputs.js.map