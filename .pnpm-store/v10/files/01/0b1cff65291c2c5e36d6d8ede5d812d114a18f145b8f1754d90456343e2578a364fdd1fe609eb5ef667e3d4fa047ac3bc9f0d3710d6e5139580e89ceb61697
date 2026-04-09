"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestBodySchema = getRequestBodySchema;
function getRequestBodySchema(contentType, descriptionOperation) {
    if (!descriptionOperation)
        return undefined;
    const requestBody = descriptionOperation.requestBody;
    const requestBodyContent = requestBody?.content;
    const schema = requestBodyContent && requestBodyContent[contentType]?.schema;
    return schema || undefined;
}
//# sourceMappingURL=get-request-body-schema.js.map