import { ChecksumAlgorithm, RequestChecksumCalculation } from "./constants";
export interface GetChecksumAlgorithmForRequestOptions {
    /**
     * Indicates an operation requires a checksum in its HTTP request.
     */
    requestChecksumRequired: boolean;
    /**
     * Defines a top-level operation input member that is used to configure request checksum behavior.
     */
    requestAlgorithmMember?: string;
    /**
     * Determines when a checksum will be calculated for request payloads
     */
    requestChecksumCalculation: RequestChecksumCalculation;
}
/**
 * Returns the checksum algorithm to use for the request, along with
 * the priority array of location to use to populate checksum and names
 * to be used as a key at the location.
 */
export declare const getChecksumAlgorithmForRequest: (input: any, { requestChecksumRequired, requestAlgorithmMember, requestChecksumCalculation }: GetChecksumAlgorithmForRequestOptions) => ChecksumAlgorithm | undefined;
