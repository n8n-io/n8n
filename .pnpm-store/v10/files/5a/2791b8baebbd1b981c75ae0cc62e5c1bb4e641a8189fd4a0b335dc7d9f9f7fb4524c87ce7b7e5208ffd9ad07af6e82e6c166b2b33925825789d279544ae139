/**
 * Determines when a checksum will be calculated for request payloads.
 * @public
 */
export declare const RequestChecksumCalculation: {
    /**
     * When set, a checksum will be calculated for all request payloads of operations
     * modeled with the {@link httpChecksum} trait where `requestChecksumRequired` is `true`
     * AND/OR a `requestAlgorithmMember` is modeled.
     * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
     */
    readonly WHEN_SUPPORTED: "WHEN_SUPPORTED";
    /**
     * When set, a checksum will only be calculated for request payloads of operations
     * modeled with the {@link httpChecksum} trait where `requestChecksumRequired` is `true`
     * OR where a `requestAlgorithmMember` is modeled and the user sets it.
     * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
     */
    readonly WHEN_REQUIRED: "WHEN_REQUIRED";
};
/**
 * @public
 */
export type RequestChecksumCalculation = (typeof RequestChecksumCalculation)[keyof typeof RequestChecksumCalculation];
/**
 * @internal
 */
export declare const DEFAULT_REQUEST_CHECKSUM_CALCULATION: "WHEN_SUPPORTED";
/**
 * Determines when checksum validation will be performed on response payloads.
 * @public
 */
export declare const ResponseChecksumValidation: {
    /**
     * When set, checksum validation MUST be performed on all response payloads of operations
     * modeled with the {@link httpChecksum} trait where `responseAlgorithms` is modeled,
     * except when no modeled checksum algorithms are supported by an SDK.
     * {@link https://smithy.io/2.0/aws/aws-core.html#aws-protocols-httpchecksum-trait httpChecksum}
     */
    readonly WHEN_SUPPORTED: "WHEN_SUPPORTED";
    /**
     * When set, checksum validation MUST NOT be performed on response payloads of operations UNLESS
     * the SDK supports the modeled checksum algorithms AND the user has set the `requestValidationModeMember` to `ENABLED`.
     * It is currently impossible to model an operation as requiring a response checksum,
     * but this setting leaves the door open for future updates.
     */
    readonly WHEN_REQUIRED: "WHEN_REQUIRED";
};
/**
 * @public
 */
export type ResponseChecksumValidation = (typeof ResponseChecksumValidation)[keyof typeof ResponseChecksumValidation];
/**
 * @internal
 */
export declare const DEFAULT_RESPONSE_CHECKSUM_VALIDATION: "WHEN_SUPPORTED";
/**
 * Checksum Algorithms supported by the SDK.
 * @public
 */
export declare enum ChecksumAlgorithm {
    /**
     * @deprecated Use {@link ChecksumAlgorithm.CRC32} instead.
     */
    MD5 = "MD5",
    CRC32 = "CRC32",
    CRC32C = "CRC32C",
    CRC64NVME = "CRC64NVME",
    SHA1 = "SHA1",
    SHA256 = "SHA256"
}
/**
 * Location when the checksum is stored in the request body.
 * @internal
 */
export declare enum ChecksumLocation {
    HEADER = "header",
    TRAILER = "trailer"
}
/**
 * @internal
 */
export declare const DEFAULT_CHECKSUM_ALGORITHM = ChecksumAlgorithm.CRC32;
