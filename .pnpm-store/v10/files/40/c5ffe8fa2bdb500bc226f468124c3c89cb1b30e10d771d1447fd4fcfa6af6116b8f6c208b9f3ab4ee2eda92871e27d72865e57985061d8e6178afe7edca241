import { AwsCrc32c } from "@aws-crypto/crc32c";
import { ChecksumAlgorithm } from "./constants";
import { crc64NvmeCrtContainer } from "./crc64-nvme-crt-container";
import { getCrc32ChecksumAlgorithmFunction } from "./getCrc32ChecksumAlgorithmFunction";
export const selectChecksumAlgorithmFunction = (checksumAlgorithm, config) => {
    switch (checksumAlgorithm) {
        case ChecksumAlgorithm.MD5:
            return config.md5;
        case ChecksumAlgorithm.CRC32:
            return getCrc32ChecksumAlgorithmFunction();
        case ChecksumAlgorithm.CRC32C:
            return AwsCrc32c;
        case ChecksumAlgorithm.CRC64NVME:
            if (typeof crc64NvmeCrtContainer.CrtCrc64Nvme !== "function") {
                throw new Error(`Please check whether you have installed the "@aws-sdk/crc64-nvme-crt" package explicitly. \n` +
                    `You must also register the package by calling [require("@aws-sdk/crc64-nvme-crt");] ` +
                    `or an ESM equivalent such as [import "@aws-sdk/crc64-nvme-crt";]. \n` +
                    "For more information please go to " +
                    "https://github.com/aws/aws-sdk-js-v3#functionality-requiring-aws-common-runtime-crt");
            }
            return crc64NvmeCrtContainer.CrtCrc64Nvme;
        case ChecksumAlgorithm.SHA1:
            return config.sha1;
        case ChecksumAlgorithm.SHA256:
            return config.sha256;
        default:
            throw new Error(`Unsupported checksum algorithm: ${checksumAlgorithm}`);
    }
};
