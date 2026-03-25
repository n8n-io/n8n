import { HttpRequest } from "@smithy/protocol-http";
import { getChecksumAlgorithmListForResponse } from "./getChecksumAlgorithmListForResponse";
import { getChecksumLocationName } from "./getChecksumLocationName";
import { isChecksumWithPartNumber } from "./isChecksumWithPartNumber";
import { validateChecksumFromResponse } from "./validateChecksumFromResponse";
export const flexibleChecksumsResponseMiddlewareOptions = {
    name: "flexibleChecksumsResponseMiddleware",
    toMiddleware: "deserializerMiddleware",
    relation: "after",
    tags: ["BODY_CHECKSUM"],
    override: true,
};
export const flexibleChecksumsResponseMiddleware = (config, middlewareConfig) => (next, context) => async (args) => {
    if (!HttpRequest.isInstance(args.request)) {
        return next(args);
    }
    const input = args.input;
    const result = await next(args);
    const response = result.response;
    const { requestValidationModeMember, responseAlgorithms } = middlewareConfig;
    if (requestValidationModeMember && input[requestValidationModeMember] === "ENABLED") {
        const { clientName, commandName } = context;
        const isS3WholeObjectMultipartGetResponseChecksum = clientName === "S3Client" &&
            commandName === "GetObjectCommand" &&
            getChecksumAlgorithmListForResponse(responseAlgorithms).every((algorithm) => {
                const responseHeader = getChecksumLocationName(algorithm);
                const checksumFromResponse = response.headers[responseHeader];
                return !checksumFromResponse || isChecksumWithPartNumber(checksumFromResponse);
            });
        if (isS3WholeObjectMultipartGetResponseChecksum) {
            return result;
        }
        await validateChecksumFromResponse(response, {
            config,
            responseAlgorithms,
            logger: context.logger,
        });
    }
    return result;
};
