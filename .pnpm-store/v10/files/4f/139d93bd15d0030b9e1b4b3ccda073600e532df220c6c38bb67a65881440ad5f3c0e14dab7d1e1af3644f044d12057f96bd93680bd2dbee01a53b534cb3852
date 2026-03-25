import { parse, print } from 'graphql';
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
export const resolveRequestDocument = (document) => {
    if (typeof document === `string`) {
        let operationName = undefined;
        try {
            const parsedDocument = parse(document);
            operationName = extractOperationName(parsedDocument);
        }
        catch (err) {
            // Failed parsing the document, the operationName will be undefined
        }
        return { query: document, operationName };
    }
    const operationName = extractOperationName(document);
    return { query: print(document), operationName };
};
//# sourceMappingURL=resolveRequestDocument.js.map