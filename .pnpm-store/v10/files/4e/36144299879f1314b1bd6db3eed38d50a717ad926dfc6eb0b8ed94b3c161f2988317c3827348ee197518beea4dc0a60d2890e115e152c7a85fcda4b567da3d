import { setFeature } from "@aws-sdk/core";
import { RequestChecksumCalculation, ResponseChecksumValidation } from "./constants";
export const flexibleChecksumsInputMiddlewareOptions = {
    name: "flexibleChecksumsInputMiddleware",
    toMiddleware: "serializerMiddleware",
    relation: "before",
    tags: ["BODY_CHECKSUM"],
    override: true,
};
export const flexibleChecksumsInputMiddleware = (config, middlewareConfig) => (next, context) => async (args) => {
    const input = args.input;
    const { requestValidationModeMember } = middlewareConfig;
    const requestChecksumCalculation = await config.requestChecksumCalculation();
    const responseChecksumValidation = await config.responseChecksumValidation();
    switch (requestChecksumCalculation) {
        case RequestChecksumCalculation.WHEN_REQUIRED:
            setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_REQUIRED", "a");
            break;
        case RequestChecksumCalculation.WHEN_SUPPORTED:
            setFeature(context, "FLEXIBLE_CHECKSUMS_REQ_WHEN_SUPPORTED", "Z");
            break;
    }
    switch (responseChecksumValidation) {
        case ResponseChecksumValidation.WHEN_REQUIRED:
            setFeature(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_REQUIRED", "c");
            break;
        case ResponseChecksumValidation.WHEN_SUPPORTED:
            setFeature(context, "FLEXIBLE_CHECKSUMS_RES_WHEN_SUPPORTED", "b");
            break;
    }
    if (requestValidationModeMember && !input[requestValidationModeMember]) {
        if (responseChecksumValidation === ResponseChecksumValidation.WHEN_SUPPORTED) {
            input[requestValidationModeMember] = "ENABLED";
        }
    }
    return next(args);
};
