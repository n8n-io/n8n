"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationByPath = getOperationByPath;
const colorette_1 = require("colorette");
const JsonPointerLib = require('json-pointer');
function getOperationByPath(operationPath, descriptionDetails) {
    const { $sourceDescriptions, sourceDescriptions } = descriptionDetails;
    const [basePath, fragmentIdentifier] = operationPath.split('#');
    if (!sourceDescriptions) {
        throw new Error(`Missing described sourceDescriptions`);
    }
    const descriptionName = sourceDescriptions.find((sourceDescription) => {
        if (['openapi', 'arazzo'].includes(sourceDescription.type)) {
            if (basePath.includes('$sourceDescriptions.')) {
                const [, sourceDescriptionName] = basePath.split('.');
                return sourceDescription.name === sourceDescriptionName;
            }
            return 'url' in sourceDescription && sourceDescription.url === basePath;
        }
        return false;
    })?.name;
    if (!descriptionName) {
        throw new Error(`Unknown operationPath ${(0, colorette_1.red)(operationPath)}. API description ${(0, colorette_1.red)(basePath)} is not listed in 'sourceDescriptions' workflow section.`);
    }
    const description = $sourceDescriptions[descriptionName] || {};
    const [prop, path, method] = JsonPointerLib.parse(fragmentIdentifier);
    if (prop !== 'paths') {
        throw new Error(`Invalid fragment identifier: ${fragmentIdentifier} at operationPath ${(0, colorette_1.red)(operationPath)}.`);
    }
    const { servers } = description;
    const operation = JsonPointerLib.get(description, fragmentIdentifier) || {};
    const pathItemObject = JsonPointerLib.get(description, JsonPointerLib.compile(['paths', path])) ||
        {};
    // FIXME: use servers from path level
    return {
        servers: pathItemObject.servers || servers, // use servers from path level if exists
        ...operation, // operation level servers override path level or global servers
        pathParameters: pathItemObject.parameters || [],
        path,
        method,
        descriptionName,
    };
}
//# sourceMappingURL=get-operation-by-path.js.map