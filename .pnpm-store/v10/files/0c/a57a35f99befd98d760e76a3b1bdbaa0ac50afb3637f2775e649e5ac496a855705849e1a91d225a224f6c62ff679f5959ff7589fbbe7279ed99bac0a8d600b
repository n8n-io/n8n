import { CLIENT_SUPPORTED_ALGORITHMS, PRIORITY_ORDER_ALGORITHMS } from "./types";
export const getChecksumAlgorithmListForResponse = (responseAlgorithms = []) => {
    const validChecksumAlgorithms = [];
    for (const algorithm of PRIORITY_ORDER_ALGORITHMS) {
        if (!responseAlgorithms.includes(algorithm) || !CLIENT_SUPPORTED_ALGORITHMS.includes(algorithm)) {
            continue;
        }
        validChecksumAlgorithms.push(algorithm);
    }
    return validChecksumAlgorithms;
};
