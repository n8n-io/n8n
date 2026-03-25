// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { BlobSASPermissions } from "./BlobSASPermissions";
import { ContainerSASPermissions } from "./ContainerSASPermissions";
import { StorageSharedKeyCredential } from "../credentials/StorageSharedKeyCredential";
import { UserDelegationKeyCredential } from "../credentials/UserDelegationKeyCredential";
import { ipRangeToString } from "./SasIPRange";
import { SASQueryParameters } from "./SASQueryParameters";
import { SERVICE_VERSION } from "../utils/constants";
import { truncatedISO8061Date } from "../utils/utils.common";
export function generateBlobSASQueryParameters(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName) {
    return generateBlobSASQueryParametersInternal(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName).sasQueryParameters;
}
export function generateBlobSASQueryParametersInternal(blobSASSignatureValues, sharedKeyCredentialOrUserDelegationKey, accountName) {
    const version = blobSASSignatureValues.version ? blobSASSignatureValues.version : SERVICE_VERSION;
    const sharedKeyCredential = sharedKeyCredentialOrUserDelegationKey instanceof StorageSharedKeyCredential
        ? sharedKeyCredentialOrUserDelegationKey
        : undefined;
    let userDelegationKeyCredential;
    if (sharedKeyCredential === undefined && accountName !== undefined) {
        userDelegationKeyCredential = new UserDelegationKeyCredential(accountName, sharedKeyCredentialOrUserDelegationKey);
    }
    if (sharedKeyCredential === undefined && userDelegationKeyCredential === undefined) {
        throw TypeError("Invalid sharedKeyCredential, userDelegationKey or accountName.");
    }
    // Version 2020-12-06 adds support for encryptionscope in SAS.
    if (version >= "2020-12-06") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20201206(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            return generateBlobSASQueryParametersUDK20201206(blobSASSignatureValues, userDelegationKeyCredential);
        }
    }
    // Version 2019-12-12 adds support for the blob tags permission.
    // Version 2018-11-09 adds support for the signed resource and signed blob snapshot time fields.
    // https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-a-service-sas#constructing-the-signature-string
    if (version >= "2018-11-09") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20181109(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            // Version 2020-02-10 delegation SAS signature construction includes preauthorizedAgentObjectId, agentObjectId, correlationId.
            if (version >= "2020-02-10") {
                return generateBlobSASQueryParametersUDK20200210(blobSASSignatureValues, userDelegationKeyCredential);
            }
            else {
                return generateBlobSASQueryParametersUDK20181109(blobSASSignatureValues, userDelegationKeyCredential);
            }
        }
    }
    if (version >= "2015-04-05") {
        if (sharedKeyCredential !== undefined) {
            return generateBlobSASQueryParameters20150405(blobSASSignatureValues, sharedKeyCredential);
        }
        else {
            throw new RangeError("'version' must be >= '2018-11-09' when generating user delegation SAS using user delegation key.");
        }
    }
    throw new RangeError("'version' must be >= '2015-04-05'.");
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2015-04-05 AND BEFORE 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20150405(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    if (blobSASSignatureValues.blobName) {
        resource = "b";
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20181109(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-12-06.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn and identifier.
 *
 * WARNING: When identifier is not provided, permissions and expiresOn are required.
 * You MUST assign value to identifier or expiresOn & permissions manually if you initial with
 * this constructor.
 *
 * @param blobSASSignatureValues -
 * @param sharedKeyCredential -
 */
function generateBlobSASQueryParameters20201206(blobSASSignatureValues, sharedKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    if (!blobSASSignatureValues.identifier &&
        !(blobSASSignatureValues.permissions && blobSASSignatureValues.expiresOn)) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when 'identifier' is not provided.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(sharedKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        blobSASSignatureValues.identifier,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.encryptionScope,
        blobSASSignatureValues.cacheControl ? blobSASSignatureValues.cacheControl : "",
        blobSASSignatureValues.contentDisposition ? blobSASSignatureValues.contentDisposition : "",
        blobSASSignatureValues.contentEncoding ? blobSASSignatureValues.contentEncoding : "",
        blobSASSignatureValues.contentLanguage ? blobSASSignatureValues.contentLanguage : "",
        blobSASSignatureValues.contentType ? blobSASSignatureValues.contentType : "",
    ].join("\n");
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, undefined, undefined, undefined, blobSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2018-11-09.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20181109(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-02-10.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20200210(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.preauthorizedAgentObjectId,
        undefined, // agentObjectId
        blobSASSignatureValues.correlationId,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey, blobSASSignatureValues.preauthorizedAgentObjectId, blobSASSignatureValues.correlationId),
        stringToSign: stringToSign,
    };
}
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 * IMPLEMENTATION FOR API VERSION FROM 2020-12-06.
 *
 * Creates an instance of SASQueryParameters.
 *
 * Only accepts required settings needed to create a SAS. For optional settings please
 * set corresponding properties directly, such as permissions, startsOn.
 *
 * WARNING: identifier will be ignored, permissions and expiresOn are required.
 *
 * @param blobSASSignatureValues -
 * @param userDelegationKeyCredential -
 */
function generateBlobSASQueryParametersUDK20201206(blobSASSignatureValues, userDelegationKeyCredential) {
    blobSASSignatureValues = SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues);
    // Stored access policies are not supported for a user delegation SAS.
    if (!blobSASSignatureValues.permissions || !blobSASSignatureValues.expiresOn) {
        throw new RangeError("Must provide 'permissions' and 'expiresOn' for Blob SAS generation when generating user delegation SAS.");
    }
    let resource = "c";
    let timestamp = blobSASSignatureValues.snapshotTime;
    if (blobSASSignatureValues.blobName) {
        resource = "b";
        if (blobSASSignatureValues.snapshotTime) {
            resource = "bs";
        }
        else if (blobSASSignatureValues.versionId) {
            resource = "bv";
            timestamp = blobSASSignatureValues.versionId;
        }
    }
    // Calling parse and toString guarantees the proper ordering and throws on invalid characters.
    let verifiedPermissions;
    if (blobSASSignatureValues.permissions) {
        if (blobSASSignatureValues.blobName) {
            verifiedPermissions = BlobSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
        else {
            verifiedPermissions = ContainerSASPermissions.parse(blobSASSignatureValues.permissions.toString()).toString();
        }
    }
    // Signature is generated on the un-url-encoded values.
    const stringToSign = [
        verifiedPermissions ? verifiedPermissions : "",
        blobSASSignatureValues.startsOn
            ? truncatedISO8061Date(blobSASSignatureValues.startsOn, false)
            : "",
        blobSASSignatureValues.expiresOn
            ? truncatedISO8061Date(blobSASSignatureValues.expiresOn, false)
            : "",
        getCanonicalName(userDelegationKeyCredential.accountName, blobSASSignatureValues.containerName, blobSASSignatureValues.blobName),
        userDelegationKeyCredential.userDelegationKey.signedObjectId,
        userDelegationKeyCredential.userDelegationKey.signedTenantId,
        userDelegationKeyCredential.userDelegationKey.signedStartsOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedStartsOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedExpiresOn
            ? truncatedISO8061Date(userDelegationKeyCredential.userDelegationKey.signedExpiresOn, false)
            : "",
        userDelegationKeyCredential.userDelegationKey.signedService,
        userDelegationKeyCredential.userDelegationKey.signedVersion,
        blobSASSignatureValues.preauthorizedAgentObjectId,
        undefined, // agentObjectId
        blobSASSignatureValues.correlationId,
        blobSASSignatureValues.ipRange ? ipRangeToString(blobSASSignatureValues.ipRange) : "",
        blobSASSignatureValues.protocol ? blobSASSignatureValues.protocol : "",
        blobSASSignatureValues.version,
        resource,
        timestamp,
        blobSASSignatureValues.encryptionScope,
        blobSASSignatureValues.cacheControl,
        blobSASSignatureValues.contentDisposition,
        blobSASSignatureValues.contentEncoding,
        blobSASSignatureValues.contentLanguage,
        blobSASSignatureValues.contentType,
    ].join("\n");
    const signature = userDelegationKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(blobSASSignatureValues.version, signature, verifiedPermissions, undefined, undefined, blobSASSignatureValues.protocol, blobSASSignatureValues.startsOn, blobSASSignatureValues.expiresOn, blobSASSignatureValues.ipRange, blobSASSignatureValues.identifier, resource, blobSASSignatureValues.cacheControl, blobSASSignatureValues.contentDisposition, blobSASSignatureValues.contentEncoding, blobSASSignatureValues.contentLanguage, blobSASSignatureValues.contentType, userDelegationKeyCredential.userDelegationKey, blobSASSignatureValues.preauthorizedAgentObjectId, blobSASSignatureValues.correlationId, blobSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}
function getCanonicalName(accountName, containerName, blobName) {
    // Container: "/blob/account/containerName"
    // Blob:      "/blob/account/containerName/blobName"
    const elements = [`/blob/${accountName}/${containerName}`];
    if (blobName) {
        elements.push(`/${blobName}`);
    }
    return elements.join("");
}
function SASSignatureValuesSanityCheckAndAutofill(blobSASSignatureValues) {
    const version = blobSASSignatureValues.version ? blobSASSignatureValues.version : SERVICE_VERSION;
    if (blobSASSignatureValues.snapshotTime && version < "2018-11-09") {
        throw RangeError("'version' must be >= '2018-11-09' when providing 'snapshotTime'.");
    }
    if (blobSASSignatureValues.blobName === undefined && blobSASSignatureValues.snapshotTime) {
        throw RangeError("Must provide 'blobName' when providing 'snapshotTime'.");
    }
    if (blobSASSignatureValues.versionId && version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'versionId'.");
    }
    if (blobSASSignatureValues.blobName === undefined && blobSASSignatureValues.versionId) {
        throw RangeError("Must provide 'blobName' when providing 'versionId'.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.setImmutabilityPolicy &&
        version < "2020-08-04") {
        throw RangeError("'version' must be >= '2020-08-04' when provided 'i' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.deleteVersion &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'x' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.permanentDelete &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when providing 'y' permission.");
    }
    if (blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.tag &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when providing 't' permission.");
    }
    if (version < "2020-02-10" &&
        blobSASSignatureValues.permissions &&
        (blobSASSignatureValues.permissions.move || blobSASSignatureValues.permissions.execute)) {
        throw RangeError("'version' must be >= '2020-02-10' when providing the 'm' or 'e' permission.");
    }
    if (version < "2021-04-10" &&
        blobSASSignatureValues.permissions &&
        blobSASSignatureValues.permissions.filterByTags) {
        throw RangeError("'version' must be >= '2021-04-10' when providing the 'f' permission.");
    }
    if (version < "2020-02-10" &&
        (blobSASSignatureValues.preauthorizedAgentObjectId || blobSASSignatureValues.correlationId)) {
        throw RangeError("'version' must be >= '2020-02-10' when providing 'preauthorizedAgentObjectId' or 'correlationId'.");
    }
    if (blobSASSignatureValues.encryptionScope && version < "2020-12-06") {
        throw RangeError("'version' must be >= '2020-12-06' when provided 'encryptionScope' in SAS.");
    }
    blobSASSignatureValues.version = version;
    return blobSASSignatureValues;
}
//# sourceMappingURL=BlobSASSignatureValues.js.map