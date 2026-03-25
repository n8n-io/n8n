/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthenticationScheme } from "../utils/Constants.js";

/**
 * Deserialized response object from server authorization code request.
 * - token_type: Indicates the token type value. Can be either Bearer or pop.
 * - scope: The scopes that the access_token is valid for.
 * - expires_in: How long the access token is valid (in seconds).
 * - refresh_in: Duration afer which a token should be renewed, regardless of expiration.
 * - ext_expires_in: How long the access token is valid (in seconds) if the server isn't responding.
 * - access_token: The requested access token. The app can use this token to authenticate to the secured resource, such as a web API.
 * - refresh_token: An OAuth 2.0 refresh token. The app can use this token acquire additional access tokens after the current access token expires.
 * - id_token: A JSON Web Token (JWT). The app can decode the segments of this token to request information about the user who signed in.
 * - key_id: A string that uniquely identifies a public key that the request is bound to.
 *
 * In case of error:
 * - error: An error code string that can be used to classify types of errors that occur, and can be used to react to errors.
 * - error_description: A specific error message that can help a developer identify the root cause of an authentication error.
 * - error_codes: A list of STS-specific error codes that can help in diagnostics.
 * - timestamp: The time at which the error occurred.
 * - trace_id: A unique identifier for the request that can help in diagnostics.
 * - correlation_id: A unique identifier for the request that can help in diagnostics across components.
 * - status: the network request's response status
 */
export type ServerAuthorizationTokenResponse = {
    status?: number;
    // Success
    token_type?: AuthenticationScheme;
    scope?: string;
    expires_in?: number;
    refresh_in?: number;
    ext_expires_in?: number;
    access_token?: string;
    refresh_token?: string;
    refresh_token_expires_in?: number;
    id_token?: string;
    client_info?: string;
    foci?: string;
    spa_code?: string;
    spa_accountid?: string;
    key_id?: string;
    // Error
    error?: string;
    error_description?: string;
    error_codes?: Array<string>;
    suberror?: string;
    timestamp?: string;
    trace_id?: string;
    correlation_id?: string;
    claims?: string;
};
