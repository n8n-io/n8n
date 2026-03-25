// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { toHttpHeadersLike } from "@azure/core-http-compat";
import { HTTP_VERSION_1_1, HTTP_LINE_ENDING, HeaderConstants, HTTPURLConnection, } from "./utils/constants";
import { getBodyAsText } from "./BatchUtils";
import { logger } from "./log";
const HTTP_HEADER_DELIMITER = ": ";
const SPACE_DELIMITER = " ";
const NOT_FOUND = -1;
/**
 * Util class for parsing batch response.
 */
export class BatchResponseParser {
    constructor(batchResponse, subRequests) {
        if (!batchResponse || !batchResponse.contentType) {
            // In special case(reported), server may return invalid content-type which could not be parsed.
            throw new RangeError("batchResponse is malformed or doesn't contain valid content-type.");
        }
        if (!subRequests || subRequests.size === 0) {
            // This should be prevent during coding.
            throw new RangeError("Invalid state: subRequests is not provided or size is 0.");
        }
        this.batchResponse = batchResponse;
        this.subRequests = subRequests;
        this.responseBatchBoundary = this.batchResponse.contentType.split("=")[1];
        this.perResponsePrefix = `--${this.responseBatchBoundary}${HTTP_LINE_ENDING}`;
        this.batchResponseEnding = `--${this.responseBatchBoundary}--`;
    }
    // For example of response, please refer to https://docs.microsoft.com/en-us/rest/api/storageservices/blob-batch#response
    async parseBatchResponse() {
        // When logic reach here, suppose batch request has already succeeded with 202, so we can further parse
        // sub request's response.
        if (this.batchResponse._response.status !== HTTPURLConnection.HTTP_ACCEPTED) {
            throw new Error(`Invalid state: batch request failed with status: '${this.batchResponse._response.status}'.`);
        }
        const responseBodyAsText = await getBodyAsText(this.batchResponse);
        const subResponses = responseBodyAsText
            .split(this.batchResponseEnding)[0] // string after ending is useless
            .split(this.perResponsePrefix)
            .slice(1); // string before first response boundary is useless
        const subResponseCount = subResponses.length;
        // Defensive coding in case of potential error parsing.
        // Note: subResponseCount == 1 is special case where sub request is invalid.
        // We try to prevent such cases through early validation, e.g. validate sub request count >= 1.
        // While in unexpected sub request invalid case, we allow sub response to be parsed and return to user.
        if (subResponseCount !== this.subRequests.size && subResponseCount !== 1) {
            throw new Error("Invalid state: sub responses' count is not equal to sub requests' count.");
        }
        const deserializedSubResponses = new Array(subResponseCount);
        let subResponsesSucceededCount = 0;
        let subResponsesFailedCount = 0;
        // Parse sub subResponses.
        for (let index = 0; index < subResponseCount; index++) {
            const subResponse = subResponses[index];
            const deserializedSubResponse = {};
            deserializedSubResponse.headers = toHttpHeadersLike(createHttpHeaders());
            const responseLines = subResponse.split(`${HTTP_LINE_ENDING}`);
            let subRespHeaderStartFound = false;
            let subRespHeaderEndFound = false;
            let subRespFailed = false;
            let contentId = NOT_FOUND;
            for (const responseLine of responseLines) {
                if (!subRespHeaderStartFound) {
                    // Convention line to indicate content ID
                    if (responseLine.startsWith(HeaderConstants.CONTENT_ID)) {
                        contentId = parseInt(responseLine.split(HTTP_HEADER_DELIMITER)[1]);
                    }
                    // Http version line with status code indicates the start of sub request's response.
                    // Example: HTTP/1.1 202 Accepted
                    if (responseLine.startsWith(HTTP_VERSION_1_1)) {
                        subRespHeaderStartFound = true;
                        const tokens = responseLine.split(SPACE_DELIMITER);
                        deserializedSubResponse.status = parseInt(tokens[1]);
                        deserializedSubResponse.statusMessage = tokens.slice(2).join(SPACE_DELIMITER);
                    }
                    continue; // Skip convention headers not specifically for sub request i.e. Content-Type: application/http and Content-ID: *
                }
                if (responseLine.trim() === "") {
                    // Sub response's header start line already found, and the first empty line indicates header end line found.
                    if (!subRespHeaderEndFound) {
                        subRespHeaderEndFound = true;
                    }
                    continue; // Skip empty line
                }
                // Note: when code reach here, it indicates subRespHeaderStartFound == true
                if (!subRespHeaderEndFound) {
                    if (responseLine.indexOf(HTTP_HEADER_DELIMITER) === -1) {
                        // Defensive coding to prevent from missing valuable lines.
                        throw new Error(`Invalid state: find non-empty line '${responseLine}' without HTTP header delimiter '${HTTP_HEADER_DELIMITER}'.`);
                    }
                    // Parse headers of sub response.
                    const tokens = responseLine.split(HTTP_HEADER_DELIMITER);
                    deserializedSubResponse.headers.set(tokens[0], tokens[1]);
                    if (tokens[0] === HeaderConstants.X_MS_ERROR_CODE) {
                        deserializedSubResponse.errorCode = tokens[1];
                        subRespFailed = true;
                    }
                }
                else {
                    // Assemble body of sub response.
                    if (!deserializedSubResponse.bodyAsText) {
                        deserializedSubResponse.bodyAsText = "";
                    }
                    deserializedSubResponse.bodyAsText += responseLine;
                }
            } // Inner for end
            // The response will contain the Content-ID header for each corresponding subrequest response to use for tracking.
            // The Content-IDs are set to a valid index in the subrequests we sent. In the status code 202 path, we could expect it
            // to be 1-1 mapping from the [0, subRequests.size) to the Content-IDs returned. If not, we simply don't return that
            // unexpected subResponse in the parsed reponse and we can always look it up in the raw response for debugging purpose.
            if (contentId !== NOT_FOUND &&
                Number.isInteger(contentId) &&
                contentId >= 0 &&
                contentId < this.subRequests.size &&
                deserializedSubResponses[contentId] === undefined) {
                deserializedSubResponse._request = this.subRequests.get(contentId);
                deserializedSubResponses[contentId] = deserializedSubResponse;
            }
            else {
                logger.error(`subResponses[${index}] is dropped as the Content-ID is not found or invalid, Content-ID: ${contentId}`);
            }
            if (subRespFailed) {
                subResponsesFailedCount++;
            }
            else {
                subResponsesSucceededCount++;
            }
        }
        return {
            subResponses: deserializedSubResponses,
            subResponsesSucceededCount: subResponsesSucceededCount,
            subResponsesFailedCount: subResponsesFailedCount,
        };
    }
}
//# sourceMappingURL=BatchResponseParser.js.map