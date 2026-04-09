import type { ChecksumAlgorithm, ChecksumConfiguration, ChecksumConstructor, HashConstructor } from "@smithy/types";
import { AlgorithmId } from "@smithy/types";
export { AlgorithmId, ChecksumAlgorithm, ChecksumConfiguration };
/**
 * @internal
 */
export type PartialChecksumRuntimeConfigType = {
    checksumAlgorithms?: Record<string, ChecksumConstructor | HashConstructor>;
    sha256?: ChecksumConstructor | HashConstructor;
    md5?: ChecksumConstructor | HashConstructor;
    crc32?: ChecksumConstructor | HashConstructor;
    crc32c?: ChecksumConstructor | HashConstructor;
    sha1?: ChecksumConstructor | HashConstructor;
};
/**
 * @param runtimeConfig - config object of the client instance.
 * @internal
 */
export declare const getChecksumConfiguration: (runtimeConfig: PartialChecksumRuntimeConfigType) => {
    addChecksumAlgorithm(algo: ChecksumAlgorithm): void;
    checksumAlgorithms(): ChecksumAlgorithm[];
};
/**
 * @internal
 */
export declare const resolveChecksumRuntimeConfig: (clientConfig: ChecksumConfiguration) => PartialChecksumRuntimeConfigType;
