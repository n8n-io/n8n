/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Returns true if tenantId matches the utid portion of homeAccountId
 * @param tenantId
 * @param homeAccountId
 * @returns
 */
function tenantIdMatchesHomeTenant(tenantId, homeAccountId) {
    return (!!tenantId &&
        !!homeAccountId &&
        tenantId === homeAccountId.split(".")[1]);
}
/**
 * Build tenant profile
 * @param homeAccountId - Home account identifier for this account object
 * @param localAccountId - Local account identifer for this account object
 * @param tenantId - Full tenant or organizational id that this account belongs to
 * @param idTokenClaims - Claims from the ID token
 * @returns
 */
function buildTenantProfile(homeAccountId, localAccountId, tenantId, idTokenClaims) {
    if (idTokenClaims) {
        const { oid, sub, tid, name, tfp, acr, preferred_username, upn, login_hint, } = idTokenClaims;
        /**
         * Since there is no way to determine if the authority is AAD or B2C, we exhaust all the possible claims that can serve as tenant ID with the following precedence:
         * tid - TenantID claim that identifies the tenant that issued the token in AAD. Expected in all AAD ID tokens, not present in B2C ID Tokens.
         * tfp - Trust Framework Policy claim that identifies the policy that was used to authenticate the user. Functions as tenant for B2C scenarios.
         * acr - Authentication Context Class Reference claim used only with older B2C policies. Fallback in case tfp is not present, but likely won't be present anyway.
         */
        const tenantId = tid || tfp || acr || "";
        return {
            tenantId: tenantId,
            localAccountId: oid || sub || "",
            name: name,
            username: preferred_username || upn || "",
            loginHint: login_hint,
            isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
        };
    }
    else {
        return {
            tenantId,
            localAccountId,
            username: "",
            isHomeTenant: tenantIdMatchesHomeTenant(tenantId, homeAccountId),
        };
    }
}
/**
 * Replaces account info that varies by tenant profile sourced from the ID token claims passed in with the tenant-specific account info
 * @param baseAccountInfo
 * @param idTokenClaims
 * @returns
 */
function updateAccountTenantProfileData(baseAccountInfo, tenantProfile, idTokenClaims, idTokenSecret) {
    let updatedAccountInfo = baseAccountInfo;
    // Tenant Profile overrides passed in account info
    if (tenantProfile) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isHomeTenant, ...tenantProfileOverride } = tenantProfile;
        updatedAccountInfo = { ...baseAccountInfo, ...tenantProfileOverride };
    }
    // ID token claims override passed in account info and tenant profile
    if (idTokenClaims) {
        // Ignore isHomeTenant, loginHint, and sid which are part of tenant profile but not base account info
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { isHomeTenant, ...claimsSourcedTenantProfile } = buildTenantProfile(baseAccountInfo.homeAccountId, baseAccountInfo.localAccountId, baseAccountInfo.tenantId, idTokenClaims);
        updatedAccountInfo = {
            ...updatedAccountInfo,
            ...claimsSourcedTenantProfile,
            idTokenClaims: idTokenClaims,
            idToken: idTokenSecret,
        };
        return updatedAccountInfo;
    }
    return updatedAccountInfo;
}

export { buildTenantProfile, tenantIdMatchesHomeTenant, updateAccountTenantProfileData };
//# sourceMappingURL=AccountInfo.mjs.map
