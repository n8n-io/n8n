"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveRequestDocument = void 0;
const graphql_1 = require("graphql");
/**
 * helpers
 */
const extractOperationName = (document) => {
    let operationName = undefined;
    const operationDefinitions = document.definitions.filter((definition) => definition.kind === `OperationDefinition`);
    if (operationDefinitions.length === 1) {
        operationName = operationDefinitions[0]?.name?.value;
    }
    return operationName;
};
const resolveRequestDocument = (document) => {
    if (typeof document === `string`) {
        let operationName = undefined;
        try {
            const parsedDocument = (0, graphql_1.parse)(document);
            operationName = extractOperationName(parsedDocument);
        }
        catch (err) {
            // Failed parsing the document, the operationName will be undefined
        }
        return { query: document, operationName };
    }
    const operationName = extractOperationName(document);
    return { query: (0, graphql_1.print)(document), operationName };
};
exports.resolveRequestDocument = resolveRequestDocument;
//# sourceMappingURL=resolveRequestDocument.js.map