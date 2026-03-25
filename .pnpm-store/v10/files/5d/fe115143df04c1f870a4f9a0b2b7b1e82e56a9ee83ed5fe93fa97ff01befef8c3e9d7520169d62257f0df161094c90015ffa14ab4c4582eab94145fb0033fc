/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
import { AuthenticationScheme, CredentialType } from '@azure/msal-common/node';
import { CACHE } from '../utils/Constants.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function generateCredentialKey(credential) {
    const familyId = (credential.credentialType === CredentialType.REFRESH_TOKEN &&
        credential.familyId) ||
        credential.clientId;
    const scheme = credential.tokenType &&
        credential.tokenType.toLowerCase() !==
            AuthenticationScheme.BEARER.toLowerCase()
        ? credential.tokenType.toLowerCase()
        : "";
    const credentialKey = [
        credential.homeAccountId,
        credential.environment,
        credential.credentialType,
        familyId,
        credential.realm || "",
        credential.target || "",
        credential.requestedClaimsHash || "",
        scheme,
    ];
    return credentialKey.join(CACHE.KEY_SEPARATOR).toLowerCase();
}
function generateAccountKey(account) {
    const homeTenantId = account.homeAccountId.split(".")[1];
    const accountKey = [
        account.homeAccountId,
        account.environment,
        homeTenantId || account.tenantId || "",
    ];
    return accountKey.join(CACHE.KEY_SEPARATOR).toLowerCase();
}

export { generateAccountKey, generateCredentialKey };
//# sourceMappingURL=CacheHelpers.mjs.map
