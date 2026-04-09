"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSecurityInputsArazzoComponents = generateSecurityInputsArazzoComponents;
function generateSecurityInputsArazzoComponents(securitySchemes) {
    const inputs = {};
    for (const [name, securityScheme] of Object.entries(securitySchemes)) {
        if (securityScheme.type !== 'http' && securityScheme.type !== 'apiKey') {
            continue;
        }
        if (securityScheme?.scheme?.toLowerCase() === 'basic') {
            inputs[name] = {
                type: 'object',
                properties: {
                    [name]: {
                        type: 'string',
                        description: 'Basic authentication',
                        format: 'password',
                    },
                },
            };
        }
        else if (securityScheme?.scheme?.toLowerCase() === 'bearer') {
            inputs[name] = {
                type: 'object',
                properties: {
                    [name]: {
                        type: 'string',
                        description: 'JWT Authentication token for ${name}',
                        format: 'password',
                    },
                },
            };
        }
        else {
            inputs[name] = {
                type: 'object',
                properties: {
                    [name]: {
                        type: 'string',
                        description: securityScheme?.description || `Authentication token for ${name}`,
                        format: 'password',
                    },
                },
            };
        }
    }
    return { inputs };
}
//# sourceMappingURL=generate-inputs-arazzo-components.js.map