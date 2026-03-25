import { DEFAULT_CHECKSUM_ALGORITHM, RequestChecksumCalculation } from "./constants";
import { CLIENT_SUPPORTED_ALGORITHMS } from "./types";
export const getChecksumAlgorithmForRequest = (input, { requestChecksumRequired, requestAlgorithmMember, requestChecksumCalculation }) => {
    if (!requestAlgorithmMember) {
        return requestChecksumCalculation === RequestChecksumCalculation.WHEN_SUPPORTED || requestChecksumRequired
            ? DEFAULT_CHECKSUM_ALGORITHM
            : undefined;
    }
    if (!input[requestAlgorithmMember]) {
        return undefined;
    }
    const checksumAlgorithm = input[requestAlgorithmMember];
    if (!CLIENT_SUPPORTED_ALGORITHMS.includes(checksumAlgorithm)) {
        throw new Error(`The checksum algorithm "${checksumAlgorithm}" is not supported by the client.` +
            ` Select one of ${CLIENT_SUPPORTED_ALGORITHMS}.`);
    }
    return checksumAlgorithm;
};
