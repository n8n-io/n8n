// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * A type guard for a primitive response body.
 * @param value - Value to test
 *
 * @internal
 */
export function isPrimitiveBody(value, mapperTypeName) {
    return (mapperTypeName !== "Composite" &&
        mapperTypeName !== "Dictionary" &&
        (typeof value === "string" ||
            typeof value === "number" ||
            typeof value === "boolean" ||
            mapperTypeName?.match(/^(Date|DateTime|DateTimeRfc1123|UnixTime|ByteArray|Base64Url)$/i) !==
                null ||
            value === undefined ||
            value === null));
}
const validateISODuration = /^(-|\+)?P(?:([-+]?[0-9,.]*)Y)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)W)?(?:([-+]?[0-9,.]*)D)?(?:T(?:([-+]?[0-9,.]*)H)?(?:([-+]?[0-9,.]*)M)?(?:([-+]?[0-9,.]*)S)?)?$/;
/**
 * Returns true if the given string is in ISO 8601 format.
 * @param value - The value to be validated for ISO 8601 duration format.
 * @internal
 */
export function isDuration(value) {
    return validateISODuration.test(value);
}
const validUuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/i;
/**
 * Returns true if the provided uuid is valid.
 *
 * @param uuid - The uuid that needs to be validated.
 *
 * @internal
 */
export function isValidUuid(uuid) {
    return validUuidRegex.test(uuid);
}
/**
 * Maps the response as follows:
 * - wraps the response body if needed (typically if its type is primitive).
 * - returns null if the combination of the headers and the body is empty.
 * - otherwise, returns the combination of the headers and the body.
 *
 * @param responseObject - a representation of the parsed response
 * @returns the response that will be returned to the user which can be null and/or wrapped
 *
 * @internal
 */
function handleNullableResponseAndWrappableBody(responseObject) {
    const combinedHeadersAndBody = {
        ...responseObject.headers,
        ...responseObject.body,
    };
    if (responseObject.hasNullableType &&
        Object.getOwnPropertyNames(combinedHeadersAndBody).length === 0) {
        return responseObject.shouldWrapBody ? { body: null } : null;
    }
    else {
        return responseObject.shouldWrapBody
            ? {
                ...responseObject.headers,
                body: responseObject.body,
            }
            : combinedHeadersAndBody;
    }
}
/**
 * Take a `FullOperationResponse` and turn it into a flat
 * response object to hand back to the consumer.
 * @param fullResponse - The processed response from the operation request
 * @param responseSpec - The response map from the OperationSpec
 *
 * @internal
 */
export function flattenResponse(fullResponse, responseSpec) {
    const parsedHeaders = fullResponse.parsedHeaders;
    // head methods never have a body, but we return a boolean set to body property
    // to indicate presence/absence of the resource
    if (fullResponse.request.method === "HEAD") {
        return {
            ...parsedHeaders,
            body: fullResponse.parsedBody,
        };
    }
    const bodyMapper = responseSpec && responseSpec.bodyMapper;
    const isNullable = Boolean(bodyMapper?.nullable);
    const expectedBodyTypeName = bodyMapper?.type.name;
    /** If the body is asked for, we look at the expected body type to handle it */
    if (expectedBodyTypeName === "Stream") {
        return {
            ...parsedHeaders,
            blobBody: fullResponse.blobBody,
            readableStreamBody: fullResponse.readableStreamBody,
        };
    }
    const modelProperties = (expectedBodyTypeName === "Composite" &&
        bodyMapper.type.modelProperties) ||
        {};
    const isPageableResponse = Object.keys(modelProperties).some((k) => modelProperties[k].serializedName === "");
    if (expectedBodyTypeName === "Sequence" || isPageableResponse) {
        const arrayResponse = fullResponse.parsedBody ?? [];
        for (const key of Object.keys(modelProperties)) {
            if (modelProperties[key].serializedName) {
                arrayResponse[key] = fullResponse.parsedBody?.[key];
            }
        }
        if (parsedHeaders) {
            for (const key of Object.keys(parsedHeaders)) {
                arrayResponse[key] = parsedHeaders[key];
            }
        }
        return isNullable &&
            !fullResponse.parsedBody &&
            !parsedHeaders &&
            Object.getOwnPropertyNames(modelProperties).length === 0
            ? null
            : arrayResponse;
    }
    return handleNullableResponseAndWrappableBody({
        body: fullResponse.parsedBody,
        headers: parsedHeaders,
        hasNullableType: isNullable,
        shouldWrapBody: isPrimitiveBody(fullResponse.parsedBody, expectedBodyTypeName),
    });
}
//# sourceMappingURL=utils.js.map