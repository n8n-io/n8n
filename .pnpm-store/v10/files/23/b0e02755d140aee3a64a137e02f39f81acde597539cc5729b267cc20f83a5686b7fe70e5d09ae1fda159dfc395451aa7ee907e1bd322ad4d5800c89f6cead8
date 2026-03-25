// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { EncryptionAlgorithmAES25 } from "./utils/constants";
/**
 * Represents the access tier on a blob.
 * For detailed information about block blob level tiering see {@link https://docs.microsoft.com/azure/storage/blobs/storage-blob-storage-tiers|Hot, cool and archive storage tiers.}
 */
export var BlockBlobTier;
(function (BlockBlobTier) {
    /**
     * Optimized for storing data that is accessed frequently.
     */
    BlockBlobTier["Hot"] = "Hot";
    /**
     * Optimized for storing data that is infrequently accessed and stored for at least 30 days.
     */
    BlockBlobTier["Cool"] = "Cool";
    /**
     * Optimized for storing data that is rarely accessed.
     */
    BlockBlobTier["Cold"] = "Cold";
    /**
     * Optimized for storing data that is rarely accessed and stored for at least 180 days
     * with flexible latency requirements (on the order of hours).
     */
    BlockBlobTier["Archive"] = "Archive";
})(BlockBlobTier || (BlockBlobTier = {}));
/**
 * Specifies the page blob tier to set the blob to. This is only applicable to page blobs on premium storage accounts.
 * Please see {@link https://docs.microsoft.com/azure/storage/storage-premium-storage#scalability-and-performance-targets|here}
 * for detailed information on the corresponding IOPS and throughput per PageBlobTier.
 */
export var PremiumPageBlobTier;
(function (PremiumPageBlobTier) {
    /**
     * P4 Tier.
     */
    PremiumPageBlobTier["P4"] = "P4";
    /**
     * P6 Tier.
     */
    PremiumPageBlobTier["P6"] = "P6";
    /**
     * P10 Tier.
     */
    PremiumPageBlobTier["P10"] = "P10";
    /**
     * P15 Tier.
     */
    PremiumPageBlobTier["P15"] = "P15";
    /**
     * P20 Tier.
     */
    PremiumPageBlobTier["P20"] = "P20";
    /**
     * P30 Tier.
     */
    PremiumPageBlobTier["P30"] = "P30";
    /**
     * P40 Tier.
     */
    PremiumPageBlobTier["P40"] = "P40";
    /**
     * P50 Tier.
     */
    PremiumPageBlobTier["P50"] = "P50";
    /**
     * P60 Tier.
     */
    PremiumPageBlobTier["P60"] = "P60";
    /**
     * P70 Tier.
     */
    PremiumPageBlobTier["P70"] = "P70";
    /**
     * P80 Tier.
     */
    PremiumPageBlobTier["P80"] = "P80";
})(PremiumPageBlobTier || (PremiumPageBlobTier = {}));
export function toAccessTier(tier) {
    if (tier === undefined) {
        return undefined;
    }
    return tier; // No more check if string is a valid AccessTier, and left this to underlay logic to decide(service).
}
export function ensureCpkIfSpecified(cpk, isHttps) {
    if (cpk && !isHttps) {
        throw new RangeError("Customer-provided encryption key must be used over HTTPS.");
    }
    if (cpk && !cpk.encryptionAlgorithm) {
        cpk.encryptionAlgorithm = EncryptionAlgorithmAES25;
    }
}
/**
 * Defines the known cloud audiences for Storage.
 */
export var StorageBlobAudience;
(function (StorageBlobAudience) {
    /**
     * The OAuth scope to use to retrieve an AAD token for Azure Storage.
     */
    StorageBlobAudience["StorageOAuthScopes"] = "https://storage.azure.com/.default";
    /**
     * The OAuth scope to use to retrieve an AAD token for Azure Disk.
     */
    StorageBlobAudience["DiskComputeOAuthScopes"] = "https://disk.compute.azure.com/.default";
})(StorageBlobAudience || (StorageBlobAudience = {}));
/**
 *
 * To get OAuth audience for a storage account for blob service.
 */
export function getBlobServiceAccountAudience(storageAccountName) {
    return `https://${storageAccountName}.blob.core.windows.net/.default`;
}
//# sourceMappingURL=models.js.map