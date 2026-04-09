"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOperationFromDescription = getOperationFromDescription;
exports.getOperationFromDescriptionBySource = getOperationFromDescriptionBySource;
const get_operation_by_id_1 = require("./get-operation-by-id");
const get_operation_by_path_1 = require("./get-operation-by-path");
function getOperationFromDescription(path, method, descriptionPaths) {
    return descriptionPaths?.[path]?.[method];
}
function getOperationFromDescriptionBySource(source, ctx) {
    if (!source.operationId && !source.operationPath) {
        return undefined;
    }
    const { $sourceDescriptions, sourceDescriptions } = ctx;
    const { operationId, operationPath } = source;
    if (operationId) {
        return (0, get_operation_by_id_1.getOperationById)(operationId, $sourceDescriptions);
    }
    else if (operationPath) {
        return (0, get_operation_by_path_1.getOperationByPath)(operationPath, { $sourceDescriptions, sourceDescriptions });
    }
    else {
        return undefined;
    }
}
//# sourceMappingURL=get-operation-from-description.js.map