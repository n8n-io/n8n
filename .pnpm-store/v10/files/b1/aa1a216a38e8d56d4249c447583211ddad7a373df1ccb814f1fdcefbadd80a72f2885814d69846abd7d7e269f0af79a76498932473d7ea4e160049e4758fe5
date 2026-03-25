"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OperationDescriptionOverride = void 0;
const utils_1 = require("../../utils");
const OperationDescriptionOverride = ({ operationIds }) => {
    return {
        Operation: {
            leave(operation, { report, location }) {
                if (!operation.operationId)
                    return;
                if (!operationIds)
                    throw new Error(`Parameter "operationIds" is not provided for "operation-description-override" rule`);
                const operationId = operation.operationId;
                if (operationIds[operationId]) {
                    try {
                        operation.description = (0, utils_1.readFileAsStringSync)(operationIds[operationId]);
                    }
                    catch (e) {
                        report({
                            message: `Failed to read markdown override file for operation "${operationId}".\n${e.message}`,
                            location: location.child('operationId').key(),
                        });
                    }
                }
            },
        },
    };
};
exports.OperationDescriptionOverride = OperationDescriptionOverride;
