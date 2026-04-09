"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getResponseSchema = getResponseSchema;
function getResponseSchema({ statusCode, contentType, descriptionResponses, }) {
    if (!descriptionResponses)
        return undefined;
    const response = descriptionResponses[statusCode] || descriptionResponses.default;
    return response?.content?.[contentType]?.schema;
}
//# sourceMappingURL=get-response-schema.js.map