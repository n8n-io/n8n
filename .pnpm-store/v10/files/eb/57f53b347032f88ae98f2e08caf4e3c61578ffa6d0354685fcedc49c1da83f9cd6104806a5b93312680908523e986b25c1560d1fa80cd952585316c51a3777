/*! @azure/msal-common v15.13.3 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
async function getClientAssertion(clientAssertion, clientId, tokenEndpoint) {
    if (typeof clientAssertion === "string") {
        return clientAssertion;
    }
    else {
        const config = {
            clientId: clientId,
            tokenEndpoint: tokenEndpoint,
        };
        return clientAssertion(config);
    }
}

export { getClientAssertion };
//# sourceMappingURL=ClientAssertionUtils.mjs.map
