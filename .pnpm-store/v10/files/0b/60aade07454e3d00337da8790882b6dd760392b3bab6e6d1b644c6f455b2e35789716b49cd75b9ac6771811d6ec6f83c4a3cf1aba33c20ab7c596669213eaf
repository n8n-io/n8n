"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeRequestBody = exports.serializeHeaders = exports.serializationPolicy = exports.serializationPolicyName = void 0;
const interfaces_js_1 = require("./interfaces.js");
const operationHelpers_js_1 = require("./operationHelpers.js");
const serializer_js_1 = require("./serializer.js");
const interfaceHelpers_js_1 = require("./interfaceHelpers.js");
/**
 * The programmatic identifier of the serializationPolicy.
 */
exports.serializationPolicyName = "serializationPolicy";
/**
 * This policy handles assembling the request body and headers using
 * an OperationSpec and OperationArguments on the request.
 */
function serializationPolicy(options = {}) {
    const stringifyXML = options.stringifyXML;
    return {
        name: exports.serializationPolicyName,
        async sendRequest(request, next) {
            const operationInfo = (0, operationHelpers_js_1.getOperationRequestInfo)(request);
            const operationSpec = operationInfo === null || operationInfo === void 0 ? void 0 : operationInfo.operationSpec;
            const operationArguments = operationInfo === null || operationInfo === void 0 ? void 0 : operationInfo.operationArguments;
            if (operationSpec && operationArguments) {
                serializeHeaders(request, operationArguments, operationSpec);
                serializeRequestBody(request, operationArguments, operationSpec, stringifyXML);
            }
            return next(request);
        },
    };
}
exports.serializationPolicy = serializationPolicy;
/**
 * @internal
 */
function serializeHeaders(request, operationArguments, operationSpec) {
    var _a, _b;
    if (operationSpec.headerParameters) {
        for (const headerParameter of operationSpec.headerParameters) {
            let headerValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, headerParameter);
            if ((headerValue !== null && headerValue !== undefined) || headerParameter.mapper.required) {
                headerValue = operationSpec.serializer.serialize(headerParameter.mapper, headerValue, (0, interfaceHelpers_js_1.getPathStringFromParameter)(headerParameter));
                const headerCollectionPrefix = headerParameter.mapper
                    .headerCollectionPrefix;
                if (headerCollectionPrefix) {
                    for (const key of Object.keys(headerValue)) {
                        request.headers.set(headerCollectionPrefix + key, headerValue[key]);
                    }
                }
                else {
                    request.headers.set(headerParameter.mapper.serializedName || (0, interfaceHelpers_js_1.getPathStringFromParameter)(headerParameter), headerValue);
                }
            }
        }
    }
    const customHeaders = (_b = (_a = operationArguments.options) === null || _a === void 0 ? void 0 : _a.requestOptions) === null || _b === void 0 ? void 0 : _b.customHeaders;
    if (customHeaders) {
        for (const customHeaderName of Object.keys(customHeaders)) {
            request.headers.set(customHeaderName, customHeaders[customHeaderName]);
        }
    }
}
exports.serializeHeaders = serializeHeaders;
/**
 * @internal
 */
