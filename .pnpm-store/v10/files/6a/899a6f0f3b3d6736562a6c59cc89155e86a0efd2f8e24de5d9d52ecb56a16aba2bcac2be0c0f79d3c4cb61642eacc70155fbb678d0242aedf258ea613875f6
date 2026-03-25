// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { AccountSASPermissions } from "./AccountSASPermissions";
import { AccountSASResourceTypes } from "./AccountSASResourceTypes";
import { AccountSASServices } from "./AccountSASServices";
import { ipRangeToString } from "./SasIPRange";
import { SASQueryParameters } from "./SASQueryParameters";
import { SERVICE_VERSION } from "../utils/constants";
import { truncatedISO8061Date } from "../utils/utils.common";
/**
 * ONLY AVAILABLE IN NODE.JS RUNTIME.
 *
 * Generates a {@link SASQueryParameters} object which contains all SAS query parameters needed to make an actual
 * REST request.
 *
 * @see https://docs.microsoft.com/en-us/rest/api/storageservices/constructing-an-account-sas
 *
 * @param accountSASSignatureValues -
 * @param sharedKeyCredential -
 */
export function generateAccountSASQueryParameters(accountSASSignatureValues, sharedKeyCredential) {
    return generateAccountSASQueryParametersInternal(accountSASSignatureValues, sharedKeyCredential)
        .sasQueryParameters;
}
export function generateAccountSASQueryParametersInternal(accountSASSignatureValues, sharedKeyCredential) {
    const version = accountSASSignatureValues.version
        ? accountSASSignatureValues.version
        : SERVICE_VERSION;
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.setImmutabilityPolicy &&
        version < "2020-08-04") {
        throw RangeError("'version' must be >= '2020-08-04' when provided 'i' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.deleteVersion &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when provided 'x' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.permanentDelete &&
        version < "2019-10-10") {
        throw RangeError("'version' must be >= '2019-10-10' when provided 'y' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.tag &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when provided 't' permission.");
    }
    if (accountSASSignatureValues.permissions &&
        accountSASSignatureValues.permissions.filter &&
        version < "2019-12-12") {
        throw RangeError("'version' must be >= '2019-12-12' when provided 'f' permission.");
    }
    if (accountSASSignatureValues.encryptionScope && version < "2020-12-06") {
        throw RangeError("'version' must be >= '2020-12-06' when provided 'encryptionScope' in SAS.");
    }
    const parsedPermissions = AccountSASPermissions.parse(accountSASSignatureValues.permissions.toString());
    const parsedServices = AccountSASServices.parse(accountSASSignatureValues.services).toString();
    const parsedResourceTypes = AccountSASResourceTypes.parse(accountSASSignatureValues.resourceTypes).toString();
    let stringToSign;
    if (version >= "2020-12-06") {
        stringToSign = [
            sharedKeyCredential.accountName,
            parsedPermissions,
            parsedServices,
            parsedResourceTypes,
            accountSASSignatureValues.startsOn
                ? truncatedISO8061Date(accountSASSignatureValues.startsOn, false)
                : "",
            truncatedISO8061Date(accountSASSignatureValues.expiresOn, false),
            accountSASSignatureValues.ipRange ? ipRangeToString(accountSASSignatureValues.ipRange) : "",
            accountSASSignatureValues.protocol ? accountSASSignatureValues.protocol : "",
            version,
            accountSASSignatureValues.encryptionScope ? accountSASSignatureValues.encryptionScope : "",
            "", // Account SAS requires an additional newline character
        ].join("\n");
    }
    else {
        stringToSign = [
            sharedKeyCredential.accountName,
            parsedPermissions,
            parsedServices,
            parsedResourceTypes,
            accountSASSignatureValues.startsOn
                ? truncatedISO8061Date(accountSASSignatureValues.startsOn, false)
                : "",
            truncatedISO8061Date(accountSASSignatureValues.expiresOn, false),
            accountSASSignatureValues.ipRange ? ipRangeToString(accountSASSignatureValues.ipRange) : "",
            accountSASSignatureValues.protocol ? accountSASSignatureValues.protocol : "",
            version,
            "", // Account SAS requires an additional newline character
        ].join("\n");
    }
    const signature = sharedKeyCredential.computeHMACSHA256(stringToSign);
    return {
        sasQueryParameters: new SASQueryParameters(version, signature, parsedPermissions.toString(), parsedServices, parsedResourceTypes, accountSASSignatureValues.protocol, accountSASSignatureValues.startsOn, accountSASSignatureValues.expiresOn, accountSASSignatureValues.ipRange, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined, accountSASSignatureValues.encryptionScope),
        stringToSign: stringToSign,
    };
}
//# sourceMappingURL=AccountSASSignatureValues.js.map