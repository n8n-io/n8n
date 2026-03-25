/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    ClientAssertionCallback,
    ClientAssertionConfig,
} from "../account/ClientCredentials.js";

export async function getClientAssertion(
    clientAssertion: string | ClientAssertionCallback,
    clientId: string,
    tokenEndpoint?: string
): Promise<string> {
    if (typeof clientAssertion === "string") {
        return clientAssertion;
    } else {
        const config: ClientAssertionConfig = {
            clientId: clientId,
            tokenEndpoint: tokenEndpoint,
        };
        return clientAssertion(config);
    }
}
