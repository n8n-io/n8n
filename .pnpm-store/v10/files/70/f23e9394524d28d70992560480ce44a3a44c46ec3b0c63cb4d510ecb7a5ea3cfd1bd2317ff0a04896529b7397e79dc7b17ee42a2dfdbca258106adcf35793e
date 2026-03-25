import { normalizeProvider } from "@smithy/util-middleware";
import { DEFAULT_REQUEST_CHECKSUM_CALCULATION, DEFAULT_RESPONSE_CHECKSUM_VALIDATION, } from "./constants";
export const resolveFlexibleChecksumsConfig = (input) => {
    const { requestChecksumCalculation, responseChecksumValidation, requestStreamBufferSize } = input;
    return Object.assign(input, {
        requestChecksumCalculation: normalizeProvider(requestChecksumCalculation ?? DEFAULT_REQUEST_CHECKSUM_CALCULATION),
        responseChecksumValidation: normalizeProvider(responseChecksumValidation ?? DEFAULT_RESPONSE_CHECKSUM_VALIDATION),
        requestStreamBufferSize: Number(requestStreamBufferSize ?? 0),
    });
};
