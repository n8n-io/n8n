/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { Constants } from "./Constants.js";
import { ICrypto } from "../crypto/ICrypto.js";
import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";

/**
 * Type which defines the object that is stringified, encoded and sent in the state value.
 * Contains the following:
 * - id - unique identifier for this request
 * - ts - timestamp for the time the request was made. Used to ensure that token expiration is not calculated incorrectly.
 * - platformState - string value sent from the platform.
 */
export type LibraryStateObject = {
    id: string;
    meta?: Record<string, string>;
};

/**
 * Type which defines the stringified and encoded object sent to the service in the authorize request.
 */
export type RequestStateObject = {
    userRequestState: string;
    libraryState: LibraryStateObject;
};

/**
 * Class which provides helpers for OAuth 2.0 protocol specific values
 */
export class ProtocolUtils {
    /**
     * Appends user state with random guid, or returns random guid.
     * @param userState
     * @param randomGuid
     */
    static setRequestState(
        cryptoObj: ICrypto,
        userState?: string,
        meta?: Record<string, string>
    ): string {
        const libraryState = ProtocolUtils.generateLibraryState(
            cryptoObj,
            meta
        );
        return userState
            ? `${libraryState}${Constants.RESOURCE_DELIM}${userState}`
            : libraryState;
    }

    /**
     * Generates the state value used by the common library.
     * @param randomGuid
     * @param cryptoObj
     */
    static generateLibraryState(
        cryptoObj: ICrypto,
        meta?: Record<string, string>
    ): string {
        if (!cryptoObj) {
            throw createClientAuthError(ClientAuthErrorCodes.noCryptoObject);
        }

        // Create a state object containing a unique id and the timestamp of the request creation
        const stateObj: LibraryStateObject = {
            id: cryptoObj.createNewGuid(),
        };

        if (meta) {
            stateObj.meta = meta;
        }

        const stateString = JSON.stringify(stateObj);

        return cryptoObj.base64Encode(stateString);
    }

    /**
     * Parses the state into the RequestStateObject, which contains the LibraryState info and the state passed by the user.
     * @param state
     * @param cryptoObj
     */
    static parseRequestState(
        cryptoObj: ICrypto,
        state: string
    ): RequestStateObject {
        if (!cryptoObj) {
            throw createClientAuthError(ClientAuthErrorCodes.noCryptoObject);
        }

        if (!state) {
            throw createClientAuthError(ClientAuthErrorCodes.invalidState);
        }

        try {
            // Split the state between library state and user passed state and decode them separately
            const splitState = state.split(Constants.RESOURCE_DELIM);
            const libraryState = splitState[0];
            const userState =
                splitState.length > 1
                    ? splitState.slice(1).join(Constants.RESOURCE_DELIM)
                    : Constants.EMPTY_STRING;
            const libraryStateString = cryptoObj.base64Decode(libraryState);
            const libraryStateObj = JSON.parse(
                libraryStateString
            ) as LibraryStateObject;
            return {
                userRequestState: userState || Constants.EMPTY_STRING,
                libraryState: libraryStateObj,
            };
        } catch (e) {
            throw createClientAuthError(ClientAuthErrorCodes.invalidState);
        }
    }
}
