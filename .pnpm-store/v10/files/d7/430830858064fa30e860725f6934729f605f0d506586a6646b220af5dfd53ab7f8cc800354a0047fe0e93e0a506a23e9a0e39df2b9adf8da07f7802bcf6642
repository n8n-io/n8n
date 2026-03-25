/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    createClientAuthError,
    ClientAuthErrorCodes,
} from "../error/ClientAuthError.js";
import { Separators, Constants } from "../utils/Constants.js";

/**
 * Client info object which consists of:
 * uid: user id
 * utid: tenant id
 * xms_tdbr: optional, only for non-US tenants
 */
export type ClientInfo = {
    uid: string;
    utid: string;
    xms_tdbr?: string;
};

/**
 * Function to build a client info object from server clientInfo string
 * @param rawClientInfo
 * @param crypto
 */
export function buildClientInfo(
    rawClientInfo: string,
    base64Decode: (input: string) => string
): ClientInfo {
    if (!rawClientInfo) {
        throw createClientAuthError(ClientAuthErrorCodes.clientInfoEmptyError);
    }

    try {
        const decodedClientInfo: string = base64Decode(rawClientInfo);
        return JSON.parse(decodedClientInfo) as ClientInfo;
    } catch (e) {
        throw createClientAuthError(
            ClientAuthErrorCodes.clientInfoDecodingError
        );
    }
}

/**
 * Function to build a client info object from cached homeAccountId string
 * @param homeAccountId
 */
export function buildClientInfoFromHomeAccountId(
    homeAccountId: string
): ClientInfo {
    if (!homeAccountId) {
        throw createClientAuthError(
            ClientAuthErrorCodes.clientInfoDecodingError
        );
    }
    const clientInfoParts: string[] = homeAccountId.split(
        Separators.CLIENT_INFO_SEPARATOR,
        2
    );
    return {
        uid: clientInfoParts[0],
        utid:
            clientInfoParts.length < 2
                ? Constants.EMPTY_STRING
                : clientInfoParts[1],
    };
}
