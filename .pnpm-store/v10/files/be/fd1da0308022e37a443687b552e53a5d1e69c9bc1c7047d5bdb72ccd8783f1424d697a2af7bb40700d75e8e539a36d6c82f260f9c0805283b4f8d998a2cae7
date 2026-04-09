"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateWorkflowsFromDescription = generateWorkflowsFromDescription;
const sort_1 = require("../../utils/sort");
const generate_workflow_security_inputs_1 = require("./generate-workflow-security-inputs");
const generate_workflow_security_parameters_1 = require("./generate-workflow-security-parameters");
function generateWorkflowsFromDescription({ descriptionPaths, sourceDescriptionName, rootSecurity, inputsComponents, securitySchemes, }) {
    const workflows = [];
    for (const pathItemKey in descriptionPaths) {
        for (const pathItemObjectKey of Object.keys(descriptionPaths[pathItemKey]).sort(sort_1.sortMethods)) {
            const methodToCheck = pathItemObjectKey.toLocaleLowerCase();
            if ([
                'get',
                'post',
                'put',
                'delete',
                'patch',
                'head',
                'options',
                'trace',
                'connect',
                'query',
            ].includes(methodToCheck.toLocaleLowerCase())) {
                const method = methodToCheck;
                const pathKey = pathItemKey
                    .replace(/^\/|\/$/g, '')
                    .split('/')
                    .join('-');
                const operation = descriptionPaths[pathItemKey][methodToCheck.toLowerCase()];
                const operationSecurity = operation?.security || undefined;
                const operationId = generateOperationId(sourceDescriptionName, operation?.operationId);
                const operationPath = !operationId
                    ? generateOperationPath(sourceDescriptionName, pathItemKey, method)
                    : undefined;
                const workflowSecurityInputs = (0, generate_workflow_security_inputs_1.generateWorkflowSecurityInputs)(inputsComponents, operationSecurity || rootSecurity || []);
                const workflowSecurityParameters = (0, generate_workflow_security_parameters_1.generateWorkflowSecurityParameters)(inputsComponents, operationSecurity || rootSecurity || [], securitySchemes);
                workflows.push({
                    workflowId: pathKey ? `${method}-${pathKey}-workflow` : `${method}-workflow`,
                    ...(workflowSecurityInputs && { inputs: workflowSecurityInputs }),
                    ...(workflowSecurityParameters.length && {
                        parameters: workflowSecurityParameters,
                    }),
                    steps: [
                        {
                            stepId: pathKey ? `${method}-${pathKey}-step` : `${method}-step`,
                            ...(operationId ? { operationId } : { operationPath }),
                            ...generateParametersWithSuccessCriteria(descriptionPaths[pathItemKey][methodToCheck.toLowerCase()]?.responses),
                        },
                    ],
                });
            }
        }
    }
    return workflows;
}
function generateParametersWithSuccessCriteria(responses) {
    const responseCodesFromDescription = Object.keys(responses || {});
    if (!responseCodesFromDescription.length) {
        return [];
    }
    const firstResponseCode = responseCodesFromDescription?.[0];
    return { successCriteria: [{ condition: `$statusCode == ${firstResponseCode}` }] };
}
function generateOperationId(sourceDescriptionName, operationId) {
    if (!operationId) {
        return undefined;
    }
    return `$sourceDescriptions.${sourceDescriptionName}.${operationId}`;
}
function generateOperationPath(sourceDescriptionName, path, method) {
    return `{$sourceDescriptions.${sourceDescriptionName}.url}#/paths/~1${path.replace(/^\//, '')}/${method}`;
}
//# sourceMappingURL=generate-workflows-from-description.js.map