function serializeRequestBody(request, operationArguments, operationSpec, stringifyXML = function () {
    throw new Error("XML serialization unsupported!");
}) {
    var _a, _b, _c, _d, _e;
    const serializerOptions = (_a = operationArguments.options) === null || _a === void 0 ? void 0 : _a.serializerOptions;
    const updatedOptions = {
        xml: {
            rootName: (_b = serializerOptions === null || serializerOptions === void 0 ? void 0 : serializerOptions.xml.rootName) !== null && _b !== void 0 ? _b : "",
            includeRoot: (_c = serializerOptions === null || serializerOptions === void 0 ? void 0 : serializerOptions.xml.includeRoot) !== null && _c !== void 0 ? _c : false,
            xmlCharKey: (_d = serializerOptions === null || serializerOptions === void 0 ? void 0 : serializerOptions.xml.xmlCharKey) !== null && _d !== void 0 ? _d : interfaces_js_1.XML_CHARKEY,
        },
    };
    const xmlCharKey = updatedOptions.xml.xmlCharKey;
    if (operationSpec.requestBody && operationSpec.requestBody.mapper) {
        request.body = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, operationSpec.requestBody);
        const bodyMapper = operationSpec.requestBody.mapper;
        const { required, serializedName, xmlName, xmlElementName, xmlNamespace, xmlNamespacePrefix, nullable, } = bodyMapper;
        const typeName = bodyMapper.type.name;
        try {
            if ((request.body !== undefined && request.body !== null) ||
                (nullable && request.body === null) ||
                required) {
                const requestBodyParameterPathString = (0, interfaceHelpers_js_1.getPathStringFromParameter)(operationSpec.requestBody);
                request.body = operationSpec.serializer.serialize(bodyMapper, request.body, requestBodyParameterPathString, updatedOptions);
                const isStream = typeName === serializer_js_1.MapperTypeNames.Stream;
                if (operationSpec.isXML) {
                    const xmlnsKey = xmlNamespacePrefix ? `xmlns:${xmlNamespacePrefix}` : "xmlns";
                    const value = getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, request.body, updatedOptions);
                    if (typeName === serializer_js_1.MapperTypeNames.Sequence) {
                        request.body = stringifyXML(prepareXMLRootList(value, xmlElementName || xmlName || serializedName, xmlnsKey, xmlNamespace), { rootName: xmlName || serializedName, xmlCharKey });
                    }
                    else if (!isStream) {
                        request.body = stringifyXML(value, {
                            rootName: xmlName || serializedName,
                            xmlCharKey,
                        });
                    }
                }
                else if (typeName === serializer_js_1.MapperTypeNames.String &&
                    (((_e = operationSpec.contentType) === null || _e === void 0 ? void 0 : _e.match("text/plain")) || operationSpec.mediaType === "text")) {
                    // the String serializer has validated that request body is a string
                    // so just send the string.
                    return;
                }
                else if (!isStream) {
                    request.body = JSON.stringify(request.body);
                }
            }
        }
        catch (error) {
            throw new Error(`Error "${error.message}" occurred in serializing the payload - ${JSON.stringify(serializedName, undefined, "  ")}.`);
        }
    }
    else if (operationSpec.formDataParameters && operationSpec.formDataParameters.length > 0) {
        request.formData = {};
        for (const formDataParameter of operationSpec.formDataParameters) {
            const formDataParameterValue = (0, operationHelpers_js_1.getOperationArgumentValueFromParameter)(operationArguments, formDataParameter);
            if (formDataParameterValue !== undefined && formDataParameterValue !== null) {
                const formDataParameterPropertyName = formDataParameter.mapper.serializedName || (0, interfaceHelpers_js_1.getPathStringFromParameter)(formDataParameter);
                request.formData[formDataParameterPropertyName] = operationSpec.serializer.serialize(formDataParameter.mapper, formDataParameterValue, (0, interfaceHelpers_js_1.getPathStringFromParameter)(formDataParameter), updatedOptions);
            }
        }
    }
}
exports.serializeRequestBody = serializeRequestBody;
/**
 * Adds an xml namespace to the xml serialized object if needed, otherwise it just returns the value itself
 */
function getXmlValueWithNamespace(xmlNamespace, xmlnsKey, typeName, serializedValue, options) {
    // Composite and Sequence schemas already got their root namespace set during serialization
    // We just need to add xmlns to the other schema types
    if (xmlNamespace && !["Composite", "Sequence", "Dictionary"].includes(typeName)) {
        const result = {};
        result[options.xml.xmlCharKey] = serializedValue;
        result[interfaces_js_1.XML_ATTRKEY] = { [xmlnsKey]: xmlNamespace };
        return result;
    }
    return serializedValue;
}
function prepareXMLRootList(obj, elementName, xmlNamespaceKey, xmlNamespace) {
    if (!Array.isArray(obj)) {
        obj = [obj];
    }
    if (!xmlNamespaceKey || !xmlNamespace) {
        return { [elementName]: obj };
    }
    const result = { [elementName]: obj };
    result[interfaces_js_1.XML_ATTRKEY] = { [xmlNamespaceKey]: xmlNamespace };
    return result;
}
//# sourceMappingURL=serializationPolicy.js.map