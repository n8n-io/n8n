"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRequestDataFromOpenApi = getRequestDataFromOpenApi;
const utils_1 = require("@redocly/openapi-core/lib/utils");
const arazzo_description_generator_1 = require("../arazzo-description-generator");
const extract_first_example_1 = require("./extract-first-example");
const config_parser_1 = require("../config-parser");
function getRequestDataFromOpenApi(operation) {
    const content = operation?.requestBody?.content || {};
    const [contentType, contentItem] = Object.entries(content)[0] || [];
    const requestBody = contentItem?.example ||
        (0, extract_first_example_1.extractFirstExample)(contentItem?.examples) ||
        (0, arazzo_description_generator_1.generateTestDataFromJsonSchema)(contentItem?.schema);
    const accept = getAcceptHeader(operation);
    const parameters = getUniqueParameters([
        ...transformParameters(operation.pathParameters),
        ...transformParameters(operation.parameters),
    ]).filter(({ value }) => value);
    return {
        parameters,
        contentTypeParameters: [
            ...(contentType ? [{ name: 'content-type', in: 'header', value: contentType }] : []),
            ...(accept ? [{ name: 'accept', in: 'header', value: accept }] : []),
        ],
        requestBody,
        contentType,
    };
}
function getAcceptHeader(descriptionOperation) {
    return descriptionOperation?.responses
        ? Array.from(new Set(Object.values(descriptionOperation.responses).flatMap((response) => {
            if ((0, utils_1.isPlainObject)(response) && 'content' in response) {
                return Object.keys(response.content || {});
            }
            return [];
        }))).join(', ')
        : undefined;
}
function transformParameters(params) {
    return (params || [])
        .filter((parameter) => parameter?.required === true)
        .map((parameter) => {
        if ((0, config_parser_1.isParameterWithIn)(parameter)) {
            return {
                name: parameter.name,
                in: parameter.in,
                value: (0, arazzo_description_generator_1.generateExampleValue)(parameter),
            };
        }
        // Return undefined for non-matching parameters
        return undefined;
    })
        .filter((parameter) => parameter !== undefined);
}
function getUniqueParameters(parameters) {
    const uniqParameters = {};
    for (const parameter of parameters) {
        if (!(0, config_parser_1.isParameterWithIn)(parameter)) {
            continue;
        }
        uniqParameters[(parameter.name + ':' + parameter.in).toLowerCase()] = parameter;
    }
    return Object.values(uniqParameters);
}
//# sourceMappingURL=get-request-data-from-openapi.js.map