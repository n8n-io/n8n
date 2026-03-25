// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Tests an object to determine whether it implements TokenCredential.
 *
 * @param credential - The assumed TokenCredential to be tested.
 */
export function isTokenCredential(credential) {
    // Check for an object with a 'getToken' function and possibly with
    // a 'signRequest' function.  We do this check to make sure that
    // a ServiceClientCredentials implementor (like TokenClientCredentials
    // in ms-rest-nodeauth) doesn't get mistaken for a TokenCredential if
    // it doesn't actually implement TokenCredential also.
    const castCredential = credential;
    return (castCredential &&
        typeof castCredential.getToken === "function" &&
        (castCredential.signRequest === undefined || castCredential.getToken.length > 0));
}
//# sourceMappingURL=tokenCredential.js.map