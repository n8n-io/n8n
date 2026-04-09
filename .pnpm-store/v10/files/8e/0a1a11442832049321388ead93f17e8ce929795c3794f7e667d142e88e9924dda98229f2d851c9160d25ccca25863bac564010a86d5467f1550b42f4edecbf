"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.deserializationPolicyName = void 0;
exports.deserializationPolicy = deserializationPolicy;
const interfaces_js_1 = require("./interfaces.js");
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const serializer_js_1 = require("./serializer.js");
const operationHelpers_js_1 = require("./operationHelpers.js");
const defaultJsonContentTypes = ["application/json", "text/json"];
const defaultXmlContentTypes = ["application/xml", "application/atom+xml"];
/**
 * The programmatic identifier of the deserializationPolicy.
 */
exports.deserializationPolicyName = "deserializationPolicy";
/**
 * This policy handles parsing out responses according to OperationSpecs on the request.
 */
function deserializationPolicy(options = {}) {
    const jsonContentTypes = options.expectedContentTypes?.json ?? defaultJsonContentTypes;
    const xmlContentTypes = options.expectedContentTypes?.xml ?? defaultXmlContentTypes;
    const parseXML = options.parseXML;
    const serializerOptions = options.serializerOptions;
    const updatedOptions = {
        xml: {
            rootName: serializerOptions?.xml.rootName ?? "",
            includeRoot: serializerOptions?.xml.includeRoot ?? false,
            xmlCharKey: serializerOptions?.xml.xmlCharKey ?? interfaces_js_1.XML_CHARKEY,
        },
    };
    return {
        name: exports.deserializationPolicyName,
        async sendRequest(request, next) {
            const response = await next(request);
            return deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, updatedOptions, parseXML);
        },
    };
}
function getOperationResponseMap(parsedResponse) {
    let result;
    const request = parsedResponse.request;
    const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
    const operationSpec = operationInfo?.operationSpec;
    if (operationSpec) {
        if (!operationInfo?.operationResponseGetter) {
            result = operationSpec.responses[parsedResponse.status];
        }
        else {
            result = operationInfo?.operationResponseGetter(operationSpec, parsedResponse);
        }
    }
    return result;
}
function shouldDeserializeResponse(parsedResponse) {
    const request = parsedResponse.request;
    const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
    const shouldDeserialize = operationInfo?.shouldDeserialize;
    let result;
    if (shouldDeserialize === undefined) {
        result = true;
    }
    else if (typeof shouldDeserialize === "boolean") {
        result = shouldDeserialize;
    }
    else {
        result = shouldDeserialize(parsedResponse);
    }
    return result;
}
async function deserializeResponseBody(jsonContentTypes, xmlContentTypes, response, options, parseXML) {
    const parsedResponse = await parse(jsonContentTypes, xmlContentTypes, response, options, parseXML);
    if (!shouldDeserializeResponse(parsedResponse)) {
        return parsedResponse;
    }
    const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(parsedResponse.request);
    const operationSpec = operationInfo?.operationSpec;
    if (!operationSpec || !operationSpec.responses) {
        return parsedResponse;
    }
    const responseSpec = getOperationResponseMap(parsedResponse);
    const { error, shouldReturnResponse } = handleErrorResponse(parsedResponse, operationSpec, responseSpec, options);
    if (error) {
        throw error;
    }
    else if (shouldReturnResponse) {
        return parsedResponse;
    }
    // An operation response spec does exist for current status code, so
    // use it to deserialize the response.
    if (responseSpec) {
        if (responseSpec.bodyMapper) {
            let valueToDeserialize = parsedResponse.parsedBody;
            if (operationSpec.isXML && responseSpec.bodyMapper.type.name === serializer_js_1.MapperTypeNames.Sequence) {
                valueToDeserialize =
                    typeof valueToDeserialize === "object"
                        ? valueToDeserialize[responseSpec.bodyMapper.xmlElementName]
                        : [];
            }
            try {
                parsedResponse.parsedBody = operationSpec.serializer.deserialize(responseSpec.bodyMapper, valueToDeserialize, "operationRes.parsedBody", options);
            }
            catch (deserializeError) {
                const restError = new core_rest_pipeline_1.RestError(`Error ${deserializeError} occurred in deserializing the responseBody - ${parsedResponse.bodyAsText}`, {
                    statusCode: parsedResponse.status,
                    request: parsedResponse.request,
                    response: parsedResponse,
                });
                throw restError;
            }
        }
        else if (operationSpec.httpMethod === "HEAD") {
            // head methods never have a body, but we return a boolean to indicate presence/absence of the resource
            parsedResponse.parsedBody = response.status >= 200 && response.status < 300;
        }
        if (responseSpec.headersMapper) {
            parsedResponse.parsedHeaders = operationSpec.serializer.deserialize(responseSpec.headersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders", { xml: {}, ignoreUnknownProperties: true });
        }
    }
    return parsedResponse;
}
function isOperationSpecEmpty(operationSpec) {
    const expectedStatusCodes = Object.keys(operationSpec.responses);
    return (expectedStatusCodes.length === 0 ||
        (expectedStatusCodes.length === 1 && expectedStatusCodes[0] === "default"));
}
function handleErrorResponse(parsedResponse, operationSpec, responseSpec, options) {
    const isSuccessByStatus = 200 <= parsedResponse.status && parsedResponse.status < 300;
    const isExpectedStatusCode = isOperationSpecEmpty(operationSpec)
        ? isSuccessByStatus
        : !!responseSpec;
    if (isExpectedStatusCode) {
        if (responseSpec) {
            if (!responseSpec.isError) {
                return { error: null, shouldReturnResponse: false };
            }
        }
        else {
            return { error: null, shouldReturnResponse: false };
        }
    }
    const errorResponseSpec = responseSpec ?? operationSpec.responses.default;
    const initialErrorMessage = parsedResponse.request.streamResponseStatusCodes?.has(parsedResponse.status)
        ? `Unexpected status code: ${parsedResponse.status}`
        : parsedResponse.bodyAsText;
    const error = new core_rest_pipeline_1.RestError(initialErrorMessage, {
        statusCode: parsedResponse.status,
        request: parsedResponse.request,
        response: parsedResponse,
    });
    // If the item failed but there's no error spec or default spec to deserialize the error,
    // and the parsed body doesn't look like an error object,
    // we should fail so we just throw the parsed response
    if (!errorResponseSpec &&
        !(parsedResponse.parsedBody?.error?.code && parsedResponse.parsedBody?.error?.message)) {
        throw error;
    }
    const defaultBodyMapper = errorResponseSpec?.bodyMapper;
    const defaultHeadersMapper = errorResponseSpec?.headersMapper;
    try {
        // If error response has a body, try to deserialize it using default body mapper.
        // Then try to extract error code & message from it
        if (parsedResponse.parsedBody) {
            const parsedBody = parsedResponse.parsedBody;
            let deserializedError;
            if (defaultBodyMapper) {
                let valueToDeserialize = parsedBody;
                if (operationSpec.isXML && defaultBodyMapper.type.name === serializer_js_1.MapperTypeNames.Sequence) {
                    valueToDeserialize = [];
                    const elementName = defaultBodyMapper.xmlElementName;
                    if (typeof parsedBody === "object" && elementName) {
                        valueToDeserialize = parsedBody[elementName];
                    }
                }
                deserializedError = operationSpec.serializer.deserialize(defaultBodyMapper, valueToDeserialize, "error.response.parsedBody", options);
            }
            const internalError = parsedBody.error || deserializedError || parsedBody;
            error.code = internalError.code;
            if (internalError.message) {
                error.message = internalError.message;
            }
            if (defaultBodyMapper) {
                error.response.parsedBody = deserializedError;
            }
        }
        // If error response has headers, try to deserialize it using default header mapper
        if (parsedResponse.headers && defaultHeadersMapper) {
            error.response.parsedHeaders =
                operationSpec.serializer.deserialize(defaultHeadersMapper, parsedResponse.headers.toJSON(), "operationRes.parsedHeaders");
        }
    }
    catch (defaultError) {
        error.message = `Error "${defaultError.message}" occurred in deserializing the responseBody - "${parsedResponse.bodyAsText}" for the default response.`;
    }
    return { error, shouldReturnResponse: false };
}
async function parse(jsonContentTypes, xmlContentTypes, operationResponse, opts, parseXML) {
    if (!operationResponse.request.streamResponseStatusCodes?.has(operationResponse.status) &&
        operationResponse.bodyAsText) {
        const text = operationResponse.bodyAsText;
        const contentType = operationResponse.headers.get("Content-Type") || "";
        const contentComponents = !contentType
            ? []
            : contentType.split(";").map((component) => component.toLowerCase());
        try {
            if (contentComponents.length === 0 ||
                contentComponents.some((component) => jsonContentTypes.indexOf(component) !== -1)) {
                operationResponse.parsedBody = JSON.parse(text);
                return operationResponse;
            }
            else if (contentComponents.some((component) => xmlContentTypes.indexOf(component) !== -1)) {
                if (!parseXML) {
                    throw new Error("Parsing XML not supported.");
                }
                const body = await parseXML(text, opts.xml);
                operationResponse.parsedBody = body;
                return operationResponse;
            }
        }
        catch (err) {
            const msg = `Error "${err}" occurred while parsing the response body - ${operationResponse.bodyAsText}.`;
            const errCode = err.code || core_rest_pipeline_1.RestError.PARSE_ERROR;
            const e = new core_rest_pipeline_1.RestError(msg, {
                code: errCode,
                statusCode: operationResponse.status,
                request: operationResponse.request,
                response: operationResponse,
            });
            throw e;
        }
    }
    return operationResponse;
}
//# sourceMappingURL=deserializationPolicy.js.map