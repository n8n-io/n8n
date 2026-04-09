"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkflowSecurityParameters = generateWorkflowSecurityParameters;
function generateWorkflowSecurityParameters(inputsComponents, security, securitySchemes) {
    if (!security?.length) {
        return [];
    }
    const parameters = [];
    for (const securityRequirement of security) {
        for (const securityName of Object.keys(securityRequirement)) {
            if (!inputsComponents?.inputs?.[securityName]) {
                continue;
            }
            const securityScheme = securitySchemes[securityName];
            if (securityScheme?.type &&
                !['apikey', 'http'].includes(securityScheme?.type?.toLowerCase())) {
                continue;
            }
            if (securityScheme?.type === 'apiKey') {
                parameters.push({
                    name: securityScheme?.name,
                    value: `$inputs.${securityName}`,
                    in: securityScheme?.in || 'header',
                });
            }
            else if (securityScheme?.scheme === 'bearer') {
                parameters.push({
                    name: 'Authorization',
                    value: `Bearer {$inputs.${securityName}}`,
                    in: securityScheme?.in || 'header',
                });
            }
            else if (securityScheme?.scheme === 'basic') {
                parameters.push({
                    name: 'Authorization',
                    value: `Basic {$inputs.${securityName}}`,
                    in: securityScheme?.in || 'header',
                });
            }
        }
    }
    return parameters;
}
//# sourceMappingURL=generate-workflow-security-parameters.js.map