/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { DeviceCodeResponse } from "../response/DeviceCodeResponse.js";
import { StringDict } from "../utils/MsalTypes.js";
import { BaseAuthRequest } from "./BaseAuthRequest.js";

/**
 * Parameters for Oauth2 device code flow.
 * - scopes                     - Array of scopes the application is requesting access to.
 * - authority:                 - URL of the authority, the security token service (STS) from which MSAL will acquire tokens. If authority is set on client application object, this will override that value. Overriding the value will cause for authority validation to happen each time. If the same authority will be used for all request, set on the application object instead of the requests.
 * - correlationId              - Unique GUID set per request to trace a request end-to-end for telemetry purposes.
 * - deviceCodeCallback         - Callback containing device code response. Message should be shown to end user. End user can then navigate to the verification_uri, input the user_code, and input credentials.
 * - cancel                     - Boolean to cancel polling of device code endpoint. While the user authenticates on a separate device, MSAL polls the the token endpoint of security token service for the interval specified in the device code response (usually 15 minutes). To stop polling and cancel the request, set cancel=true.
 * - resourceRequestMethod      - HTTP Request type used to request data from the resource (i.e. "GET", "POST", etc.).  Used for proof-of-possession flows.
 * - resourceRequestUri         - URI that token will be used for. Used for proof-of-possession flows.
 * - timeout                    - Timeout period in seconds which the user explicitly configures for the polling of the device code endpoint. At the end of this period; assuming the device code has not expired yet; the device code polling is stopped and the request cancelled. The device code expiration window will always take precedence over this set period.
 * - extraQueryParameters       - String to string map of custom query parameters added to the query string
 */
// export type CommonDeviceCodeRequest = BaseAuthRequest &  {
export type CommonDeviceCodeRequest = Omit<
    BaseAuthRequest,
    "tokenQueryParameters" | "tokenBodyParameters"
> & {
    deviceCodeCallback: (response: DeviceCodeResponse) => void;
    cancel?: boolean;
    timeout?: number;
    extraQueryParameters?: StringDict;
};
