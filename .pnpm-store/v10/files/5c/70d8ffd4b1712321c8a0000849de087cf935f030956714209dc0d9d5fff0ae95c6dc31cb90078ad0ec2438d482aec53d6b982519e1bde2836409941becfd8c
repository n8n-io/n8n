"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationById = getOperationById;
const colorette_1 = require("colorette");
// TODO: create a type: ExtendedOpenAPIOperation = OpenAPIOperation & { pathParameters: Parameter[], path, ... }
function getOperationById(operationIdStr, descriptions) {
    let descriptionName;
    let operationId;
    if (operationIdStr.includes('$sourceDescriptions.')) {
        const [, sourceDescriptionName, operationIdIdentifier] = operationIdStr.split('.');
        descriptionName = sourceDescriptionName;
        operationId = operationIdIdentifier;
    }
    else if (!operationIdStr.includes('.')) {
        operationId = operationIdStr;
        descriptionName = Object.keys(descriptions)[0];
    }
    else {
        [descriptionName, operationId] = operationIdStr.split('.');
    }
    const availableDescriptions = Object.keys(descriptions);
    if (!descriptions[descriptionName]) {
        throw new Error(`Unknown description name ${(0, colorette_1.red)(descriptionName)} at ${(0, colorette_1.red)(operationIdStr)}. Available descriptions: ${availableDescriptions.join(', ')}.`);
    }
    const description = descriptions[descriptionName];
    const rootServers = description.servers;
    for (const [path, pathDetails] of Object.entries(descriptions[descriptionName].paths)) {
        if (!pathDetails) {
            return undefined;
        }
        for (const [method, operationDetails] of Object.entries(pathDetails)) {
            if (operationDetails.operationId === operationId) {
                return {
                    servers: pathDetails.servers || rootServers,
                    ...operationDetails,
                    pathParameters: operationDetails.parameters || [],
                    path,
                    method,
                    descriptionName,
                };
            }
        }
    }
    throw new Error(`Unknown operationId ${(0, colorette_1.red)(operationId)} at ${(0, colorette_1.red)(operationIdStr)}.`);
}
//# sourceMappingURL=get-operation-by-id.js.map